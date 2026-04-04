import type { Conversation } from './parser';
import { formatConversation } from './parser';
import {
  stage1Prompt,
  stage2Prompt,
  stage3MarketingPrompt,
  stage3CskhPrompt,
  stage3RdPrompt,
  stage3ExecPrompt,
  chatPrompt,
} from './prompts';

export interface ConvSummary {
  conversationId: string;
  customerName: string;
  outcome: 'order' | 'no_buy' | 'complaint' | 'inquiry';
  products: string[];
  customerLanguage: string[];
  keyInsight: string;
  objections: string[];
}

export interface AnalysisResult {
  summaries: ConvSummary[];
  themes: string;
  reports: {
    marketing: string;
    cskh: string;
    rd: string;
    exec: string;
  };
}

export type ProgressCallback = (stage: string, current: number, total: number) => void;

async function callClaude(
  apiKey: string,
  model: string,
  userContent: string,
  systemPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        console.warn(`Item ${i} failed:`, e);
        results[i] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function runAnalysis(
  apiKey: string,
  conversations: Conversation[],
  onProgress: ProgressCallback
): Promise<AnalysisResult> {
  const HAIKU = 'claude-haiku-4-5-20251001';
  const SONNET = 'claude-sonnet-4-6';
  const OPUS = 'claude-opus-4-6';

  // ── Stage 1: Summarize each conversation ──────────────────────────────────
  onProgress('Stage 1: Tóm tắt hội thoại', 0, conversations.length);

  const rawSummaries = await runWithConcurrency(
    conversations,
    5,
    async (conv, i) => {
      onProgress('Stage 1: Tóm tắt hội thoại', i + 1, conversations.length);
      const text = formatConversation(conv);
      const response = await callClaude(
        apiKey,
        HAIKU,
        stage1Prompt(text),
        'Bạn là chuyên gia phân tích hội thoại khách hàng. Trả về JSON thuần túy.',
        512
      );

      try {
        const json = JSON.parse(response.trim());
        return {
          conversationId: conv.id,
          customerName: conv.customerName,
          ...json,
        } as ConvSummary;
      } catch {
        return {
          conversationId: conv.id,
          customerName: conv.customerName,
          outcome: 'inquiry' as const,
          products: [],
          customerLanguage: [],
          keyInsight: response.slice(0, 200),
          objections: [],
        } as ConvSummary;
      }
    }
  );

  const summaries = rawSummaries.filter((s): s is ConvSummary => s !== null);

  // ── Stage 2: Aggregate themes ──────────────────────────────────────────────
  onProgress('Stage 2: Tổng hợp chủ đề', 0, 1);

  const summaryChunks: string[][] = [];
  for (let i = 0; i < summaries.length; i += 100) {
    summaryChunks.push(summaries.slice(i, i + 100).map((s) => JSON.stringify(s)));
  }

  let themes = '';
  for (const chunk of summaryChunks) {
    const chunkJson = `[${chunk.join(',')}]`;
    const result = await callClaude(
      apiKey,
      SONNET,
      stage2Prompt(chunkJson),
      'Bạn là chuyên gia phân tích kinh doanh.',
      4096
    );
    themes += result + '\n\n';
  }

  onProgress('Stage 2: Tổng hợp chủ đề', 1, 1);

  // ── Stage 3: Generate 4 reports in parallel ────────────────────────────────
  onProgress('Stage 3: Tạo báo cáo', 0, 4);

  const reportSystem = 'Bạn là chuyên gia tư vấn kinh doanh cao cấp. Viết báo cáo chuyên nghiệp bằng Markdown.';

  const [marketing, cskh, rd, exec] = await Promise.all([
    callClaude(apiKey, OPUS, stage3MarketingPrompt(themes), reportSystem, 8192).then((r) => {
      onProgress('Stage 3: Tạo báo cáo', 1, 4);
      return r;
    }),
    callClaude(apiKey, OPUS, stage3CskhPrompt(themes), reportSystem, 8192).then((r) => {
      onProgress('Stage 3: Tạo báo cáo', 2, 4);
      return r;
    }),
    callClaude(apiKey, OPUS, stage3RdPrompt(themes), reportSystem, 8192).then((r) => {
      onProgress('Stage 3: Tạo báo cáo', 3, 4);
      return r;
    }),
    callClaude(apiKey, OPUS, stage3ExecPrompt(themes), reportSystem, 8192).then((r) => {
      onProgress('Stage 3: Tạo báo cáo', 4, 4);
      return r;
    }),
  ]);

  return { summaries, themes, reports: { marketing, cskh, rd, exec } };
}

export async function sendChatMessage(
  apiKey: string,
  question: string,
  summaries: ConvSummary[]
): Promise<string> {
  // Pick most relevant summaries (up to 200) — simple keyword matching
  const lower = question.toLowerCase();
  const scored = summaries.map((s, i) => {
    const text = `${s.customerName} ${s.products.join(' ')} ${s.keyInsight} ${s.customerLanguage.join(' ')}`.toLowerCase();
    let score = 0;
    lower.split(/\s+/).forEach((word) => {
      if (word.length > 2 && text.includes(word)) score++;
    });
    return { s, i, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 200)
    .map(({ s, i }) => `[${i + 1}] ${JSON.stringify(s)}`);

  const relevantText = top.join('\n');

  return callClaude(
    apiKey,
    'claude-sonnet-4-6',
    chatPrompt(question, relevantText),
    'Bạn là chuyên gia phân tích dữ liệu khách hàng.',
    2048
  );
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await callClaude(
      apiKey,
      'claude-haiku-4-5-20251001',
      'Say "OK" in one word.',
      'You are a helpful assistant.',
      10
    );
    return true;
  } catch {
    return false;
  }
}
