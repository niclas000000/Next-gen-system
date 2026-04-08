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

### Fas 1: Core System
1. Next.js + TypeScript + Tailwind + Shadcn/ui setup
2. Layout: Sidebar (collapsible), TopBar, Breadcrumb
3. Dashboard: stat cards, recent activity, quick actions
4. Auth: NextAuth.js

### Fas 2: Workflow Designer (Main focus)
- Prisma schema (Workflow, WorkflowForm, WorkflowRule, WorkflowInstance, WorkflowStep, Comment, Attachment, AuditLog)
- ReactFlow canvas with all node types
- Properties panel per node type
- Form Builder (drag & drop, all field types)
- Logic Builder (expression editor, conditions, calculations, automations, SLA)
- Workflow Engine (engine.ts, executor.ts, expression parser)
- Runtime: instance list + case detail view with timeline, forms, comments, attachments

### Fas 3: Admin
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

## Memory
Persistent memory: `C:\Users\NiclasSvensson\.claude\projects\c--Users-NiclasSvensson-OneDrive---CANEA-Partner-Group-AB-Next-gen-system\memory\`
