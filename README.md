# VisaGuard

VisaGuard helps Australian subclass 500 student visa holders track casual work
hours against the 48-hour fortnightly limit. Users can forward roster emails,
connect roster calendar feeds, or add shifts manually, then see fixed-fortnight
and rolling 14-day totals in one dashboard.

This repository contains a Next.js frontend and a FastAPI backend.

## Features

- Clerk authentication with protected dashboard and settings pages
- Student onboarding with university and semester/break periods
- Unique inbound roster email address for each user
- Postmark inbound webhook for forwarded roster emails
- LLM-powered roster parsing through OpenRouter
- PDF roster text extraction
- Manual shift creation, editing, and deletion
- ICS calendar feed import for Humanforce, Deputy, Google Calendar, and similar roster feeds
- Employer aliases for cleaning up auto-detected names
- Employer-specific unpaid break rules with shift recomputation
- Fixed fortnight and rolling 14-day hour tracking
- Safe, warning, danger, and breach threshold states

## Tech Stack

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Clerk for authentication

### Backend

- FastAPI
- SQLAlchemy 2.0 async ORM
- PostgreSQL
- Alembic migrations
- OpenRouter via the OpenAI-compatible SDK
- Postmark inbound email webhooks
- `icalendar` for ICS feed parsing
- `pdfplumber` for PDF roster extraction

## Repository Layout

```text
VisaGuard/
  docker-compose.yml
  frontend/
    app/
      dashboard/
      onboarding/
      settings/
      sign-in/
      sign-up/
    lib/api-server.ts
    middleware.ts
    package.json
  backend/
    app/
      api/
      services/
      auth.py
      config.py
      database.py
      main.py
      models.py
      schemas.py
    alembic/
    requirements.txt
    README.md
```

## Prerequisites

- Node.js 18 or newer
- Python 3.11
- Docker Desktop, or another local PostgreSQL instance
- Clerk application
- OpenRouter API key
- Postmark inbound stream, if testing forwarded roster emails

## Local Setup

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd VisaGuard
```

### 2. Start PostgreSQL

The included Docker Compose file starts Postgres on host port `5434`.

```bash
docker compose up -d
```

The default local database is:

```text
postgresql+asyncpg://postgres:postgres@localhost:5434/visaguard
```

### 3. Configure the backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env` with your real values.

Required for local app usage:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5434/visaguard
OPENROUTER_API_KEY=sk-or-v1-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:3000
APP_EMAIL_DOMAIN=visaguard.app
```

Useful optional values:

```env
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=VisaGuard
OPENROUTER_SITE_URL=http://localhost:3000
POSTMARK_INBOUND_SECRET=your-secret-path-segment
RESEND_API_KEY=re_...
```

### 4. Run database migrations

From `backend/`:

```bash
alembic upgrade head
```

### 5. Start the backend

From `backend/` with the virtualenv active:

```bash
uvicorn app.main:app --reload --port 8000
```

Useful backend URLs:

- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

### 6. Configure the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

Install dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How The App Works

### Authentication

The frontend uses Clerk. Server-side API calls get the current Clerk token and
send it to the backend as a bearer token.

The backend verifies the JWT against Clerk JWKS. If a matching `User` row does
not exist yet, the backend creates one and assigns a generated inbox address.

### Onboarding

New users are redirected to `/onboarding`, where they provide:

- University
- Semester periods
- Break periods

The 48-hour cap applies during semester periods. Break periods are treated as
unlimited.

### Shift Sources

VisaGuard supports three shift sources:

- `manual`: created in the dashboard
- `email`: extracted from forwarded roster emails
- `calendar`: imported from ICS calendar feeds

All sources dedupe shifts by user, date, start time, and end time. Email and
calendar shifts can also use source-specific external IDs.

### Email Ingestion

Inbound roster emails are handled by:

```text
POST /webhook/inbound-email/{secret}
```

The `{secret}` path segment must match `POSTMARK_INBOUND_SECRET` when that env
var is set.

The backend resolves the user from:

- The generated `unique_inbox`
- A plus-addressed inbox tag
- The sender address, as a fallback

The email is logged immediately, then processed in the background. The parser
combines plain text, HTML text, and PDF attachment text before asking an LLM to
return structured shift data.

### Calendar Feed Ingestion

Users can add one or more ICS feeds from the settings page. Each feed is tagged
with an employer label.

On sync, the backend:

- Fetches the ICS file
- Parses `VEVENT` entries
- Ignores cancelled and all-day events
- Scans a window from 30 days ago to 90 days ahead
- Creates shifts for events between 30 minutes and 14 hours

### Break Rules

Each employer can have unpaid break rules, for example:

```text
Shift >= 5 hours -> subtract 30 minutes
Shift >= 8 hours -> subtract 60 minutes
```

The highest matching threshold wins. When rules change, existing shifts for that
employer are recomputed unless the shift has a manual break override.

### Fortnight Tracking

The backend returns both:

- A fixed fortnight aligned from Monday, 2024-01-01
- A rolling 14-day window ending today

Threshold labels are:

```text
safe    < 75%
warn    >= 75%
danger  >= 90%
breach  >= 100%
```

## Common Commands

Backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
alembic upgrade head
python3 -m compileall app
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
```

Database:

```bash
docker compose up -d
docker compose down
```

## API Overview

Authenticated user endpoints:

```text
GET    /api/users/me
POST   /api/users/setup
```

Fortnight summary:

```text
GET    /api/fortnightly/current?offset=0
```

Shifts:

```text
GET    /api/shifts
POST   /api/shifts
PATCH  /api/shifts/{shift_id}
DELETE /api/shifts/{shift_id}
```

Calendar feeds:

```text
GET    /api/calendar/feeds
POST   /api/calendar/feeds
PATCH  /api/calendar/feeds/{feed_id}
POST   /api/calendar/feeds/{feed_id}/sync
POST   /api/calendar/feeds/sync-all
DELETE /api/calendar/feeds/{feed_id}
```

Email logs:

```text
GET    /api/email-logs/recent
```

Employers and break rules:

```text
GET    /api/employers
PATCH  /api/employers/{employer_id}
GET    /api/employers/{employer_id}/break-rules
PUT    /api/employers/{employer_id}/break-rules
```

Inbound email webhook:

```text
POST   /webhook/inbound-email/{secret}
```

## Deployment Notes

The backend includes deployment-oriented files:

- `backend/Procfile`
- `backend/railway.toml`
- `backend/runtime.txt`

For production, make sure to configure:

- A production PostgreSQL database
- Clerk production keys
- `FRONTEND_URL`
- `APP_EMAIL_DOMAIN`
- `POSTMARK_INBOUND_SECRET`
- `OPENROUTER_API_KEY`
- CORS origins in the backend if the frontend domain changes

Run migrations before serving traffic:

```bash
alembic upgrade head
```

## Disclaimer

VisaGuard is a tracking aid, not legal advice. Students should always confirm
their visa work conditions with official Home Affairs guidance.
