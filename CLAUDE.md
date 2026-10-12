# CLAUDE.md — Nexus Project

This file provides guidance to Claude Code for working in this repository.
Update this file after every major prompt/implementation session.

---

## Project: Nexus

A **vision/demo** of a modern governance platform replacing CANEA ONE: documents, processes
and phase-based cases (deviations, CAPA, changes …) with roles, rules and e-signatures.
The case model mirrors CANEA ONE and CANEA Blueprint (Workshop-tool) so configurations can
move between them. Priority is a convincing end-to-end demo; hardening is kept light.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 with Northwind tokens (CSS variables) |
| UI | Shadcn/ui (Radix primitives), Lucide icons, own toast + confirm dialog |
| Database | PostgreSQL in Docker (host port **5433**), Prisma 5 |
| Auth | NextAuth (credentials, JWT); demo "view as" for admins |
| Config model | Zod (`lib/case-config/schema.ts`) |
| Rich text | TipTap (documents) |
| Canvas | ReactFlow (process maps only) |
| Tests | Vitest (`npm test`), tsx for scripts |

---

## Project Structure

```
app/
├── (auth)/login/                 # Sign in; demo account quick sign-in when DEMO_MODE=true
├── (dashboard)/
│   ├── layout.tsx                # AppShell (rail + context panel + top bar), Suspense for search params
│   ├── page.tsx                  # Home: waiting-for-you hero, stats, open cases per phase, activity
│   ├── tasks/                    # My work: assigned cases, group inboxes, document approvals
│   ├── cases/                    # Case list (status tabs, filters, pagination, new case)
│   │   └── [number]/             # Case page (e.g. /cases/DEV3)
│   ├── documents/                # Document library + editor
│   ├── processes/                # Process tree, canvas, linked documents and case types
│   ├── design/
│   │   ├── case-types/           # Case type list + editor (/design/case-types/[id])
│   │   ├── document-types/ approval-flows/ views/
│   │   └── processes/            # Redirects to /processes
│   └── admin/ users | settings (groups) | roles | register (labels) | lookup-tables | appearance | system
└── api/
    ├── case-types/[id]/publish   # Case type CRUD + publish
    ├── cases/[id]/actions|comments|attachments
    ├── inbox/  me/  demo/view-as/
    └── documents/ processes/ registry/ roles/ settings/ system-views/ notifications/ …
components/
├── layout/   AppShell, Rail, ContextPanel, TopBar (breadcrumb), CommandPalette, Logo, nav.tsx
├── cases/    CaseView, FieldControl, CaseSidePanel, SignDialog, CaseList, NewCaseDialog, format.ts
├── design/   NewCaseTypeDialog, editor/ (Basics, Phases, Fields, Matrix, Permissions, Rules, Try)
├── form-builder/  Field palette/list/properties/preview — used by Document Types' property packages
└── ui/       shadcn primitives + toast.tsx + confirm.tsx
lib/
├── case-config/  schema.ts, validate.ts, runtime.ts, layout.ts, publish.ts, fixtures/deviation-pharma.json
├── cases/        engine.ts (pure), service.ts (DB), attachments.ts, http.ts
├── auth/         config.ts, session.ts (getSessionUser/requireUser/requireAdmin), password.ts
├── settings-context.tsx  # theme (light/dark/system) default + per-browser override
├── recent.ts             # recently visited items for the palette
└── stores/form-builder-store.ts
prisma/  schema.prisma, seed.ts (admin, system views, DEV case type), demo.ts (demo data)
```

---

## Case model (phase-based, CANEA ONE style)

- **`CaseTypeConfig`** (`lib/case-config/schema.ts`) is a port of Workshop-tool `shared/src/workflowConfig.ts`.
  Keep field names/defaults in sync so Blueprint JSON imports unchanged. Case type → ordered phases →
  fields defined once and placed per phase (`edit` / `readOnly` / hidden, mandatory override) → role ×
  phase permissions (edit / forward / backward / preEnd) → phase rules with triggers and structured
  `when` conditions (`eq|neq|empty|notEmpty`). Free-text conditions are kept but never evaluated.
