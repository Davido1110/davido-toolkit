import { useState, useRef, useCallback, useEffect } from 'react';
import { parseMessagesCSV, type Conversation } from './lib/parser';
import { runAnalysis, sendChatMessage, testApiKey, type AnalysisResult } from './lib/apiClient';

// ── Simple Markdown renderer ───────────────────────────────────────────────
function renderMarkdown(md: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  const html: string[] = [];
  let inTable = false;
  let inList = false;

  const closeList = () => {
    if (inList) { html.push('</ul>'); inList = false; }
  };
  const closeTable = () => {
    if (inTable) { html.push('</tbody></table>'); inTable = false; }
  };

  lines.forEach((raw) => {
    const line = raw.trimEnd();

    // Headings
    if (/^### /.test(line)) { closeList(); closeTable(); html.push(`<h3 class="text-base font-semibold mt-4 mb-1 text-gray-800 dark:text-gray-100">${inlineFormat(line.slice(4))}</h3>`); return; }
    if (/^## /.test(line))  { closeList(); closeTable(); html.push(`<h2 class="text-lg font-bold mt-5 mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">${inlineFormat(line.slice(3))}</h2>`); return; }
    if (/^# /.test(line))   { closeList(); closeTable(); html.push(`<h1 class="text-xl font-extrabold mt-6 mb-3 text-gray-900 dark:text-white">${inlineFormat(line.slice(2))}</h1>`); return; }

    // Table row
    if (/^\|/.test(line)) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      closeList();
      if (!inTable) {
        html.push('<table class="w-full text-sm border-collapse my-3 overflow-x-auto block"><thead><tr class="bg-gray-100 dark:bg-gray-700">');
        cells.forEach(c => html.push(`<th class="border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-left font-semibold">${inlineFormat(c)}</th>`));
        html.push('</tr></thead><tbody>');
        inTable = true;
        return;
      }
      // separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        return;
      }
      html.push('<tr class="border-b border-gray-200 dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50">');
      cells.forEach(c => html.push(`<td class="border border-gray-300 dark:border-gray-600 px-3 py-1.5">${inlineFormat(c)}</td>`));
      html.push('</tr>');
      return;
    }

    closeTable();

    // List item
    if (/^[-*] /.test(line)) {
      if (!inList) { html.push('<ul class="list-disc pl-5 my-1 space-y-0.5">'); inList = true; }
      html.push(`<li class="text-sm leading-relaxed">${inlineFormat(line.slice(2))}</li>`);
      return;
    }

    closeList();

    // Empty line
    if (!line.trim()) { html.push('<br>'); return; }

    // Normal paragraph
    html.push(`<p class="text-sm leading-relaxed mb-1">${inlineFormat(line)}</p>`);
  });

  closeList();
  closeTable();
  return html.join('');
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs font-mono">$1</code>');
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DropZone({ label, accept, onFile, fileName }: {
  label: string;
  accept: string;
  onFile: (text: string, name: string) => void;
  fileName?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => onFile(e.target?.result as string, file.name);
    reader.readAsText(file, 'utf-8');
  }, [onFile]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}
        ${fileName ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <div className="text-2xl mb-1">{fileName ? '✅' : '📂'}</div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</div>
      {fileName
        ? <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">{fileName}</div>
        : <div className="text-xs text-gray-400 mt-1">Kéo thả hoặc click để chọn file</div>
      }
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

type Tab = 'setup' | 'upload' | 'analyze' | 'reports' | 'chat';
type ReportTab = 'marketing' | 'cskh' | 'rd' | 'exec';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'marketing', label: 'Marketing' },
  { id: 'cskh', label: 'CSKH / Sales' },
  { id: 'rd', label: 'R&D / Sản phẩm' },
  { id: 'exec', label: 'Tổng Hợp' },
];

export default function MessengerAnalytics() {
  const [tab, setTab] = useState<Tab>('setup');
  const [reportTab, setReportTab] = useState<ReportTab>('marketing');

  // Setup
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('messenger_analytics_api_key') || '');
  const [keyTesting, setKeyTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  // Upload
  const [msgCsvText, setMsgCsvText] = useState('');
  const [convCsvText, setConvCsvText] = useState('');
  const [msgFileName, setMsgFileName] = useState('');
  const [convFileName, setConvFileName] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Parse CSV whenever files change
  useEffect(() => {
    if (!msgCsvText) { setConversations([]); return; }
    try {
      const parsed = parseMessagesCSV(msgCsvText, convCsvText || undefined);
      setConversations(parsed);
    } catch (e) {
      console.error('Parse error', e);
    }
  }, [msgCsvText, convCsvText]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveApiKey = () => {
    localStorage.setItem('messenger_analytics_api_key', apiKey);
  };

  const handleTestKey = async () => {
    setKeyTesting(true);
    setKeyStatus('idle');
    const ok = await testApiKey(apiKey);
    setKeyStatus(ok ? 'ok' : 'fail');
    if (ok) saveApiKey();
    setKeyTesting(false);
  };

  const handleAnalyze = async () => {
    if (!apiKey || !conversations.length) return;
    saveApiKey();
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const analysis = await runAnalysis(apiKey, conversations, (stage, current, total) => {
        setProgressLabel(stage);
        setProgressCurrent(current);
        setProgressTotal(total);
      });
      setResult(analysis);
      setTab('reports');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !result?.summaries.length) return;
    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);
    try {
      const answer = await sendChatMessage(apiKey, question, result.summaries);
      setChatMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (e: unknown) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Lỗi: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const downloadReport = (id: ReportTab) => {
    if (!result) return;
    const content = result.reports[id];
    const labels: Record<ReportTab, string> = { marketing: 'marketing', cskh: 'cskh-sales', rd: 'rd-product', exec: 'tong-hop' };
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${labels[id]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'setup', label: 'Cài đặt', icon: '🔑' },
    { id: 'upload', label: 'Tải lên', icon: '📂' },
    { id: 'analyze', label: 'Phân tích', icon: '🔍' },
    { id: 'reports', label: 'Báo cáo', icon: '📊' },
    { id: 'chat', label: 'Chat', icon: '💬' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💬</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messenger Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Phân tích hội thoại Messenger — Báo cáo Marketing, CSKH, R&D, Tổng hợp
            </p>
          </div>
          {result && (
            <span className="ml-auto text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
              {result.summaries.length} hội thoại đã phân tích
            </span>
          )}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mt-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                ${tab === t.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── Setup ─────────────────────────────────────────────── */}
        {tab === 'setup' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Anthropic API Key</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Nhập API key của bạn từ{' '}
                <span className="text-blue-500">console.anthropic.com</span>.
                Key được lưu cục bộ trên trình duyệt (localStorage).
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleTestKey}
                  disabled={!apiKey || keyTesting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  {keyTesting ? 'Testing...' : 'Test'}
                </button>
              </div>
              {keyStatus === 'ok' && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">✅ API key hợp lệ — đã lưu</p>
              )}
              {keyStatus === 'fail' && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">❌ API key không hợp lệ hoặc không có quyền</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Model theo từng giai đoạn</h2>
              <div className="space-y-2 text-sm">
                {[
                  { stage: 'Stage 1 — Tóm tắt hội thoại', model: 'claude-haiku-4-5', note: 'nhanh, rẻ' },
                  { stage: 'Stage 2 — Tổng hợp chủ đề', model: 'claude-sonnet-4-6', note: 'cân bằng' },
                  { stage: 'Stage 3 — Tạo báo cáo (×4)', model: 'claude-opus-4-6', note: 'chất lượng cao nhất' },
                  { stage: 'Chat hỏi đáp', model: 'claude-sonnet-4-6', note: 'nhanh & thông minh' },
                ].map(r => (
                  <div key={r.stage} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-gray-600 dark:text-gray-300">{r.stage}</span>
                    <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300">{r.model}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Upload ────────────────────────────────────────────── */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Tải file CSV từ Pancake.vn</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Export dữ liệu từ script Pancake API rồi upload tại đây.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">messages.csv <span className="text-red-500">*</span></div>
                  <DropZone
                    label="messages.csv"
                    accept=".csv,text/csv"
                    fileName={msgFileName}
                    onFile={(text, name) => { setMsgCsvText(text); setMsgFileName(name); }}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">conversations.csv <span className="text-gray-400">(tuỳ chọn)</span></div>
                  <DropZone
                    label="conversations.csv"
                    accept=".csv,text/csv"
                    fileName={convFileName}
                    onFile={(text, name) => { setConvCsvText(text); setConvFileName(name); }}
                  />
                </div>
              </div>

              {conversations.length > 0 && (
                <div className="mt-5 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✅ {conversations.length} hội thoại đã được tải ({conversations.reduce((s, c) => s + c.messages.length, 0)} tin nhắn)
                  </p>
                </div>
              )}
            </div>

            {conversations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Xem trước (3 hội thoại đầu)</h3>
                <div className="space-y-3">
                  {conversations.slice(0, 3).map(conv => (
                    <div key={conv.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{conv.customerName}</span>
                        <span className="text-xs text-gray-400">{conv.messages.length} tin nhắn</span>
                      </div>
                      {conv.tags && <div className="text-xs text-gray-400 mb-1">Tags: {conv.tags}</div>}
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {conv.messages[0]?.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Analyze ───────────────────────────────────────────── */}
        {tab === 'analyze' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Chạy phân tích</h2>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-600 dark:text-gray-300">API Key</span>
                  {apiKey ? <span className="text-green-600 dark:text-green-400">✅ Đã cài đặt</span> : <span className="text-red-500">❌ Chưa cài</span>}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-600 dark:text-gray-300">Hội thoại</span>
                  <span className={conversations.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                    {conversations.length > 0 ? `✅ ${conversations.length} hội thoại` : '❌ Chưa tải file'}
                  </span>
                </div>
              </div>

              {!analyzing && (
                <button
                  onClick={handleAnalyze}
                  disabled={!apiKey || !conversations.length}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  Bắt đầu phân tích
                </button>
              )}

              {analyzing && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{progressLabel}</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-right">
                    {progressCurrent}/{progressTotal} ({progressPct}%)
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  ❌ {error}
                </div>
              )}

              {result && !analyzing && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                  ✅ Phân tích hoàn tất! Chuyển sang tab <strong>Báo cáo</strong> để xem kết quả.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Reports ───────────────────────────────────────────── */}
        {tab === 'reports' && (
          <div className="max-w-4xl mx-auto">
            {!result ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📊</div>
                <p>Chưa có báo cáo. Hãy chạy phân tích trước.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Report sub-tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 pt-3 gap-1 overflow-x-auto">
                  {REPORT_TABS.map(rt => (
                    <button
                      key={rt.id}
                      onClick={() => setReportTab(rt.id)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t border-b-2 transition-colors
                        ${reportTab === rt.id
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2 pb-1">
                    <button
                      onClick={() => navigator.clipboard.writeText(result.reports[reportTab])}
                      className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => downloadReport(reportTab)}
                      className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Download .md
                    </button>
                  </div>
                </div>

                {/* Report content */}
                <div className="p-6 prose dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.reports[reportTab]) }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Chat ──────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-220px)]">
            {!result?.summaries.length ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <p>Hãy chạy phân tích trước để chat với dữ liệu.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      Hỏi bất cứ điều gì về {result.summaries.length} hội thoại khách hàng...
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                          ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                          }`}
                      >
                        {msg.role === 'assistant'
                          ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                          : msg.text
                        }
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    placeholder="Hỏi về hội thoại khách hàng..."
                    disabled={chatLoading}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    ↑
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
