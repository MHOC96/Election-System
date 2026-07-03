# Executive Committee Election — Backend

Django REST API for the Executive Committee Election Management System.

## Stack

- Python 3.12+
- Django 5.1
- Django REST Framework
- PostgreSQL
- JWT authentication (Simple JWT)
- Cloudinary (candidate profile images)

## Prerequisites

- Python 3.12 or newer
- PostgreSQL database (local or hosted, e.g. Supabase)

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

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for local development |
| `ALLOWED_HOSTS` | Comma-separated hostnames |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins |
| `JWT_ACCESS_TOKEN_LIFETIME` | Access token lifetime (minutes) |
| `JWT_REFRESH_TOKEN_LIFETIME` | Refresh token lifetime (minutes) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

See `.env.example` for sample values.

## API routes

| Prefix | Module |
|--------|--------|
| `/api/auth/` | Login, logout, token refresh |
| `/api/members/` | Member list, import, update |
| `/api/positions/` | Position CRUD |
| `/api/candidates/` | Candidate CRUD |
| `/api/elections/` | Election lifecycle |
| `/api/votes/` | Vote submission |
| `/api/dashboard/` | Admin dashboard stats |
| `/api/reports/` | PDF / Excel / CSV exports |

## Authentication

Members sign in with:

- **CPM Number** — username
- **MC Number** — password

Roles: `ADMIN` and `MEMBER`. Protected endpoints require a valid JWT `Authorization: Bearer <access_token>` header.

## Common commands

```bash
# Run tests
python manage.py test

# Create admin
python manage.py create_admin --cpm CPM001 --mc secret

# Django admin panel
python manage.py runserver
# → http://localhost:8000/admin/
```

## Project apps

- `accounts` — custom user model, JWT auth
- `members` — member management and CSV/XLSX import
- `positions` — election positions
- `candidates` — candidate profiles
- `voting` — elections and vote submission
- `dashboard` — live stats and aggregates
- `reports` — exportable reports

## Deployment notes

- Set `DEBUG=False` in production.
- Use a strong `SECRET_KEY` and restrict `ALLOWED_HOSTS`.
- Point `CORS_ALLOWED_ORIGINS` at your deployed frontend URL.
- Use a production WSGI server (e.g. Gunicorn) behind a reverse proxy.
- With Supabase transaction pooling (port 6543), keep `CONN_MAX_AGE=0`.
