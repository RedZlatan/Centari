# Bring Your Problem — Intake Backend

**Sprint:** 3C  
**Status:** Built  
**Depends on:** `docs/monolith/bring-your-problem-plan.md`

---

## What was built

Three files:

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | SQLite connection singleton, schema init |
| `src/lib/problems.ts` | Data types, enums, `createProblem` |
| `src/app/api/problems/route.ts` | `POST /api/problems` — validate, spam-check, store |

Storage is a local SQLite file at `data/problems.db` (relative to the project root). The `data/` directory is gitignored. No external services required.

---

## API endpoint

### `POST /api/problems`

Accepts JSON. Creates a new problem submission.

#### Request body

```json
{
  "_honey": "",
  "title": "string — required, 5–200 chars",
  "description": "string — required, 20–5000 chars",
  "category": "string — required, see enum below",
  "estimated_value": "string — optional, see enum below",
  "visibility": "private | public — optional, default: private",
  "name_optional": "string — optional, max 100 chars",
  "email_optional": "string — optional, valid email format"
}
```

`_honey` is the spam honeypot field. The form renders it as a hidden input. If non-empty on submission, the server returns a fake success and stores nothing.

#### Responses

**201 Created — success**
```json
{ "success": true, "id": "550e8400-e29b-41d4-a716-446655440000" }
```

**400 Bad Request — validation errors**
```json
{
  "success": false,
  "errors": {
    "title": "Title must be at least 5 characters.",
    "category": "Please select a valid category."
  }
}
```

**429 Too Many Requests — rate limited**
```json
{ "success": false, "message": "Too many submissions. Please try again later." }
```

**500 Internal Server Error**
```json
{ "success": false, "message": "Failed to save. Please try again." }
```

---

## Data model

### `problems` table

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | TEXT | No | UUID v4, primary key |
| `title` | TEXT | No | 5–200 chars |
| `description` | TEXT | No | 20–5,000 chars |
| `category` | TEXT | No | See category enum |
| `estimated_value` | TEXT | Yes | See value enum |
| `visibility` | TEXT | No | `private` or `public`, default `private` |
| `name_optional` | TEXT | Yes | Submitter's name if provided |
| `email_optional` | TEXT | Yes | Submitter's email if provided |
| `status` | TEXT | No | See status enum, default `new` |
| `created_at` | TEXT | No | ISO 8601 timestamp |
| `ip_address` | TEXT | Yes | Used for rate limiting and spam review |
| `user_agent` | TEXT | Yes | For spam review |

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
| `new` | Just submitted, not yet reviewed |
| `reviewed` | Centari has read it |
| `contacted` | Centari has reached out to the submitter |
| `archived` | No action required |

Status is set to `new` on every submission. Centari updates it manually via SQLite CLI (see below).

---

## Spam protection

Two layers are active in the MVP.

**Honeypot field (`_honey`):** The form includes a hidden text input named `_honey`. If it contains any value when the form is submitted, the server returns a fake 200 success and discards the submission silently. Bots that fill every field are caught here without revealing that the submission was rejected.

**In-memory rate limiter:** Maximum 3 submissions per IP address per 1-hour rolling window. Returns HTTP 429 if exceeded. Stored in a `Map` in the server process — resets when the server restarts. Acceptable for MVP. Upgrade to a database-backed or Redis-backed store if persistent rate limiting is needed (e.g., if abuse continues across restarts).

---

## Database file location

**Development:** `{project_root}/data/problems.db`  
**Production:** Set the `DATABASE_PATH` environment variable:

```bash
DATABASE_PATH=/var/data/centari/problems.db
```

On a Hetzner VPS, this should be a path outside the deployment directory so it survives redeploys. The parent directory is created automatically if it does not exist.

The SQLite file is the only persistent state this system has. Back it up.

---

## Reading submissions

No admin UI exists in this sprint. Read submissions directly using the SQLite CLI.

### Install sqlite3 if needed

```bash
# macOS
brew install sqlite

# Ubuntu / Debian
apt install sqlite3
```

### Open the database

```bash
sqlite3 data/problems.db
```

### Useful queries

**List all new submissions:**
```sql
SELECT id, title, category, created_at, email_optional
FROM problems
WHERE status = 'new'
ORDER BY created_at DESC;
```

