# Executive Committee Election — Frontend

React single-page application for the Executive Committee Election Management System: admin election control, member voting, candidate applications, live dashboard, and report exports.

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix primitives) |
| Data | TanStack Query, Axios |
| Forms | React Hook Form + Zod |
| Routing | React Router 7 |
| Charts | Recharts |
| Toasts | Sonner |
| Images | react-easy-crop, Cloudinary URL transforms |

## Features

### Admin

- **Dashboard** — Live stats, turnout charts, per-position rankings; polls every 10s during voting
- **Members** — Paginated list per academic year; CSV/XLSX import with preview, async polling for large files (500+ rows)
- **Positions** — CRUD with academic year, max winners, and importance ordering
- **Applications** — Review, approve, or reject member candidate applications
- **Candidates** — Manage approved candidates with photo crop/upload
- **Elections** — Full lifecycle UI: schedule, start voting, publish results, archive; countdown and stepper
- **Reports** — Export results, candidates, turnout, and participation as PDF, Excel, or CSV

### Member

- **Phase-based portal** — Single home route (`/`) renders the correct experience based on election phase:
  - Application window → candidate application form
  - Voting open → interactive ballot
  - Results published → published results
  - Review / waiting → application status and countdown
- **Ballot** — One vote per position with confirmation dialog; irreversible
- **Applications** — Photo crop, declaration PDF upload, per-position status tracking
- **Forced password change** — Blocking modal on first login until password is updated

### Shared UI

- Dark / light theme (persisted)
- Responsive, mobile-first layout
- Skeleton loaders, empty states, error retry states
- Accessible forms and keyboard navigation
- Route-level code splitting with idle prefetch
- Multi-tab poll coordination (single active poller)

## Prerequisites

- Node.js 20+
- npm
- Backend API running (see [`../backend/README.md`](../backend/README.md))

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

For local development, the default `VITE_API_URL=/api` is sufficient. Vite proxies `/api` to `http://localhost:8000`.

3. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL. Use `/api` locally (Vite proxy). In production, set to your backend URL **including** `/api`, e.g. `https://your-api.onrender.com/api`. |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run Oxlint |

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Sign in with CPM Number + MC Number |
| `/` | Member | Phase-based member portal (apply, vote, results, or waiting) |
| `/admin` | Admin | Dashboard with live stats and charts |
| `/admin/members` | Admin | Member import and management |
| `/admin/positions` | Admin | Position management |
| `/admin/applications` | Admin | Candidate application review |
| `/admin/candidates` | Admin | Approved candidate management |
| `/admin/elections` | Admin | Election lifecycle control |
| `/admin/reports` | Admin | Report exports |

Legacy redirects: `/vote`, `/apply`, `/voting`, `/results`, `/my-votes` → `/`; `/admin/live` → `/admin`.

After login:

- **Admin** → `/admin`
- **Member** → `/`

## Authentication

Users log in with **CPM Number** and **MC Number** (password). JWT access and refresh tokens are stored in `localStorage` and attached to API requests automatically.

- Token refresh runs on 401 via Axios interceptor
- Session expiry redirects to `/login`
- Members with unchanged password see a blocking password-change modal
- Original institutional MC number is loaded from `GET /auth/me/` for the application form (not the login password)

## Project structure

