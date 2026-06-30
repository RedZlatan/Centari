# Supabase Setup — Bring Your Problem

**Sprint:** 3C  
**Status:** Built — requires one-time Supabase project setup before going live

---

## What was built

| File | Purpose |
|------|---------|
| `supabase/migrations/001_problem_submissions.sql` | Table definition and indexes |
| `src/lib/supabase.ts` | Server-side Supabase client (service role, lazy init) |
| `src/app/api/problem-submissions/route.ts` | `POST /api/problem-submissions` |

The API uses the Supabase service role key — it runs server-side only. No Supabase credentials are ever sent to the browser.

---

## One-time setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project.

- **Name:** centari (or centari-prod)
- **Database password:** generate a strong one and save it somewhere safe
- **Region:** Europe West (closest to the Hetzner deployment target)

Free tier is sufficient for the expected submission volume.

### 2. Run the migration

In the Supabase dashboard:

1. Open **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste the contents of `supabase/migrations/001_problem_submissions.sql`
4. Click **Run**

The output should read: `Success. No rows returned.`

To verify the table was created: open **Table Editor** → you should see `problem_submissions` in the list.

### 3. Get your credentials

In the Supabase dashboard:

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** — looks like `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **service_role** key (under "Project API keys") — starts with `eyJ...`

The `anon` key is not what you want here. Use `service_role`.

### 4. Set environment variables

Add to `.env.local` (create the file at the project root if it doesn't exist):

```
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The `service_role` key bypasses Row Level Security. It must never be committed to the repository or exposed to the browser. `.env.local` is already in `.gitignore`.

**For production (Hetzner):** Set these as server environment variables, not in a file:
```bash
# In the deployment environment or Docker run command
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## API endpoint

### `POST /api/problem-submissions`

Accepts JSON. Validates, spam-checks, then inserts a row into `problem_submissions`.

#### Request body

```json
{
  "_honey": "",
  "title": "string — required, 5–200 chars",
  "description": "string — required, 20–5000 chars",
  "category": "string — required, see enum",
  "estimated_value": "string — optional, see enum",
  "visibility": "private | public — optional, default: private",
  "name": "string — optional, max 100 chars",
  "email": "string — optional, valid email"
}
```

`_honey` is a hidden honeypot field. The form should render it as a hidden input with an empty default value. If the server receives it non-empty, it returns a fake success and stores nothing.

#### Responses

**201 — stored**
```json
{ "success": true, "id": "uuid" }
```

**400 — validation failed**
```json
{
  "success": false,
  "errors": {
    "title": "Title must be at least 5 characters.",
    "category": "Please select a valid category."
  }
}
```

**429 — rate limited** (3 submissions per IP per hour)
```json
{ "success": false, "message": "Too many submissions. Please try again later." }
```

**503 — Supabase not configured** (missing env vars)
```json
{ "success": false, "message": "Service unavailable." }
```

**500 — database error**
```json
{ "success": false, "message": "Failed to save. Please try again." }
```

---

## Data model

### `problem_submissions` table

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | Primary key |
| `title` | text | — | Required |
| `description` | text | — | Required |
| `category` | text | — | Required, see enum |
| `estimated_value` | text | null | Optional |
| `visibility` | text | `'private'` | `private` or `public` |
| `name` | text | null | Submitter's name |
| `email` | text | null | Submitter's email |
| `status` | text | `'new'` | Review workflow field |
| `source` | text | `'monolith'` | Intake channel identifier |
| `created_at` | timestamptz | `now()` | Set by DB |

### Category enum

| Value | Display |
|-------|---------|
| `xr-simulation` | XR & Simulation |
| `ai-automation` | AI & Automation |
| `hardware-sensors` | Hardware & Sensors |
| `data-intelligence` | Data & Intelligence |
| `training-operations` | Training & Operations |
| `infrastructure` | Infrastructure |
| `research-development` | Research & Development |
| `other` | Other |

### Estimated value enum

| Value | Display |
|-------|---------|
| `under-50k` | Under 50K |
| `50k-250k` | 50K – 250K |
| `250k-1m` | 250K – 1M |
| `over-1m` | Over 1M |
| `unknown` | Not sure |

### Status enum

| Value | Meaning |
|-------|---------|
| `new` | Submitted, not yet reviewed |
| `reviewed` | Centari has read it |
| `contacted` | Centari has reached out |
| `archived` | No action required |

### Source enum (future)

`source` defaults to `'monolith'` (the public website). When other intake channels exist (Control Room, partner portal, API), they set a different source value. This field is always set server-side — the form does not send it.

---

## Reading and managing submissions

No admin UI is built yet. Use the Supabase dashboard.

### View all submissions

1. Open the Supabase dashboard
2. Go to **Table Editor** → `problem_submissions`
3. All rows are shown. Sort by `created_at` descending for newest first.

### Filter by status

In Table Editor, click **Filter** → `status` → `eq` → `new`.

### Update status

Click any row → edit the `status` field inline → save. Or use SQL Editor:

```sql
-- After reviewing a submission
UPDATE problem_submissions SET status = 'reviewed' WHERE id = '...';