**Read a full submission:**
```sql
SELECT * FROM problems WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

**Filter by category:**
```sql
SELECT title, description, created_at
FROM problems
WHERE category = 'ai-automation'
ORDER BY created_at DESC;
```

**Count by status:**
```sql
SELECT status, COUNT(*) AS n FROM problems GROUP BY status;
```

### Updating status

After reviewing a submission:
```sql
UPDATE problems SET status = 'reviewed' WHERE id = '...';
```

After contacting the submitter:
```sql
UPDATE problems SET status = 'contacted' WHERE id = '...';
```

Archive a submission that needs no action:
```sql
UPDATE problems SET status = 'archived' WHERE id = '...';
```

Tip: `.mode column` and `.headers on` make query output easier to read:

```bash
sqlite3 data/problems.db
.mode column
.headers on
SELECT id, title, status, created_at FROM problems ORDER BY created_at DESC LIMIT 20;
```

---

## Local test instructions

### 1. Start the dev server

```bash
cd /Users/robinolsson/Desktop/Centari
npm run dev
```

The server starts at `http://localhost:3000`. The `data/` directory and `problems.db` file are created automatically on the first request.

### 2. Submit a valid problem

```bash
curl -s -X POST http://localhost:3000/api/problems \
  -H "Content-Type: application/json" \
  -d '{
    "_honey": "",
    "title": "We need to train teams in hazardous environments",
    "description": "Our teams need to practice emergency response procedures but the live environment is too dangerous. We have tried tabletop exercises but fidelity is too low.",
    "category": "training-operations",
    "estimated_value": "50k-250k",
    "visibility": "private",
    "name_optional": "J. Eriksson",
    "email_optional": "j.eriksson@example.com"
  }' | jq
```

Expected response:
```json
{
  "success": true,
  "id": "..."
}
```

### 3. Verify it was stored

```bash
sqlite3 data/problems.db "SELECT id, title, status, created_at FROM problems;"
```

### 4. Test validation

Missing required field:
```bash
curl -s -X POST http://localhost:3000/api/problems \
  -H "Content-Type: application/json" \
  -d '{"title": "Hi", "description": "Short", "category": "other"}' | jq
```

Expected: `400` with `errors.title` (too short) and `errors.description` (too short).

Invalid category:
```bash
curl -s -X POST http://localhost:3000/api/problems \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Valid title here",
    "description": "This is a long enough description to pass validation easily.",
    "category": "not-a-real-category"
  }' | jq
```

Expected: `400` with `errors.category`.

### 5. Test honeypot

```bash
curl -s -X POST http://localhost:3000/api/problems \
  -H "Content-Type: application/json" \
  -d '{
    "_honey": "I am a bot",
    "title": "Bot submission",
    "description": "This should be silently rejected by the honeypot check.",
    "category": "other"
  }' | jq
```

Expected: `200 { "success": true }` — but nothing is stored:
```bash
sqlite3 data/problems.db "SELECT COUNT(*) FROM problems WHERE title = 'Bot submission';"
# → 0
```

### 6. Test rate limiting

Submit 4 times in quick succession from the same IP:
```bash
for i in 1 2 3 4; do
  curl -s -X POST http://localhost:3000/api/problems \
    -H "Content-Type: application/json" \
    -d "{
      \"_honey\": \"\",
      \"title\": \"Rate limit test $i\",
      \"description\": \"Testing the in-memory rate limiter with submission number $i.\",
      \"category\": \"other\"
    }" | jq '.success, .message'
done
```

Expected: first 3 succeed, fourth returns `429` with `"Too many submissions..."`.

---

## What is not in this sprint

- No GET endpoint — no way to list or read submissions over HTTP
- No authentication on any endpoint
- No email notifications (planned in sprint 3A, not yet built)
- No Control Room integration
- No admin UI
- No user accounts
- No webhook or Slack notification

---

## Production notes

### The database is the only state

There is no cache, no external queue. If `data/problems.db` is deleted, all submissions are lost. On Hetzner: set `DATABASE_PATH` to a volume-mounted path that survives container/deploy cycles.

### Rate limiting resets on restart

The in-memory `Map` does not survive a process restart. If the server restarts, the per-IP rate limit counter resets. This is acceptable for MVP volumes. For persistent rate limiting: store timestamps in the `problems` table itself (query `COUNT(*)` WHERE `ip_address = ? AND created_at > ?`) rather than in memory.

### SQLite WAL mode

The database is opened with `journal_mode = WAL`. WAL (Write-Ahead Logging) allows concurrent reads while a write is in progress. Appropriate for a web server handling occasional concurrent requests. No configuration needed — it is set automatically on first open.

### Native binary

`better-sqlite3` compiles a native `.node` addon during `npm install`. The compiled binary is platform-specific. When deploying to Hetzner (Linux x64), run `npm install` on the server (or in the Docker build step) — do not copy `node_modules/` from macOS.

In the Next.js `standalone` output, native modules are copied correctly because `better-sqlite3` is listed in `serverExternalPackages` in `next.config.ts`.