- **`runtime.ts`** (port of Workshop-tool `formTrial.ts`): field states, missing mandatory, next phase,
  forced direction, firing rules, e-signature requirement. Pure.
- **`lib/cases/engine.ts`**: per actor — roles from `Case.roles` + `CaseType.roleBindings` (users/groups),
  permissions, `restrictForActor` (group roles only edit the assignment field), `moveStates`,
  `allowedActions` (with reasons), `applySave` (multi-pass so dependent fields can be set together),
  `applyTake`, `planMove`, `initialCase`. Pure and covered by golden tests on the Deviation fixture.
  The case page and the editor's Try tab call the same functions client-side.
- **`lib/cases/service.ts`**: numbering (`prefix + nextNumber`), optimistic locking (`revision` → 409),
  e-signature (password + meaning → `CaseEvent signed`), notifications for e-mail rules and phase entry
  (e-mail itself is a console stub), comments, attachments (files under `uploads/`, gitignored), inbox, list.
- Prisma: `CaseType` (draft JSON, unique prefix, `roleBindings`, `nextNumber`), immutable `CaseTypeVersion`
  (running cases keep their version), `Case` (with `parentId`/`parentFieldId` for sub cases), `CaseEvent`,
  `CaseComment`, `CaseAttachment`, `ProcessCaseType`.
- **Sub cases**: a `subcase` field creates cases of the type named by `subcaseTypeName` (else a type named like the
  field). The field's value is the list of child case ids — written only by `createCase(…, parent)`, never by a save,
  so mandatory checks count sub cases. `subcasesMustBeClosed` blocks forward/quick close while children are open
  (`CaseSnapshot.openSubcases`). A child closing notifies whoever has the parent and logs `subcaseClosed` there.
- Built-in case types live in `lib/case-config/fixtures`: CANEA reference JSON exported unchanged from Workshop-tool
  (Deviation EX-26714, CAPA EX-26738, Action) + idempotent Nexus adjustments in `fixtures/index.ts` (sub case targets,
  structured CAPA QA rules, hidden "Comments" sub cases). Seed creates them; `demo:reset` re-applies the adjustments.
- Other models: `User`, `Group` (members[] used for role bindings), `Document*`, `ApprovalFlow`, `DocumentType`,
  `Process*`, `ProcessRole`, `LookupTable/Value`, `RegistryItem`, `SystemView`, `SavedView`, `ViewFolder`,
  `Notification`, `SystemSetting`. JSON writes use `as never` casts (repo convention).
- The old graph workflow module (ReactFlow designer, WorkflowInstance engine, standalone forms) was removed
  on 2026-10-12; a DB backup from before is in `backups/` (gitignored).

---

## Design System — Northwind

Never use raw Tailwind palette colours (blue/green/slate …) or hex in components — use the token classes.

- Tokens are CSS variables in `app/globals.css`, exposed as Tailwind colours: `paper paper-2 paper-3 surface
  ink ink-2 ink-3 ink-4 rule rule-soft nw-accent accent-tint on-fill rail chart-1` and status
  `ok warn risk` with `-tint -line -ink` variants (e.g. `bg-risk-tint border-risk-line text-risk-ink`).
- Use classes with real `hover:` and `focus-visible:ring-2 focus-visible:ring-nw-accent` states — no
  `onMouseEnter` style hacks (older pages still have some; replace when touching them).
- Fonts: `font-display` (Inter Tight) for headings and numbers, Inter for UI, `font-mono` / `.mono-meta` for
  IDs, case numbers and eyebrows. Radius `rounded-[2px]` (pills `rounded-full`). Borders, no shadows on cards.
