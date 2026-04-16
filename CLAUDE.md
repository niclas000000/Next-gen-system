# CLAUDE.md — Nexus Project

This file provides guidance to Claude Code for working in this repository.
Update this file after every major prompt/implementation session.

---

## Project: Nexus

A modern web-based governance platform replacing Canea One.
Handles documents, processes, and workflows with focus on modern tech and UX.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18+ with TypeScript |
| Framework | Next.js 16+ (App Router) |
| Styling | Tailwind CSS |
| UI Components | Shadcn/ui (Radix UI primitives) |
| State Management | Zustand |
| Database | PostgreSQL (Docker locally) |
| ORM | Prisma |
| Authentication | NextAuth.js |
| Forms | React Hook Form + Zod |
| Workflow Engine | Custom + ReactFlow (visual designer) |
| Expression Engine | Custom expression parser |
| Icons | Lucide React |
| Rich Text | TipTap |
| Date/Time | date-fns |
| Compliance | WCAG, ISO 9001, GDPR-ready |

---

## Project Structure

```
nexus/
├── app/
│   ├── (auth)/login/ & register/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + TopBar
│   │   ├── page.tsx                # Dashboard
│   │   ├── documents/
│   │   ├── processes/
│   │   ├── workflows/
│   │   │   ├── design/[id]/        # Workflow designer (Canvas/Forms/Logic/Settings/Test tabs)
│   │   │   └── instances/[id]/     # Case management
│   │   └── admin/users|settings|system
│   └── api/workflows|instances|expressions
├── components/
│   ├── layout/Sidebar.tsx TopBar.tsx Breadcrumb.tsx
│   └── workflows/
│       ├── designer/               # Canvas, toolbar, node types, properties panel, form builder, logic builder
│       ├── runtime/                # WorkflowRenderer, FormRenderer, StepTimeline, WorkflowProgress
│       └── shared/
├── lib/
│   ├── db/                         # Prisma client
│   ├── auth/                       # NextAuth config
│   ├── workflow-engine/            # engine.ts, executor.ts, validator.ts, evaluator.ts
│   └── expression-parser/         # parser.ts, tokenizer.ts, functions.ts
├── prisma/schema.prisma
├── types/                          # workflow.ts, node.ts, field.ts, expression.ts, user.ts
└── docker-compose.yml              # PostgreSQL
```

---

## Design System

### Color Palette (Tailwind)
- Primary: `blue-600` — workflows, actions
- Secondary: `slate-700` — text, borders
- Success: `green-600` — completed, approved
- Warning: `orange-500` — pending, decisions
- Danger: `red-600` — cancelled, errors
- Info: `sky-500` — information

### Node Colors (Workflow Canvas)
| Node | Color |
|---|---|
| Start | green-500 |
| Task | blue-500 |
| Decision | orange-500 |
| Automation | purple-500 |
| Notification | sky-500 |
| Subprocess | indigo-500 |
| Delay | amber-500 |
| Parallel Gateway | teal-500 |
| End | red-500 |

### Typography
- Headings: `font-semibold`
- Body: `font-normal`
- Labels: `font-medium text-sm`
- Code/expressions: `font-mono text-xs`

### Components
- Rounded: `rounded-lg`
- Shadows: `shadow-sm` on cards
- Borders: `border-slate-200`
- Transitions: `transition-all duration-200`
- Focus: `ring-2 ring-blue-500`

---

## Implementation Phases

### Phase 1: Core System — DONE
- Next.js + TypeScript + Tailwind + Shadcn/ui setup ✓
- Layout: Sidebar (collapsible), TopBar, Breadcrumb ✓
- Dashboard: stat cards, recent activity, quick actions (mock data) ✓
- Auth: NextAuth.js configured (authorize callback not yet implemented)
- Prisma schema: fully defined (10 models) ✓
- UI component library (Radix/Shadcn): complete ✓
- Docker/PostgreSQL setup ✓

### Phase 2: Workflow Designer — IN PROGRESS (current focus)

