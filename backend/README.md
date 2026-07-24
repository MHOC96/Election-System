# Executive Committee Election — Backend

Django REST API for the Executive Committee Election Management System: secure member voting, admin election control, candidate applications, live statistics, exports, and audit logging.

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Python 3.12+ (3.14 supported via `config/py314_compat.py`) |
| Framework | Django 5.1, Django REST Framework |
| Database | PostgreSQL |
| Auth | JWT (Simple JWT) with refresh rotation and blacklist |
| Media | Cloudinary (candidate and application images) |
| Cache | Redis (production) or LocMem (local dev) |
| Reports | openpyxl (Excel), reportlab (PDF) |

## Features

- **Authentication** — CPM Number + MC Number login; `ADMIN` and `MEMBER` roles; forced password change support
- **Members** — CRUD, CSV/XLSX bulk import (sync or async for 500+ rows), bulk delete, clear-all per academic year
- **Positions** — CRUD with case-insensitive unique names per academic year (`2nd Year` / `3rd Year`)
- **Candidate applications** — Members apply during the application window; admins approve/reject; approval creates a candidate
- **Candidates** — Admin-managed profiles with Cloudinary photos; phase-guarded CRUD
- **Election lifecycle** — Draft → scheduled → applications → review → voting → results → archived (only one active scheduled election at a time)
- **Voting** — One vote per member per position per election; atomic submission; irreversible votes enforced by DB constraint
- **Dashboard** — Summary, overview, live stats, per-position rankings; PostgreSQL materialized view for vote aggregates
- **Reports** — CSV, XLSX, and PDF exports (results, candidates, turnout, participation)
- **Audit logging** — Immutable action log (login, votes, imports, CRUD, election events)

## Prerequisites

- Python 3.12 or newer
- PostgreSQL (local or hosted, e.g. Supabase)
- Redis (required when `DEBUG=False`)
- Cloudinary account (for image uploads in production)

## Setup

1. Create and activate a virtual environment:

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy environment variables and configure them:

```bash
cp .env.example .env
```

Edit `.env` with your `SECRET_KEY`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, and Cloudinary credentials.

4. Run migrations:

```bash
python manage.py migrate
```

5. Create an admin user:

```bash
python manage.py create_admin --cpm ADMIN001 --mc your-secure-password
```

6. Start the development server:

```bash
python manage.py runserver
```

The API is available at `http://localhost:8000/api/`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | Django secret key |
| `DEBUG` | Yes | `True` for local development |
| `ALLOWED_HOSTS` | Yes | Comma-separated hostnames |
| `DATABASE_URL` | Yes* | PostgreSQL connection string (recommended: Supabase transaction pooler, port 6543) |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Alt. | Individual DB settings if `DATABASE_URL` is not set |
| `CORS_ALLOWED_ORIGINS` | Yes | Allowed frontend origins (comma-separated) |
| `JWT_ACCESS_TOKEN_LIFETIME` | No | Access token lifetime in minutes (default: 30) |
| `JWT_REFRESH_TOKEN_LIFETIME` | No | Refresh token lifetime in minutes (default: 1440) |
| `CLOUDINARY_CLOUD_NAME` | Prod | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Prod | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Prod | Cloudinary API secret |
| `REDIS_URL` | Prod | Redis URL — **required when `DEBUG=False`** |
| `LOG_LEVEL` | No | Logging level (default: `INFO`) |
| `SECURE_SSL_REDIRECT` | No | HTTPS redirect in production (default: `True`) |

See `.env.example` for sample values.

## API overview

Base path: `/api/`. All endpoints except login and refresh require `Authorization: Bearer <access_token>` unless noted.

### Authentication (`/api/auth/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/login/` | Public | Login with CPM + MC; returns JWT and user profile |
| POST | `/refresh/` | Public | Refresh access token |
| POST | `/logout/` | Authenticated | Blacklist refresh token |
| GET | `/me/` | Authenticated | Current user profile (members include original `mc_number`) |
| POST | `/change-password/` | Authenticated | Change password; rotates JWT tokens |

