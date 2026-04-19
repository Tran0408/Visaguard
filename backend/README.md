# VisaGuard Backend

FastAPI backend for VisaGuard. Tracks casual work shifts for Australian subclass-500 students and warns before they cross the 48-hour fortnightly limit.

## Phase 1 scope

- SQLAlchemy 2.0 async models + Alembic
- Unique inbox generation (nanoid)
- Postmark inbound webhook (`POST /webhook/inbound-email`)
- LLM email parser via OpenRouter free tier (text / HTML / PDF)
- Fortnightly calculator
- `GET /api/fortnightly/current`
- `GET /health`

## Setup

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill DATABASE_URL + OPENROUTER_API_KEY at minimum
# Grab free key at https://openrouter.ai/keys
# Default model: google/gemini-2.0-flash-exp:free (swap in .env if rate-limited)
```

`DATABASE_URL` uses the asyncpg driver:
```
postgresql+asyncpg://user:password@localhost:5432/visaguard
```

## Migrations

Generate initial migration (after creating DB):
```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Then:
- `GET http://localhost:8000/health` → `{"status":"ok"}`
- OpenAPI docs: `http://localhost:8000/docs`

## Test the fortnightly endpoint

Insert a user + shifts via psql, then:
```
curl "http://localhost:8000/api/fortnightly/current?user_id=<uuid>"
```

Phase 1 does not verify Clerk JWTs yet — the endpoint takes `user_id` as a query param. Auth middleware added in Phase 3.

## Test the Postmark webhook locally

Run ngrok:
```bash
ngrok http 8000
```

Point your Postmark inbound stream at `https://<ngrok>.ngrok.io/webhook/inbound-email`. Send a roster email to the inbox address stored on a user row. Watch `email_logs` for the result.

Simulate without Postmark:
```bash
curl -X POST http://localhost:8000/webhook/inbound-email \
  -H "Content-Type: application/json" \
  -d '{
    "From": "roster@cafe.com",
    "OriginalRecipient": "shifts-abc1234567@visaguard.app",
    "Subject": "Your roster",
    "TextBody": "Hi! Your shifts this week: Mon 09:00-15:00 at Cafe X. Tue 14:00-22:00 at Cafe X.",
    "MessageID": "msg-1"
  }'
```

`POSTMARK_INBOUND_SECRET` — if set, the webhook requires an `X-Postmark-Secret` header.

## Layout

```
backend/
  app/
    main.py              FastAPI app, CORS, /health
    config.py            Env settings
    database.py          Async engine + session
    models.py            SQLAlchemy models
    schemas.py           Pydantic schemas
    api/
      webhooks.py        Postmark inbound webhook
      fortnightly.py     /api/fortnightly/current
    services/
      inbox.py           Unique inbox generator
      llm_parser.py      LLM email + calendar parsing (OpenRouter)
      fortnightly.py     Period + hour calculations
      shifts.py          Hour math, dedup, insert helpers
  alembic/               Migrations
  alembic.ini
  requirements.txt
  .env.example
```

## Phase 1 verification checklist

1. `uvicorn app.main:app --reload` boots clean
2. `GET /health` → 200
3. Alembic autogenerate creates all 5 tables (`users`, `semester_periods`, `employers`, `shifts`, `email_logs`)
4. Insert a user with `unique_inbox`, POST the sample webhook payload above — `email_logs` row has `status='processed'` and `shifts` rows appear
5. `GET /api/fortnightly/current?user_id=...` returns correct `hours_used`, `limit`, `threshold`

## Next phases

- Phase 2: Google Calendar OAuth + polling + event classification
- Phase 3: Next.js frontend, Clerk auth, onboarding, dashboard
- Phase 4: Resend alerts at 75/90/100%, shift history, deploy
