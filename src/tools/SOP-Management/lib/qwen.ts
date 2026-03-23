import type { SOP, SOPStep, ChatMessage } from '../types';

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = 'qwen-plus';

function getApiKey(): string {
  const key = import.meta.env.VITE_QWEN_API_KEY;
  if (!key) throw new Error('VITE_QWEN_API_KEY is not set.');
  return key;
}

async function callQwen(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(QWEN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ model: QWEN_MODEL, messages }),
  });
  if (!res.ok) throw new Error(`Qwen API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Generate SOP from text description ──────────────────────────────────────

export async function generateSOPFromDescription(description: string): Promise<{
  title: string;
  category: string;
  steps: Omit<SOPStep, 'id'>[];
}> {
  const prompt = `Bạn là chuyên gia quy trình nội bộ doanh nghiệp marketing/retail Việt Nam.
Người dùng mô tả một quy trình, hãy sinh ra một SOP (Standard Operating Procedure) hoàn chỉnh dưới dạng JSON.

Mô tả: "${description}"

Trả về JSON với cấu trúc sau (không có markdown, chỉ JSON thuần):
{
  "title": "tên SOP",
  "category": "Marketing|Sales|Operations|Finance|HR|Product|Content|KOL/KOC|Ecom|Customer Service",
  "steps": [
    {
      "order": 1,
      "title": "Tên bước",
      "description": "Mô tả chi tiết bước này làm gì và tại sao",
      "assigneeRole": "cmo|lead|staff|all",
      "sla": "VD: 2 giờ, 1 ngày, cuối ngày thứ 6",
      "type": "sequential|parallel|decision",
      "exampleOutput": "Kết quả/output cần đạt sau bước này (tùy chọn)",
      "notes": "Lưu ý thêm (tùy chọn)"
    }
  ]
}`;

  const raw = await callQwen([{ role: 'user', content: prompt }]);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title ?? 'SOP mới',
      category: parsed.category ?? 'Operations',
      steps: (parsed.steps ?? []).map((s: Omit<SOPStep, 'id'> & { id?: string }, i: number) => ({
        order: s.order ?? i + 1,
        title: s.title ?? `Bước ${i + 1}`,
        description: s.description ?? '',
        assigneeRole: s.assigneeRole ?? 'staff',
        sla: s.sla ?? '',
        type: s.type ?? 'sequential',
        exampleOutput: s.exampleOutput ?? '',
        notes: s.notes ?? '',
      })),
    };
  } catch {
    throw new Error('Không thể parse kết quả từ AI. Vui lòng thử lại.');
  }
}

// ─── RAG Chatbot ──────────────────────────────────────────────────────────────

export async function chatWithSOPs(
  userMessage: string,
  sops: SOP[],
  history: ChatMessage[]
): Promise<string> {
  // Build RAG context from SOPs
  const sopContext = sops
    .filter(s => s.status === 'published')
    .map(sop => {
      const stepsText = sop.steps
        .map(step => `  Bước ${step.order}: ${step.title} (${step.assigneeRole}) — ${step.description}`)
        .join('\n');
      return `SOP: ${sop.title} [${sop.category}]\nMô tả: ${sop.description}\nCác bước:\n${stepsText}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = `Bạn là trợ lý AI hiểu biết về các quy trình nội bộ (SOP) của công ty Leonardo — một công ty marketing/retail Việt Nam.

Dưới đây là toàn bộ SOP hiện có của công ty:
${sopContext}

Hãy trả lời câu hỏi của nhân viên dựa trên các SOP trên.
- Trả lời bằng tiếng Việt, ngắn gọn và thực tế.
- Nếu câu hỏi liên quan đến một SOP cụ thể, hãy trích dẫn tên SOP và số bước.
- Nếu không tìm thấy thông tin trong SOP, hãy nói rõ và đề nghị hỏi CMO/Lead.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  return callQwen(messages);
}