-- After contacting the submitter
UPDATE problem_submissions SET status = 'contacted' WHERE id = '...';

-- Archive (no action needed)
UPDATE problem_submissions SET status = 'archived' WHERE id = '...';
```

### Useful SQL queries

**New submissions, newest first:**
```sql
SELECT id, title, category, email, created_at
FROM problem_submissions
WHERE status = 'new'
ORDER BY created_at DESC;
```

**Count by status:**
```sql
SELECT status, COUNT(*) FROM problem_submissions GROUP BY status;
```

**Full row:**
```sql
SELECT * FROM problem_submissions WHERE id = 'paste-uuid-here';
```

---

## Local test instructions

### Prerequisites

1. Supabase project created and migration run (steps 1–2 above)
2. `.env.local` populated with URL and key (step 4 above)
3. Dev server running: `npm run dev`

### Test valid submission

```bash
curl -s -X POST http://localhost:3000/api/problem-submissions \
  -H "Content-Type: application/json" \
  -d '{
    "_honey": "",
    "title": "Training teams in high-hazard environments",
    "description": "Our crews need to rehearse emergency procedures but live exposure is too dangerous. Current tabletop exercises produce almost no measurable readiness improvement.",
    "category": "training-operations",
    "estimated_value": "50k-250k",
    "visibility": "private",
    "name": "J. Eriksson",
    "email": "j.eriksson@example.com"
  }' | jq
```

Expected:
```json
{ "success": true, "id": "..." }
```

Verify in Supabase Table Editor — the row should appear immediately.

### Test honeypot rejection

```bash
curl -s -X POST http://localhost:3000/api/problem-submissions \
  -H "Content-Type: application/json" \
  -d '{
    "_honey": "bot-filled-this",
    "title": "Bot submission",
    "description": "This is at least twenty characters.",
    "category": "other"
  }' | jq
```

Expected: `200 { "success": true }` — but no row appears in Supabase.

### Test validation errors

```bash
curl -s -X POST http://localhost:3000/api/problem-submissions \
  -H "Content-Type: application/json" \
  -d '{
    "_honey": "",
    "title": "Hi",
    "description": "Short",
    "category": "not-valid"
  }' | jq
```

Expected: `400` with `errors.title`, `errors.description`, `errors.category`.

### Test misconfigured credentials

Remove one of the env vars temporarily:

```bash
SUPABASE_URL="" npm run dev
```

Then submit — expected: `503 { "success": false, "message": "Service unavailable." }`.

### Test rate limiting

```bash
for i in 1 2 3 4; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:3000/api/problem-submissions \
    -H "Content-Type: application/json" \
    -d "{
      \"_honey\": \"\",
      \"title\": \"Rate limit test number $i here\",
      \"description\": \"Testing whether the rate limiter fires on the fourth request.\",
      \"category\": \"other\"
    }" | jq '.success, (.message // "ok")'
done
```

Expected: attempts 1–3 return `true "ok"`, attempt 4 returns `false "Too many submissions..."`.

---

## Production checklist

```
[ ] Supabase project created in Europe West region
[ ] Migration 001_problem_submissions.sql run successfully
[ ] Table visible in Supabase Table Editor
[ ] SUPABASE_URL set in production environment
[ ] SUPABASE_SERVICE_ROLE_KEY set in production environment
[ ] Neither env var committed to the repository or visible in client-side code
[ ] curl test against production URL returns 201
[ ] Row appears in Supabase Table Editor after production test
[ ] Test row deleted from Table Editor
```

---

## What is not in this sprint

- No GET endpoint (submissions are read via Supabase dashboard)
- No authentication on the API route
- No email notification on submission
- No Control Room integration
- No public problem board
- No admin UI

---

## Notes

**Rate limiting** is in-memory and resets on server restart. For persistent rate limiting without a separate Redis instance, query the `problem_submissions` table directly: count rows with the same `ip_address` (not currently stored) in the last hour. This would require adding an `ip_address` column to the migration. For current submission volumes, the in-memory store is sufficient.

**Supabase free tier limits:** 500MB database, 2GB bandwidth/month, unlimited API requests. Well within range for an intake form.

**If Supabase credentials are not set** during development, the route returns `503` with a clear error. The dev server does not crash on missing env vars — the error surfaces at request time.