### Members (`/api/members/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | Admin | Paginated member list (`?academic_year=`) |
| GET/PATCH/DELETE | `/<id>/` | Admin | Member detail, update, delete |
| POST | `/import/` | Admin | CSV/XLSX import — sync `200` or async `202` with `job_id` (500+ rows) |
| GET | `/import/<job_id>/` | Admin | Async import job status |
| GET | `/deletion-status/` | Admin | Whether member deletion is allowed |
| POST | `/clear-all/` | Admin | Delete all members for an academic year |
| POST | `/bulk-delete/` | Admin | Bulk delete by IDs |

### Positions (`/api/positions/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | Authenticated | List positions (members filtered by academic year) |
| POST | `/` | Admin | Create position |
| GET/PATCH/DELETE | `/<id>/` | Admin | Position detail, update, delete |
| GET | `/<position_id>/candidates/` | Authenticated | Candidates for a position |

### Candidates & applications (`/api/candidates/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET/POST | `/` | Read: auth / Write: admin | List or create candidates |
| GET/PATCH/DELETE | `/<id>/` | Read: auth / Write: admin | Candidate detail, update, delete |
| GET | `/modification-status/` | Authenticated | Whether candidate edits are allowed |
| POST | `/upload-photo/` | Admin | Upload candidate photo to Cloudinary |
| GET/POST | `/applications/me/` | Authenticated | Member applications / submit application |
| POST | `/applications/upload-document/` | Member | Upload declaration PDF |
| POST | `/applications/upload-photo/` | Member | Upload application photo |
| GET | `/applications/all/` | Admin | List all applications (filterable) |
| POST | `/applications/<id>/review/` | Admin | Approve or reject application |

### Elections (`/api/elections/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET/POST | `/` | Admin | List or create draft election |
| GET/PATCH/DELETE | `/<id>/` | Admin | Election detail, update, delete |
| GET | `/active/` | Authenticated | Latest non-archived election |
| GET | `/ongoing/` | Authenticated | Current scheduled election |
| GET | `/draft/` | Authenticated | First draft election |
| GET | `/published-results/` | Authenticated | Published results |
| POST | `/<id>/schedule/` | Admin | Open applications (DRAFT → SCHEDULED) |
| POST | `/<id>/start-voting/` | Admin | Start voting window |
| POST | `/<id>/publish-results/` | Admin | Publish results after voting closes |
| POST | `/<id>/archive/` | Admin | Archive after results published |

### Votes (`/api/votes/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/` | Member | Submit vote (`position_id`, `candidate_id`) — irreversible |
| GET | `/my-status/` | Member | Vote progress for ongoing election |
| GET | `/ballot/` | Member | Ballot with positions, candidates, and vote status |

### Dashboard (`/api/dashboard/`)

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/summary/` | Admin | Totals, turnout, election status |
| GET | `/overview/` | Admin | Summary + live stats combined |
| GET | `/live-stats/` | Admin | Per-position rankings and vote counts |
| GET | `/position/<position_id>/rankings/` | Admin | Rankings for one position |

### Reports (`/api/reports/`)

All accept `?export_format=csv|xlsx|pdf` and optional `?election_id=`, `?academic_year=`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/results/` | Election results |
| GET | `/candidates/` | Candidate list |
| GET | `/turnout/` | Turnout report |
| GET | `/participation/` | Voter participation list |

## Authentication

Members sign in with:

- **CPM Number** — username (stored uppercase)
- **MC Number** — password (hashed; members may change password after first login)

The original institutional MC number remains in the `mc_number` field and is returned on `GET /api/auth/me/` for members only (not in login response).

Roles: `ADMIN` and `MEMBER`. Protected endpoints require a valid JWT `Authorization: Bearer <access_token>` header.