#### Done:
- Workflow list page (`/workflows/design`) — cards, status badges, node count ✓
- New Workflow dialog — creates in DB, redirects to designer ✓
- Designer page layout — sidebar stays visible, canvas fills remaining space ✓
- ReactFlow canvas — node rendering, connections, properties panel, minimap ✓
- 9 node type components — Start, Task, Decision (diamond + Yes/No handles), Automation, Notification, Subprocess, Delay, Parallel, End ✓
- Properties panel — edits node fields per type; connection label/condition; workflow name/description ✓
- Auto-save — debounced 2s after any change ✓
- Save + Publish buttons — wired to PATCH `/api/workflows/[id]` ✓
- API routes — GET/POST `/api/workflows`, GET/PATCH/DELETE `/api/workflows/[id]` ✓
- Form Builder — field palette, field list, field properties panel, live preview ✓
- Form save API — PUT `/api/workflows/[id]/forms/[nodeId]` → Prisma WorkflowForm ✓
- Zustand stores: `workflow-designer-store.ts`, `form-builder-store.ts` ✓
- Canvas state: `useNodesState`/`useEdgesState` + `CanvasContext` for sharing RF state ✓
- Workflow Engine — `engine.ts`: startInstance, completeStep, cancelInstance, auto-advance through auto-nodes ✓
- Instance/Case list page (`/workflows/instances`) — running/completed cases with status badges ✓
- Instance detail page (`/workflows/instances/[id]`) — active step panel, form filling, decision branching, cancel ✓
- FormRenderer — all field types (text, textarea, number, date, select, multiselect, radio, checkbox, etc.) ✓
- StepTimeline — visual step history with form data summary ✓
- StartWorkflowButton — on published workflow cards, creates instance + redirects ✓
- Logic Builder — visual condition builder per decision node branch ✓
- Settings tab — WorkflowSettings form (permissions, notifications, title template, archive) ✓
- `components/ui/textarea.tsx` added to UI library ✓

- Expression Parser — full tokenizer + recursive descent parser + evaluator ✓
- Expression functions — Math, String, Date, Logic, Array built-ins in `functions.ts` ✓
- Condition evaluation in engine — decision branches auto-evaluated via `ExpressionParser.evaluateBoolean()` ✓
- Edge conditions serialized to DB (AutoSave + store save both include `condition` field) ✓
- ExpressionEditor — inline component with live validation (green/red indicator) ✓
- LogicBuilder — visual mode + expression mode toggle per branch ✓

- Admin Users page — table with search, role badges, active toggle, edit/delete/create dialogs ✓
- Admin Groups page — group cards, member management dialog ✓
- Admin System page — live stats (users, workflows, cases), recent activity, env info ✓
- API routes — `/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/groups`, `/api/admin/groups/[id]` ✓
- Real authentication — NextAuth `authorize` wired against DB with scrypt password hashing ✓
- Password hashing — Node.js `crypto` (scrypt + timingSafeEqual), no external dependency ✓
- Sidebar — Admin section (Users/Groups/System) with collapsible toggle, general section-toggle system ✓

- Dashboard — live DB stats (active cases, completed today, published workflows, total cases) + recent cases list ✓
- Login page — real form wired to NextAuth `signIn`, error handling, redirect on success ✓

- Route protection — `middleware.ts` using NextAuth, covers all routes except `/api/auth`, `/login`, static files ✓
- NextAuth API route — `app/api/auth/[...nextauth]/route.ts` (was missing, caused login to not work) ✓
- Comments on cases — `CommentThread` component, `GET/POST /api/instances/[id]/comments`, shown in instance detail ✓

- Audit log — engine writes entries for all events (instance_started/completed/cancelled, step_started/completed, decision_made/auto_evaluated) ✓
- AuditLog component — timeline with icons, actor, relative timestamp, hover for exact time ✓
- Instance detail right panel — tabbed (Timeline / Comments / Audit log) with count badges ✓
- `GET /api/instances/[id]/audit` — returns full audit trail ✓

- Session user in engine — all API routes (start/complete/cancel/comment) now read session and pass real userId ✓
- `user.id` propagated through JWT → session via NextAuth callbacks ✓
- Document model added to Prisma schema ✓
- Documents page — list with search/filter, create/edit/view/delete dialogs, category + tags + status ✓
- `GET/POST /api/documents`, `GET/PATCH/DELETE /api/documents/[id]` ✓