- Badges: `variant="ok|warn|risk|accent|default"`. Buttons: default = ink fill.
- Charts: `chart-1` (#008C99) is validated for light and dark surfaces (dataviz validator).
- Theme: `data-theme` on `<html>` from `SettingsProvider` (admin default in Appearance, user override in the
  account menu, stored in localStorage `nexus-theme`).

### Navigation
- Dark icon **rail** (Home, My work with count, Cases, Documents, Processes, + New; Design/Admin for admins,
  account menu) + light **context panel** per module (Cases: system views + case types; Documents: views;
  Design; Admin). Panel collapses (localStorage `nexus-panel`), drawer on mobile. Definitions in `components/layout/nav.tsx`.
- Ctrl+K command palette: case number/title search, documents, actions, recent items.

---

## Architecture Notes

- `proxy.ts` (Next 16's middleware) requires a session everywhere except auth/static; `/admin/*` and
  `/api/admin/*` also require the admin role. In routes use `requireUser()` / `requireAdmin()` from
  `lib/auth/session.ts` — they honour demo "view as" (cookie `nexus-view-as`, only when `DEMO_MODE=true`).
- `params` / `searchParams` in pages and routes are Promises — always `await` them.
- Pages that need full height use `-m-6` to escape the main `p-6` padding (processes, case type editor).
- `npx prisma generate` fails with EPERM while the dev server runs (locked engine DLL) — stop it first.
- npm installs need `--legacy-peer-deps` (pre-existing eslint 8 vs eslint-config-next 16 conflict).
- Git Bash rewrites arguments starting with `/` into Windows paths — use `MSYS_NO_PATHCONV=1` for scripts
  that take URL paths.

---

## Status

### Done
- Phase-based cases end to end: case page (phase stepper, live field rules, history of earlier phases,
  sticky actions with block reasons, take-from-group-inbox, e-signature dialog, activity, comments,
  attachments), case list, My work, Home dashboard.
- Case type designer with Blueprint JSON import, autosave, undo/redo, validation, publish to versions, Try it.
- Documents (library, editor, versions, read receipts, approval flows), processes (tree, canvas, links to
  documents and case types), admin pages.
- Demo: `npm run demo:reset` → demo users (password `demo`), inbox groups, 8 DEV cases in every state, CAPA1 (from DEV5,
  in implementation, blocked by open ACT1) and CAPA2 + ACT2 (from DEV7, closed).
- CANEA ONE import: `npm run import:canea -- --workflow wf_dev.txt --rules wf_dev_rules.txt --registry wf_reg.xlsx [--out x.json] [--create]`
  (`lib/case-config/importers/canea-sql.ts`, pure + tested). Property categories merge per-phase items into one field;
  ConstraintType 0/4 = eq/neq; ProtectedFieldRule Value1 False/True = hidden/read-only, IDType 1 = fields, 7 = roles it
  applies to (missing roles are exempt); CheckValueRule IDType 2 = mandatory fields; checks on non-editable fields become
  forced directions; chained sub-choices walk down the registry tree. People in the registry export are not imported.

### Not yet / ideas
- Group roles set from a chosen org unit (CANEA "role from registry") need manual group bindings after import.
- Change control (CC) sub cases have no case type yet; e-mail is a console stub; SMS/web service/computed/alarm rules are
  kept from imports but not executed; no per-case security levels; property categories for cross-case reporting.

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
1. `docker-compose up -d` — PostgreSQL on host port 5433 (5432 is used by Workshop-tool's DB)
2. `npx prisma db push` — sync schema (stop the dev server first if it is running)
3. `npx prisma db seed` — admin user, system views, Deviation case type (idempotent)
4. `npm run demo:reset` — demo users, groups and DEV cases (optional, resets DEV cases)
5. `npm run dev` — http://localhost:3000 (dashboard at `/`)
- `.env` needs `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`; `DEMO_MODE=true` enables "view as" and the
  demo accounts on the login page.
- Use `cmd.exe` (not PowerShell) to avoid execution policy issues on Windows.

## Default credentials
- Seed admin: `admin@nexus.internal` / `admin` (change after first login)
- Demo (after `demo:reset`): `admin@nexus.demo`, `anna.berg@`, `erik.lund@`, `johan.ek@`, `sara.nilsson@`,
  `lina.holm@nexus.demo` — password `demo`

## Memory
Persistent memory: `C:\Users\NiclasSvensson\.claude\projects\c--Project-Nexus\memory\`