## Election lifecycle

Only **one scheduled election** may be active at a time.

| Phase | Description |
|-------|-------------|
| `DRAFT` | Election created; dates editable |
| `SCHEDULED` | Applications not yet open |
| `APPLICATIONS_OPEN` | Members can submit candidate applications |
| `REVIEWING` | Application window closed; admin review |
| `READY_FOR_VOTING` | Approved candidates ready; admin can start voting |
| `VOTING_OPEN` | Members can cast votes |
| `VOTING_CLOSED` | Voting ended; admin can publish results |
| `RESULTS_PUBLISHED` | Results visible to members |
| `ARCHIVED` | Terminal state |

Admin actions: **Schedule** → **Start Voting** → **Publish Results** → **Archive**.

## Data integrity

- **Votes**: `UNIQUE (member, position, election)` — one vote per member per position
- **Applications**: one active application per member per election (excluding rejected/withdrawn)
- **Positions**: case-insensitive unique name per academic year
- **Audit logs**: immutable — updates and deletes are blocked at the model layer

## Project apps

| App | Responsibility |
|-----|----------------|
| `accounts` | Custom user model, JWT auth, password change |
| `members` | Member management, CSV/XLSX import (sync + async jobs) |
| `positions` | Election positions |
| `candidates` | Candidates and member applications |
| `voting` | Elections, ballot, vote submission |
| `dashboard` | Live stats, caching, materialized view |
| `reports` | PDF / Excel / CSV exports |
| `audit` | Immutable audit trail (internal; no public API) |

## Live stats materialized view

The `dashboard_live_vote_counts` materialized view pre-aggregates per-candidate vote totals for fast dashboard reads.

**Refresh strategy**

- Each successful vote calls `invalidate_live_stats_mv()`, which marks the view stale and schedules a debounced refresh (at most once every 10 seconds).
- In production, refresh runs asynchronously in a background thread using `REFRESH MATERIALIZED VIEW CONCURRENTLY` (with a non-concurrent fallback when needed).
- In tests, refresh runs synchronously so assertions see up-to-date counts.
- While the view is stale, `get_live_stats()` falls back to ORM aggregation so API responses stay correct.

**Shared cache**

- Debounce keys and dashboard cache versions live in Django cache (`REDIS_URL` when `DEBUG=False`).
- Use Redis in multi-worker deployments so debounce and cache invalidation are visible across processes.

## Common commands

```bash
# Run all tests
python manage.py test

# Run tests for one app
python manage.py test accounts voting dashboard

# Reuse test DB (faster local runs)
python manage.py test --keepdb

# Create admin
python manage.py create_admin --cpm ADMIN001 --mc secret

# Django admin panel
python manage.py runserver
# → http://localhost:8000/admin/
```

## Security

- JWT with refresh rotation and blacklist on logout/password change
- Rate limiting: global (60/min anon, 120/min user); scoped throttles for auth, voting, and uploads
- Server-side validation for all business rules (election phase, duplicate votes, academic year)
- CORS restricted to configured origins
- Production: HTTPS redirect, HSTS, secure cookies, `X-Frame-Options: DENY`
- SQL injection protection via Django ORM only

## Deployment notes

- Set `DEBUG=False` in production.
- Use a strong `SECRET_KEY` and restrict `ALLOWED_HOSTS`.
- Set `REDIS_URL` — required for shared cache across workers when `DEBUG=False`.
- Point `CORS_ALLOWED_ORIGINS` at your deployed frontend URL.
- Use a production WSGI server (e.g. Gunicorn) behind a reverse proxy.
- With Supabase transaction pooling (port 6543), keep `CONN_MAX_AGE=0`.
- Run `python manage.py migrate` on deploy (includes `dashboard_live_vote_counts` materialized view).
- Configure Cloudinary for candidate and application image uploads.

## API response format

Success:

```json
{
  "success": true,
  "data": { }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { }
  }
}
```
