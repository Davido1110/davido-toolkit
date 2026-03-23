# SOP Management Tool — CLAUDE.md

## What This Is
A tool inside the Davido Toolkit hub for managing Standard Operating Procedures (SOPs) at Leonardo. Covers SOP creation, staff onboarding/learning, reporting, and AI-assisted Q&A — all scoped to a Vietnamese marketing/retail company context.

## Roles & Permissions
Three roles, enforced via Firebase Auth:
| Role | Vietnamese | Access |
|------|-----------|--------|
| `cmo` | CMO | Full access: create/edit/publish SOPs, assign learning paths, view all dashboards, approve onboarding |
| `lead` | Team Lead | View SOPs, submit reports, approve onboarding for their team |
| `staff` | Nhân viên | View assigned SOPs, complete learning paths, ask AI, submit evidence |

New hires are a sub-state of `staff`, not a separate role.

## Modules

### 1. SOP Builder (Core)
- Drag-and-drop step builder: sequential steps, parallel branches, convergence points, conditional branching
- Each step has: title, assignee role, SLA/deadline, description, example outputs
- Template library (marketing retail, ecom, D2C presets)
- Version history with rollback — every save creates a version snapshot
- AI generation: CMO describes process in text → Qwen API returns structured JSON → rendered as flowchart
- CMO can send email notification to relevant staff when SOP is updated

### 2. Onboarding Mode (Core)
- Role-based SOP map: staff selects their role → system shows all relevant SOPs with priority order (learning path)
- Guided walkthrough: step-by-step reading mode with context, rationale, and good/bad output examples
- Quiz at end of each SOP
- Progress tracker: CMO and Lead can see per-staff progress (SOPs completed, quiz scores, overall readiness)
- Completion requires approval from both Team Lead AND CMO before staff can execute real tasks
- CMO can assign specific SOPs to any staff member (not just new hires)

### 3. Reporting & Analytics (Core)
- Report template builder: CMO/Lead creates weekly/monthly report templates per team
- Metrics auto-filled from system data; Lead only fills in analysis & recommendations
- Auto-scheduled reminders: Friday reminder → Lead reviews & submits → CMO receives summary Monday morning
- Scheduling via Cloud Functions + FCM

### 4. AI Assistant Layer (AI)
- **SOP Chatbot (RAG)**: any staff asks natural language questions → Qwen API retrieves relevant SOP content from Firestore → answers with citation + link to exact step
- **Smart SOP Suggest**: while CMO builds a new SOP, AI suggests missing steps or better templates based on best practices
- All AI features use **Qwen API** (not Claude)

## Firestore Data Structure
```
/sops/{sopId}
  - title, description, category, status (draft|published), roles[], createdBy, updatedAt
  /steps[]         — ordered array of step objects
  /versions[]      — subcollection, one doc per save

/users/{userId}
  - role (cmo|lead|staff), name, email, teamId

/learning/{userId}/progress/{sopId}
  - status (not_started|in_progress|completed), quizScore, approvedByLead, approvedByCMO

/reports/{reportId}
  - templateId, authorId, period, status (draft|submitted), submittedAt, data{}

/report_templates/{templateId}
  - name, metrics[], cadence (weekly|monthly), assignedRoles[]
```

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React (SPA, fits Davido Toolkit hub) |
| Auth | Firebase Auth — 3 roles: cmo, lead, staff |
| Database | Firestore — real-time sync for dashboards |
| Backend Logic | Cloud Functions — scheduled reminders, escalation triggers |
| Notifications | FCM + Email |
| AI | Qwen API — RAG chatbot, SOP generation, smart suggest |
| Hosting | Vercel (existing hub deployment) |

> No Firebase Storage in scope — file evidence upload is out of scope for now.

## Component Structure
```
src/tools/SOP-Management/
  index.tsx              — default export, root component with sub-routing
  CLAUDE.md
  components/
    SOPBuilder/          — drag-and-drop editor
    SOPViewer/           — read + guided walkthrough mode
    OnboardingDashboard/ — CMO/Lead view of staff progress
    LearningPath/        — staff self-learning UI
    ReportBuilder/       — template creation
    ReportDashboard/     — submission + summary view
    AIChat/              — chatbot interface
  lib/
    firestore.ts         — Firestore queries for SOPs, users, progress
    qwen.ts              — Qwen API client (RAG + generation)
    auth.ts              — role helpers
```

## Key Conventions
- Role checks must be enforced at both UI (hide/show) and Firestore security rules level
- SOP content is always fetched fresh from Firestore — no local cache for AI RAG accuracy
- All AI calls go through `lib/qwen.ts` — never call Qwen API directly from components
- Vietnamese is the primary UI language for this tool
- Dark mode support via Tailwind `dark:` variants (same as hub)
