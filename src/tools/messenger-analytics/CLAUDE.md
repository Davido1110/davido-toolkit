# Messenger Analytics — Tool CLAUDE.md

## Purpose
Analyze Facebook Messenger conversations exported from Pancake.vn API.
Runs a 3-stage Claude AI pipeline to generate 4 business reports.

## Input Files
- `messages.csv` — columns: conversation_id, message_id, sender_type, sender_name, message (HTML), created_at, attachments
- `conversations.csv` (optional) — columns: conversation_id, customer_name, tags, ...

HTML stripping is done client-side in `lib/parser.ts`.

## Analysis Pipeline
1. **Stage 1** — Haiku summarizes each conversation individually (concurrency 5)
2. **Stage 2** — Sonnet aggregates all summaries into business themes
3. **Stage 3** — Opus generates 4 reports in parallel

## Reports Generated
- `marketing` — Customer language, purchase triggers, content gaps, competitive intel, conversion blockers
- `cskh` — Winning scripts, objection handling, lost deal patterns, training gaps, FAQ table
- `rd` — Quality issues, feature requests, size feedback, new product ideas, supplier signals
- `exec` — Executive summary, business health, cross-team insights, top 5 priority actions

## Key Files
| File | Purpose |
|------|---------|
| `index.tsx` | Main UI component (5 tabs) |
| `lib/parser.ts` | CSV parsing + HTML stripping |
| `lib/prompts.ts` | All Claude prompts (stage1–3 + chat) |
| `lib/apiClient.ts` | Anthropic API calls + concurrency runner |

## API Calls
Direct browser → Anthropic API using `fetch` with header `anthropic-dangerous-direct-browser-access: true`.
API key stored in `localStorage` under key `messenger_analytics_api_key`.

## Source Repo
Original Python CLI: https://github.com/phuvandang/export-messages-tools
