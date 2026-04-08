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
| Framework | Next.js 14+ (App Router) |
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

#### Done (scaffolding only — all stubs):
- File/folder structure for designer, runtime, engine, parser
- Node type components (visual shells, no ReactFlow integration)
- Properties panel, Form Builder, Logic Builder placeholders
- Workflow engine stubs (engine.ts, executor.ts, validator.ts, evaluator.ts)
- Expression parser stubs (parser.ts, tokenizer.ts) — functions.ts implemented
- API routes stubs (workflows, instances, expressions)
- Instance/case view pages (stubs)

#### Next up (priority order):
1. **Workflow Designer canvas** — ReactFlow integration, node drag/drop, connections, properties panel
2. **API layer** — CRUD for workflows and instances wired to Prisma/PostgreSQL
3. **Form Builder** — drag & drop fields, field types, preview
4. **Workflow Engine** — state machine, step execution, decision branching
5. **Expression Parser** — tokenizer, parser, evaluator
6. **Instance/Case view** — timeline, form rendering, comments, attachments
7. **Logic Builder** — conditions, calculations, automations, SLA rules

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
3. `npm run dev` — start Next.js dev server at http://localhost:3000
- Use `cmd.exe` (not PowerShell) to avoid execution policy issues on Windows
- Dashboard is at `/` (not `/dashboard`)

## Memory
Persistent memory: `C:\Users\NiclasSvensson\.claude\projects\c--Nexus\memory\`
