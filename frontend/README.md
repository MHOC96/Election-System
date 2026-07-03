# Executive Committee Election — Frontend

React SPA for the Executive Committee Election Management System.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- TanStack Query
- React Hook Form + Zod
- React Router
- Recharts
- Framer Motion

## Prerequisites

- Node.js 20+
- npm

The backend API must be running for full functionality (see `../backend/README.md`).

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

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL. Use `/api` locally (Vite proxy). In production, set to your backend URL including `/api`. |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run Oxlint |

## Project structure

```
src/
├── api/           # API client and endpoint modules
├── components/    # UI, layout, charts, shared components
├── context/       # Auth and theme providers
├── lib/           # Schemas, utilities, prefetch helpers
├── pages/         # Route pages (login, admin, member ballot)
├── routes/        # Route configuration
└── types/         # Shared TypeScript types
```

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Member sign-in (CPM + MC) |
| `/vote` | Member | Ballot and voting |
| `/admin` | Admin | Dashboard |
| `/admin/members` | Admin | Member import and management |
| `/admin/positions` | Admin | Position management |
| `/admin/candidates` | Admin | Candidate management |
| `/admin/election` | Admin | Election control |

## Authentication

Users log in with **CPM Number** and **MC Number**. JWT tokens are stored client-side and attached to API requests automatically.

- Admins are redirected to `/admin`
- Members are redirected to `/vote`

## Local development proxy

`vite.config.ts` proxies `/api` to `http://localhost:8000`, so you do not need CORS changes when both servers run locally.

## Production build

```bash
npm run build
```

Deploy the `dist/` folder (e.g. Vercel). Set `VITE_API_URL` to your production backend URL, for example:

```
VITE_API_URL=https://your-backend.onrender.com/api
```

Redeploy after changing environment variables.

## UI features

- Dark / light theme toggle
- Responsive, mobile-first layout
- Skeleton loaders and empty states
- Toast notifications
- Accessible forms and navigation