```
src/
├── api/              # Axios client and endpoint modules
│   ├── client.ts     # Interceptors, download helpers, error parsing
│   ├── auth.ts       # Login, logout, me, change password
│   ├── members.ts    # Members + import jobs
│   ├── elections.ts  # Election lifecycle
│   ├── votes.ts      # Ballot and vote submission
│   ├── applications.ts
│   ├── candidates.ts
│   ├── positions.ts
│   ├── dashboard.ts
│   └── reports.ts
├── components/
│   ├── applications/ # Application status badges
│   ├── auth/         # Session bridge, forced password change
│   ├── charts/       # Recharts wrappers and theme
│   ├── dashboard/    # Dashboard skeletons and live cards
│   ├── elections/    # Lifecycle rail, countdown, next-step banner
│   ├── layout/       # Admin/member layouts, sidebar, guards
│   ├── members/      # Import panel
│   ├── motion/       # Stagger animations
│   ├── shared/       # PageHeader, tables, dialogs, countdown
│   ├── ui/           # shadcn/ui primitives
│   └── voting/       # Ballot cards and confirm dialog
├── context/          # AuthContext, ThemeContext
├── hooks/            # useOngoingElection, etc.
├── lib/              # Schemas, prefetch, election UI helpers, CSV utils
├── pages/
│   ├── admin/        # Admin route pages
│   ├── member/       # Member phase pages (rendered from home)
│   └── LoginPage.tsx
├── routes/           # Lazy-loaded page modules
└── types/            # Shared TypeScript types (api.ts)
```

## API modules

All modules use the shared client in `src/api/client.ts`. Responses follow `{ success, data, error }`.

| Module | Purpose |
|--------|---------|
| `auth.ts` | Login, logout, profile, password change |
| `members.ts` | CRUD, CSV/XLSX import, async job polling |
| `positions.ts` | Position CRUD |
| `candidates.ts` | Candidate CRUD, photo upload |
| `applications.ts` | Member applications, admin review |
| `elections.ts` | Election lifecycle actions |
| `votes.ts` | Ballot fetch, vote submission |
| `dashboard.ts` | Summary, overview, live stats |
| `reports.ts` | Blob download exports |

## Local development proxy

`vite.config.ts` proxies `/api` to `http://localhost:8000`:

```ts
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
  },
}
```

Run Django on port 8000 and the frontend on 5173 — no CORS changes needed locally.

## Production build & deployment

```bash
npm run build
```

Deploy the `dist/` folder (e.g. [Vercel](https://vercel.com)).

1. Set `VITE_API_URL` in your hosting environment to the full backend API URL:

```
VITE_API_URL=https://your-backend.onrender.com/api
```

2. Redeploy after changing environment variables (Vite bakes env vars at build time).

### Vercel configuration

`vercel.json` includes:

- SPA rewrites (all routes → `index.html`)
- Long-cache headers for hashed assets
- `no-cache` for `index.html`
- Security headers (`X-Content-Type-Options`, `Referrer-Policy`)

Ensure the backend `CORS_ALLOWED_ORIGINS` includes your Vercel deployment URL.

## Member portal phases

`MemberHomePage` fetches the ongoing election and renders one of:

| Phase | Page |
|-------|------|
| `SCHEDULED`, `APPLICATIONS_OPEN` | `CandidateApplicationPage` |
| `VOTING_OPEN` | `BallotPage` |
| `RESULTS_PUBLISHED` | `PublishedResultsPage` |
| `REVIEWING`, `READY_FOR_VOTING`, `VOTING_CLOSED` | `MemberApplicationStatusPage` |
| No election / other | Waiting empty state |

## Election admin workflow

1. Create a draft election and set application + voting dates
2. **Open Applications** — members can apply
3. Review applications on **Applications** page
4. When ready, **Start Voting** from **Elections** page
5. After voting closes, **Publish Results**
6. **Archive** when complete

Readiness checks (positions and members must exist) are enforced in the UI via `src/lib/election-readiness.ts`.

## Notable utilities (`src/lib/`)

| File | Purpose |
|------|---------|
| `auth-storage.ts` | JWT and user persistence |
| `prefetch.ts` | Route and data warmup on login/navigation |
| `election-lifecycle-ui.ts` | Phase labels, countdown variants, next-step copy |
| `member-csv.ts` | CSV/XLSX parse preview and template download |
| `cloudinary.ts` | Image URL optimization (`f_auto`, `q_auto`) |
| `query-sync.ts` | Shared TanStack Query keys and poll intervals |
| `notify.ts` | Toast helpers |

## Related documentation

- Backend API and deployment: [`../backend/README.md`](../backend/README.md)
- Project rules and milestones: [`../AGENTS.md`](../AGENTS.md)