**Important:** Run `npx prisma db push` to apply the new Document model to the database.

#### Next up (priority order):
1. **Document content editor** — TipTap rich text editor in view/edit dialog (TipTap already installed)
2. **Processes page** — needs Process model in schema
3. **Sidebar** — add Documents link (currently missing from nav)

#### Architecture notes:
- Canvas state lives in `CanvasProvider` (isolated component in `CanvasContext.tsx`) — owns `useNodesState`/`useEdgesState` with no Zustand subscriptions, shared via `CanvasContext`
- `AutoSave` is a child component inside `CanvasProvider` that reads `rfNodes`/`rfEdges` via `useCanvas()` and watches `isDirty` from Zustand
- Zustand store (`workflow-designer-store`) holds metadata (name, status, dirty flag) + save/publish actions
- Form Builder state in `form-builder-store`, forms saved to `WorkflowForm` table keyed by `workflowId + nodeId`
- Placeholder user (`system-placeholder-user`) auto-upserted on first workflow create (auth not yet wired)
- Designer uses `-m-6` on its layout to escape dashboard's `p-6` padding
- Logic Builder reads/writes `rfEdges` via `useCanvas()` — conditions stored on `edge.data.condition` as expression strings (e.g. `variables.amount > 1000`)
- Engine currently matches decision branches by edge label/id/sourceHandle — condition evaluation not yet implemented

#### Next.js 16 breaking change (important):
- `params` in both page files and API routes is a `Promise` — must be awaited: `const { id } = await params`
- Type signature: `{ params: Promise<{ id: string }> }` not `{ params: { id: string } }`

### Phase 3: Admin — NOT STARTED
- User management, roles, groups
- System settings, email templates
- Audit log, workflow management

---

## Key Node Types

`start | task | decision | automation | notification | subprocess | delay | parallel-split | parallel-join | end`

---

## Key Field Types (Form Builder)

`text | textarea | number | date | select | multiselect | checkbox | radio | file | user | table | richtext`

---

## Built-in Expression Functions

```
Math:    SUM, AVG, MIN, MAX, ROUND, FLOOR, CEIL, ABS
String:  CONCAT, UPPER, LOWER, TRIM, SUBSTRING, REPLACE, LENGTH
Date:    NOW, TODAY, DATEDIFF, DATEADD, FORMAT_DATE, WORKDAYS
Logic:   IF, AND, OR, NOT, SWITCH, COALESCE
Array:   FILTER, MAP, FIND, COUNT, JOIN
User:    CURRENT_USER, USER_ROLE, USER_GROUP, HAS_PERMISSION
Workflow: GET_VARIABLE, SET_VARIABLE, GET_STEP_DATA
```

---

## Performance Requirements
- Canvas: 100+ nodes smoothly
- Form render: < 100ms
- Expression evaluation: < 10ms
- Instance list: 1000+ items with virtual scrolling
- Auto-save: debounced 2s

---

## General Principles
- Prefer editing existing files over creating new ones.
- No speculative abstractions — match complexity to what the task requires.
- No unnecessary comments, docstrings, or type annotations to unchanged code.
- No error handling for impossible scenarios.
- Never skip git hooks or bypass security checks.

## Commits
- Create new commits rather than amending, unless explicitly asked.
- Stage specific files by name — never `git add -A` or `git add .` blindly.
- Do not push unless explicitly asked.

## Language
All UI text must be in English. No Swedish strings in components, pages, or data.

## Startup
1. `docker-compose up -d` — start PostgreSQL
2. `npx prisma db push` — sync schema (first time or after schema changes)
3. `npx prisma db seed` — create default admin user (idempotent, safe to re-run)
4. `npm run dev` — start Next.js dev server at http://localhost:3000
- Use `cmd.exe` (not PowerShell) to avoid execution policy issues on Windows
- Dashboard is at `/` (not `/dashboard`)

## Default credentials (first run)
- Email: `admin@nexus.internal`
- Password: `admin`
- Change password after first login via Admin → Users

## Memory
Persistent memory: `C:\Users\NiclasSvensson\.claude\projects\c--Nexus\memory\`
