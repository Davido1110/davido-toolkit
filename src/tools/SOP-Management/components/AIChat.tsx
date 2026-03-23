import { useEffect, useRef, useState } from 'react';
import { getPublishedSOPs } from '../lib/firestore';
import { chatWithSOPs } from '../lib/qwen';
import type { ChatMessage, SOP } from '../types';

export default function AIChat() {
  const [sops, setSops] = useState<SOP[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý AI của Leonardo. Tôi có thể trả lời câu hỏi về các quy trình (SOP) nội bộ. Bạn cần hỗ trợ gì?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sopLoaded, setSopLoaded] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPublishedSOPs().then(data => {
      setSops(data);
      setSopLoaded(true);
    });
    if (!import.meta.env.VITE_QWEN_API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatWithSOPs(text, sops, messages);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Lỗi: ${e instanceof Error ? e.message : 'Không thể kết nối AI. Vui lòng kiểm tra API key.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Quy trình xử lý khiếu nại khách hàng là gì?',
    'Ai duyệt KOL budget trên 10 triệu?',
    'Quy trình ra mắt sản phẩm mới gồm những bước nào?',
    'Báo cáo tuần phải nộp khi nào?',
  ];

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Hỏi đáp SOP</h2>

      {apiKeyMissing && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Thiếu API key:</strong> Thêm <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">VITE_QWEN_API_KEY</code> vào file <code>.env.local</code> để dùng tính năng AI.
        </div>
      )}

      {!sopLoaded && (
        <div className="text-xs text-gray-400 mb-2">Đang tải dữ liệu SOP...</div>
      )}
      {sopLoaded && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          AI đã nạp {sops.length} SOP để trả lời câu hỏi.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
              }`}
            >
              {msg.content}
              <div className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Hỏi về quy trình nội bộ..."
          disabled={loading}
          className="flex-1 px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
