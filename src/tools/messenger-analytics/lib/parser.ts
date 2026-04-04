export interface ParsedMessage {
  conversationId: string;
  senderType: 'page' | 'customer';
  senderName: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  tags: string;
  messages: ParsedMessage[];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Minimal CSV parser: handles quoted fields with embedded commas/newlines
function parseCsvText(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === '\n' && !inQuote) {
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let field = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      result.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  result.push(field);
  return result;
}

export function parseMessagesCSV(
  messagesText: string,
  conversationsText?: string
): Conversation[] {
  const msgRows = parseCsvText(messagesText);

  // Build meta map from conversations.csv if provided
  const metaMap: Record<string, { customerName: string; tags: string }> = {};
  if (conversationsText) {
    const convRows = parseCsvText(conversationsText);
    convRows.forEach((row) => {
      const id = row['conversation_id'] || row['id'] || '';
      if (id) {
        metaMap[id] = {
          customerName: row['customer_name'] || row['customerName'] || 'Unknown',
          tags: row['tags'] || '',
        };
      }
    });
  }

  const convMap: Record<string, Conversation> = {};

  msgRows.forEach((row) => {
    const convId = row['conversation_id'] || row['conversationId'] || '';
    if (!convId) return;

    if (!convMap[convId]) {
      const meta = metaMap[convId];
      convMap[convId] = {
        id: convId,
        customerName: meta?.customerName || row['sender_name'] || 'Unknown',
        tags: meta?.tags || '',
        messages: [],
      };
    }

    const rawMessage = row['message'] || row['content'] || '';
    const text = stripHtml(rawMessage);
    if (!text) return;

    convMap[convId].messages.push({
      conversationId: convId,
      senderType: (row['sender_type'] || 'customer') as 'page' | 'customer',
      senderName: row['sender_name'] || 'Unknown',
      text,
      createdAt: row['created_at'] || row['createdAt'] || '',
    });
  });

  return Object.values(convMap).filter((c) => c.messages.length > 0);
}

export function formatConversation(conv: Conversation): string {
  const lines: string[] = [
    `[Hội thoại ${conv.id}]`,
    `Khách: ${conv.customerName}`,
    conv.tags ? `Tags: ${conv.tags}` : '',
    `Số tin nhắn: ${conv.messages.length}`,
    '----',
  ].filter(Boolean);

  conv.messages.forEach((msg) => {
    const sender = msg.senderType === 'page' ? 'NHÂN VIÊN' : msg.senderName;
    const time = msg.createdAt ? `[${msg.createdAt}] ` : '';
    lines.push(`${time}${sender}: ${msg.text}`);
  });

  return lines.join('\n');
}
