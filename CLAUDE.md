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
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Sidebar + TopBar (wrapped in Suspense for useSearchParams)
│   │   ├── page.tsx                    # Dashboard (live stats, greeting, recent cases/docs)
│   │   ├── documents/
│   │   ├── processes/
│   │   ├── cases/                      # Cases hub with view library
│   │   │   ├── page.tsx
│   │   │   └── CasesClient.tsx
│   │   ├── design/                     # Design top-level section
│   │   │   ├── workflows/page.tsx      # Workflow list (same as old /workflows/design)
│   │   │   ├── processes/page.tsx      # Redirects to /processes
│   │   │   ├── forms/                  # Standalone form designer
│   │   │   │   ├── page.tsx            # Form list
│   │   │   │   ├── NewFormButton.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── FormDesigner.tsx
│   │   │   └── document-types/         # Document type stubs
│   │   │       ├── page.tsx            # Cards per type
│   │   │       └── [type]/page.tsx     # Per-type stub
│   │   ├── workflows/
│   │   │   ├── design/[id]/            # Workflow designer (Canvas/Forms/Logic/Settings tabs)
│   │   │   └── instances/[id]/         # Case detail (unchanged)
│   │   └── admin/users|settings|register|appearance|system
│   └── api/
│       ├── workflows|instances|expressions
│       ├── forms/                      # Standalone forms CRUD
│       ├── views/                      # Saved case views CRUD
│       ├── processes/
│       ├── registry/
│       └── settings/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                 # Collapsible, isActive handles query params
│   │   ├── TopBar.tsx
│   │   └── DashboardBackground.tsx     # Background image with opacity overlay
│   └── workflows/
│       ├── designer/
│       │   ├── FormBuilder/
│       │   │   ├── FormBuilder.tsx     # Workflow node form builder
│       │   │   ├── ImportFormDialog.tsx # Import standalone form into workflow node
│       │   │   ├── FieldPalette.tsx
│       │   │   ├── FieldList.tsx
│       │   │   ├── FieldProperties.tsx
│       │   │   └── FormPreview.tsx
│       │   └── ...
│       └── runtime/
├── lib/
│   ├── db/
│   ├── auth/
│   ├── workflow-engine/
│   ├── expression-parser/
│   └── settings-context.tsx            # React context for app-wide settings (background, theme)
├── prisma/schema.prisma
├── proxy.ts                            # Next.js 16 route protection (renamed from middleware.ts)
├── types/
└── docker-compose.yml
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

### Background image pattern
- Background image stored in `SystemSetting` table (key: `backgroundImage`, `backgroundOpacity`)
- Applied via `DashboardBackground` component with configurable opacity
- Content rows over background use `bg-white/85 backdrop-blur-sm` for WCAG AA compliance

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

## Prisma Schema (current models)

`User`, `Group`, `Document`, `Workflow`, `WorkflowForm`, `WorkflowRule`, `WorkflowInstance`, `WorkflowStep`, `Comment`, `Attachment`, `AuditLog`, `SystemSetting`, `RegistryItem`, `Process`, `ProcessDocument`, `ProcessWorkflow`, `Form`, `SavedView`

Key additions vs original:
- `Form` — standalone reusable forms (fields JSON, settings JSON)
- `SavedView` — user-saved case view filters (userId, filters JSON)
- `RegistryItem.isProcessRoot` — marks which registry item is the process tree root
- `Process` — full process tree with canvas (nodes/edges JSON), KPIs, linked documents/workflows

---

## Implementation Status

### Done ✓
- Full layout: Sidebar (collapsible, query-param-aware isActive), TopBar, dark theme
- Dashboard: live DB stats, time-based greeting (morning/afternoon/evening), capitalized first name
- Auth: NextAuth with scrypt password hashing, JWT with user.id, route protection via `proxy.ts`
- Documents: list, create/edit/view/delete, TipTap rich text editor, categories/tags/status
- Processes: tree navigation (right-click context menu), inline detail panel with tabs (Overview, Canvas, Documents, Workflows, KPIs), ReactFlow canvas per process
- Workflow designer: canvas, 9 node types, properties panel, form builder, logic builder, expression editor, auto-save, publish
- Workflow engine: startInstance, completeStep, cancelInstance, auto-advance, condition evaluation
- Case management: list, detail page, form filling, decision branching, comments, audit log, step timeline
- Admin: Users, Groups, Register (categories/tags/RegistryItems), Appearance (background image + opacity), System
- **Cases hub** (`/cases`): two-panel layout, predefined views (All/Running/Completed/Cancelled/My cases/Per workflow), saved views (POST/DELETE `/api/views`), per-workflow accordion grouping, `bg-white/85` for WCAG contrast over background image
- **Design section** (`/design`): top-level nav with Workflows, Processes (redirect), Forms, Document Types
- **Standalone Form Designer** (`/design/forms`, `/design/forms/[id]`): full three-panel designer (FieldPalette / FieldList / FieldProperties), FormPreview toggle, auto-save 2s, inline name editing
- **Import form into workflow**: "Use existing form" button in workflow Form tab → `ImportFormDialog` → replace or append fields from form library
- **Document Types** (`/design/document-types`): cards for Policy, Work Instruction, Procedure, Template, Guide, Contract + per-type stub pages
- Settings: `GET/PATCH /api/settings`, `SettingsProvider` context, `DashboardBackground` component

### Navigation structure (Sidebar)
```
Dashboard
Documents
Processes
Cases (expanded by default)
  ├── All cases        /cases
  ├── Running          /cases?status=running
  ├── Completed        /cases?status=completed
  ├── Cancelled        /cases?status=cancelled
  ├── My cases         /cases?view=mine
  └── Per workflow     /cases?view=by-workflow
Design
  ├── Workflows        /design/workflows
  ├── Processes        /design/processes  → redirect /processes
  ├── Forms            /design/forms
  └── Document Types   /design/document-types
Admin
  ├── Users, Groups, Register, Appearance, System
```

### Possible next areas
- BPMN 2.0 node types for process canvas
- Document content approval/review workflow
- `isProcessRoot` usage in process tree UI
- Notifications system
- Full-text search across documents/cases
- Dashboard widgets customization

---

## Architecture Notes

- `CanvasProvider` owns `useNodesState`/`useEdgesState`, shared via `CanvasContext` — no Zustand
- `AutoSave` is a child of `CanvasProvider`, reads canvas state via `useCanvas()`
- `form-builder-store` (Zustand) is shared between workflow FormBuilder and standalone FormDesigner — both call `loadForm(id, fields, settings)`
- Designer and Cases pages use `-m-6` to escape dashboard's `p-6` padding for full-height layouts
- Sidebar uses `useSearchParams()` — requires Suspense boundary in `layout.tsx`
- `proxy.ts` replaces `middleware.ts` (Next.js 16 convention change)
- `params` in pages and API routes is a `Promise` — always `await params`

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
3. `npx prisma generate` — regenerate client after schema changes (stop dev server first — EPERM otherwise)
4. `npx prisma db seed` — create default admin user (idempotent, safe to re-run)
5. `npm run dev` — start Next.js dev server at http://localhost:3000
- Use `cmd.exe` (not PowerShell) to avoid execution policy issues on Windows
- Dashboard is at `/` (not `/dashboard`)

## Default credentials (first run)
- Email: `admin@nexus.internal`
- Password: `admin`
- Change password after first login via Admin → Users

## Memory
Persistent memory: `C:\Users\NiclasSvensson\.claude\projects\c--Project-Nexus\memory\`
