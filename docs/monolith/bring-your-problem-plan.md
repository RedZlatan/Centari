# Bring Your Problem — Feature Plan

**Type:** Feature planning — no implementation  
**Sprint:** 3A  
**Scope:** Form submission flow, storage, notifications, public/private handling, future problem board

---

## What this is

"Bring Your Problem" is the mechanism for organisations to submit a real operational problem to Centari. It is both a lead capture channel and a statement of position: Centari is a problem-solving company, not a software catalogue. The form is the first interaction a prospect has with that claim.

The feature has two distinct phases:

**Phase 1 (this plan):** Form submission → storage → email notification. Live as fast as possible. No custom admin UI. No public-facing output yet.

**Phase 2 (future):** A public problem board showing approved submissions. Centari's range and credibility, demonstrated through real problems from real organisations.

---

## User flow

```
1. ENTRY
   User arrives at the "Bring Your Problem" page.
   Entry points: Hero CTA, navigation, direct link.
   
2. CONTEXT
   A short framing paragraph explains what happens:
   - Centari reviews every submission personally
   - Response is not guaranteed, but problems that fit Centari's work will get one
   - Submissions can be kept private or shared publicly (opt-in)

3. FORM
   User fills in the form.
   No multi-step wizard — single page, visually grouped by section.
   
4. VALIDATION (client-side)
   Required fields checked before submission.
   Character limits and format validation shown inline.
   
5. SUBMISSION
   Form POST to API route.
   Server-side validation (re-validates everything client-side validation does).
   Spam checks run server-side.
   
   On success:
   → Submission written to storage
   → Confirmation email sent to submitter
   → Notification email sent to Centari team
   → Form replaced with confirmation state (no redirect)
   
   On validation failure:
   → Form preserved with field-level error messages
   → No email sent, nothing stored
   
   On server error:
   → Generic error message shown
   → Submission not stored
   → User can try again

6. CONFIRMATION
   Confirmation state replaces the form.
   No page navigation — in-place replacement.
   
7. OPTIONAL FOLLOW-UP
   Centari team reviews submission in Supabase dashboard.
   If a response is warranted: team emails the submitter directly from hello@centari.se.
   No automated follow-up sequence in Phase 1.
```

---

## Form fields

Presented in three visual sections. Section headers are visible to the user.

### Section 1 — About you

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| Full name | Text input | Yes | 2–100 chars |
| Email address | Email input | Yes | Valid email format |
| Organisation | Text input | Yes | 2–100 chars |
| Your role | Text input | No | Max 100 chars |

### Section 2 — The problem

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| Industry / sector | Select dropdown | Yes | From fixed enum (see below) |
| Describe the problem | Textarea | Yes | 80–3,000 chars |
| Timeline | Select or radio | Yes | From fixed enum (see below) |

**Sector options:**
```
Defence & security
Energy & utilities
Oil, gas & petrochemical
Manufacturing & industrial
Emergency response & civil protection
Infrastructure & transport
Maritime
Aviation
Research & education
Other
```

**Timeline options:**
```
Active — this is a problem we face right now
Near-term — within the next 6 months
Strategic — 12 months or more out
Exploratory — no specific timeline, researching options
```

### Section 3 — Sharing

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Visibility preference | Radio group | Yes | Private |
| Public display name | Text input | Conditional | Pre-filled from full name |

**Visibility options (radio):**
```
◉ Keep this private
  Only Centari will see this submission.

○ Share anonymously
  Your problem description and sector will be visible on our problem board.
  Your name and organisation will not be shown.

○ Share with attribution
  Your problem, sector, and the name below will be visible on our problem board.
```

`Public display name` field appears only when "Share with attribution" is selected. Pre-filled with the full name field value. Editable — a user might want to display their org name or a job title instead.

### Footer

- Privacy policy link (inline, opens in new tab)
- Submit button: label "Submit your problem"
- Honeypot field (hidden, see Spam protection section)

---

## Validation rules

### Client-side (immediate feedback, per field)

| Field | Rule | Error message |
|-------|------|---------------|
| Full name | Required | "Please enter your name." |
| Full name | 2–100 chars | "Name must be between 2 and 100 characters." |
| Full name | Pattern: letters, spaces, hyphens, apostrophes only | "Name contains invalid characters." |
| Email | Required | "Please enter your email address." |
| Email | Valid email format | "Please enter a valid email address." |
| Organisation | Required | "Please enter your organisation name." |
| Organisation | 2–100 chars | "Organisation name must be between 2 and 100 characters." |
| Role | Max 100 chars | "Role must be under 100 characters." |
| Sector | Required | "Please select a sector." |
| Problem description | Required | "Please describe the problem." |
| Problem description | Min 80 chars | "Please describe the problem in a little more detail (at least 80 characters)." |
| Problem description | Max 3,000 chars | "Problem description must be under 3,000 characters." |
| Timeline | Required | "Please select a timeline." |
| Public display name | Required if visibility = attributed | "Please enter a display name." |
| Public display name | Max 100 chars | "Display name must be under 100 characters." |

Character count shown live beneath the problem description textarea. Format: `347 / 3000`.

### Server-side (API route, re-validates everything above plus)

| Check | Behaviour on failure |
|-------|---------------------|
| All client-side validations | Return 400 with field-level errors |
| Honeypot field is empty | If non-empty: return 200 with fake success (silent rejection) |
| Submission time < 5 seconds since form render | Return 200 with fake success (bot likely) |
| Rate limit exceeded (3 per hour per IP) | Return 429: "Too many submissions. Please try again later." |
| Rate limit exceeded (5 per 24 hours per IP) | Return 429: same message |
| Sector value not in allowed enum | Return 400 |
| Timeline value not in allowed enum | Return 400 |
| Visibility value not in allowed enum | Return 400 |

**All server-side errors** preserve the form with the user's input intact. Nothing is lost on a failed submission.

---

## Spam protection

Three layers. No CAPTCHA in Phase 1 — the friction cost is too high for the brand register Centari is aiming for.

### Layer 1 — Honeypot field

A hidden text input named `website` (plausible enough that bots fill it in). Hidden from users via CSS using `position: absolute; left: -9999px; opacity: 0` — NOT `display: none` or `visibility: hidden`, which modern bots detect.

If the field is non-empty on submission: API returns 200 with the standard success response. No storage. No email. The submitter (bot) does not know the submission was rejected.

```html
<!-- In the form, outside the visible sections -->
<div aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">
  <label for="website">Leave blank</label>
  <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
</div>
```

### Layer 2 — Submission timing

The page sets a `form_rendered_at` hidden field on load (Unix timestamp, server-generated on the API request that serves the form, OR set client-side on DOMContentLoaded). If the elapsed time between rendering and submission is less than 5 seconds: silent rejection.

Real users take at minimum 15–30 seconds to read the context and type 80+ characters. 5 seconds is a generous threshold.

### Layer 3 — Rate limiting

Enforced in the API route, keyed by IP address. Use an in-memory store in development; a Redis instance (or Upstash, which has a generous free tier and a Next.js SDK) in production.

Limits:
- 3 submissions per IP per 60 minutes
- 5 submissions per IP per 24 hours

On limit breach: return 429 with user-visible message (not a silent rejection, since a real user who submitted on behalf of multiple people might hit this and should know to contact Centari directly).

### If volume warrants CAPTCHA later

Add hCaptcha (not Google reCAPTCHA — privacy posture). hCaptcha has a Next.js integration and a free tier. Add only if honeypot + timing + rate limiting proves insufficient.

---

## Storage option for MVP

### Recommended: Supabase (hosted Postgres)

**Why:** Supabase's free tier provides a hosted Postgres instance with a built-in dashboard. The dashboard is the admin review UI for Phase 1 — Centari reviews submissions by filtering and reading rows directly, with no need to build a custom admin interface. This eliminates one entire phase of work.

**Why not email-only:** Email-only storage means submissions are lost if email delivery fails, unsearchable, and inaccessible for the public problem board without significant reconstruction work later.

**Why not a custom Postgres instance:** Adds infrastructure management overhead before product value is proven. Migrate to self-hosted Postgres (on Hetzner, consistent with the rest of the stack) when warranted.

### Schema

One table: `problem_submissions`

```sql
CREATE TABLE problem_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Submitter
  full_name       text NOT NULL,
  email           text NOT NULL,
  organisation    text NOT NULL,
  role            text,

  -- Problem
  sector          text NOT NULL,
  description     text NOT NULL,
  timeline        text NOT NULL,

  -- Sharing preferences
  visibility      text NOT NULL DEFAULT 'private',
  -- Values: 'private' | 'public_anonymous' | 'public_attributed'
  display_name    text,
  -- Populated only when visibility = 'public_attributed'

  -- Centari review fields
  status          text NOT NULL DEFAULT 'new',
  -- Values: 'new' | 'reviewed' | 'responded' | 'archived' | 'approved_public'
  internal_notes  text,

  -- Spam/ops
  ip_address      text NOT NULL,
  user_agent      text
);
```

**Status transitions (Centari team manages in Supabase dashboard):**
```
new → reviewed (after first read)
reviewed → responded (after email reply sent)
reviewed → archived (no response warranted)
reviewed → approved_public (for visibility=public_* submissions deemed suitable for the board)
```

`approved_public` status is required before any submission is shown on the public board, regardless of the submitter's visibility preference. The submitter's opt-in is a necessary condition, not a sufficient one.

### API route pattern

```
POST /api/problems/submit

Request body: form fields
Response 200: { success: true }
Response 200 (silent rejection): { success: true }  ← honeypot/timing
Response 400: { error: "validation", fields: { ... } }
Response 429: { error: "rate_limit", message: "..." }
Response 500: { error: "server" }
```

---

## Email notifications

### Email service: Resend

**Why Resend:** Simple REST API and Next.js SDK, generous free tier (3,000 emails/month), supports sending from a custom domain. Configured to send from `hello@centari.se`.

Alternative if Centari already has SMTP configured: Nodemailer. Use Resend unless there is a specific reason not to.

### Email 1 — Submitter confirmation

**To:** submitter's email  
**From:** `Centari <hello@centari.se>`  
**Subject:** `We've received your problem`

Content:
```
[Submitter name],

We've received your submission and will review it personally.

Your problem:
[Problem description — first 300 chars, truncated with ellipsis if longer]

Sector: [sector]
Submitted: [date, formatted as "11 June 2026"]

If your problem aligns with what we're working on, we'll be in touch.

— Centari
hello@centari.se
```

Plain text. No HTML template in Phase 1. No branding elements. The tone is direct — this is not a marketing drip email.

No link to "manage your submission" or "unsubscribe from follow-up" in Phase 1 — the confirmation is a single transactional event with no follow-up series.

### Email 2 — Centari team notification

**To:** `hello@centari.se`  
**From:** `Centari Submissions <hello@centari.se>`  
**Subject:** `New problem submission — [sector] — [organisation]`

Content:
```
New submission via centari.se

Name:         [full_name]
Email:        [email]
Organisation: [organisation]
Role:         [role or "—"]
Sector:       [sector]
Timeline:     [timeline]
Visibility:   [visibility]

Problem:
[full description]

---
Submission ID: [uuid]
Review: [direct link to Supabase dashboard row, if a stable link can be constructed]
```

Plain text. The subject line format `[sector] — [organisation]` makes inbox triage fast without opening the email.

---

## Public/private problem handling

### Submitter's choices

Three options, explicitly presented in the form:

| Option | What it means | Storage value |
|--------|---------------|---------------|
| Private | Only Centari sees this submission. Never shown publicly. | `private` |
| Anonymous | Problem description and sector shown publicly. No name, no organisation. | `public_anonymous` |
| Attributed | Problem, sector, and display name shown publicly. | `public_attributed` |

The default is **private**. No user should end up with a public submission by accident. The public options require deliberate selection and a second read of the label.

### Centari's approval gate

Submitter opting into public sharing is a necessary condition. Centari still controls whether a submission appears on the public board.

A submission with `visibility = 'public_anonymous'` or `visibility = 'public_attributed'` only appears on the public board when the Centari team has set `status = 'approved_public'`. This happens in the Supabase dashboard — no custom admin UI needed.

This gate exists because:
- Some submissions may contain sensitive operational details the submitter intended to share but shouldn't
- Some submissions may be incomplete or unclear in a way that would represent the submitter poorly
- Quality of the public board matters — it should show real, substantive problems

### Data shown on the public board

| Field | Private | Anonymous | Attributed |
|-------|---------|-----------|------------|
| Problem description | No | Yes | Yes |
| Sector | No | Yes | Yes |
| Display name | No | No | Yes (submitter's chosen display name) |
| Organisation | No | No | No |
| Email | No | No | No |
| Submission date | No | Yes (month + year only) | Yes (month + year only) |

---

## Confirmation state

The form is replaced in-place with the confirmation message. No page navigation. No redirect. The user's scroll position is preserved.

### Confirmed state content

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Problem received.                                 │
│                                                    │
│  We review every submission personally.            │
│  If this is a problem Centari can help with,       │
│  we will be in touch.                              │
│                                                    │
│  A confirmation has been sent to [email].          │
│                                                    │
│  [Submit another problem ↗]                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

Tone notes:
- "Problem received" not "Thank you for your submission" — matches the directness of the rest of the site
- "We review every submission personally" sets an expectation without making a specific promise
- "If this is a problem Centari can help with" is honest about the selection — not every submission will receive a response
- No social sharing prompt — inconsistent with the serious/professional register

"Submit another problem" resets the form to its initial state.

### Error state

If the API returns a 500 (server error after form passes validation):

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Something went wrong.                             │
│                                                    │
│  Your submission was not received. Please try      │
│  again, or contact us directly at                  │
│  hello@centari.se.                                 │
│                                                    │
│  [Try again]                                       │
│                                                    │
└────────────────────────────────────────────────────┘
```

"Try again" resets to the form with the user's input preserved (populated from a held copy of the form state).

---

## Future: public problem board

Phase 2, defined here as structure for implementation when warranted.

### Purpose

A page showing approved public submissions. Demonstrates:
- The range of problems Centari works on
- The types of organisations that engage with Centari
- That the "Bring Your Problem" mechanism is active and used

The secondary value: a visitor who sees their own sector represented knows that Centari understands their context.

### URL

`/problems` — a first-class page, not buried under a subsection.

### Problem card structure

```
┌────────────────────────────────────────────────────┐
│  DEFENCE & SECURITY              [anonymous]        │
│                                                     │
│  We need to train teams for scenarios that are     │
│  too dangerous and too expensive to run in the     │
│  field. Our current simulation tooling doesn't     │
│  reflect the real environment closely enough...    │
│                                                     │
│  June 2026                                         │
└────────────────────────────────────────────────────┘
```

Attributed variant:
```
┌────────────────────────────────────────────────────┐
│  ENERGY & UTILITIES              J. Eriksson        │
│  ...
```

No "Read more" link in Phase 1 — the card shows the full description (up to a line clamp). If descriptions are long, a truncation with expand is viable but not required at launch.

### Page structure

```
/problems

  Heading: "Problems organisations have brought to us."
  Sub-copy: One sentence — factual, no puffery.

  [Filter by sector — dropdown, Phase 2b]

  Problem card grid
  — sorted by submission date descending

  CTA: "Bring yours →" [links to /problems/new or the form]
```

Phase 1 of the board: no filtering. Sorted chronologically. Cards only. The filter is added when the number of submissions makes sector filtering useful (rough threshold: 15+ approved public submissions).

### Data query for public board

```sql
SELECT
  sector,
  description,
  visibility,
  display_name,
  date_trunc('month', created_at) AS submitted_month
FROM problem_submissions
WHERE status = 'approved_public'
  AND visibility IN ('public_anonymous', 'public_attributed')
ORDER BY created_at DESC;
```

This query is safe — it structurally cannot return email, full name, organisation, or IP address.

### Considerations for the board

**Editing after submission:** A submitter may want to retract a public submission after the fact. This requires a mechanism — either a one-time edit token included in the confirmation email, or a manual request to hello@centari.se. For Phase 1, handle manually. For Phase 2b, include an edit token.

**Moderation queue:** If submission volume increases, Centari needs a review flow for the approval queue (submissions with visibility ≠ private that haven't been approved or rejected). This is a filter in the Supabase dashboard in Phase 1. A lightweight admin page is worth building once the queue exceeds ~5 submissions per week.

---

## Open questions

These require a decision before implementation begins.

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | What URL does the form live at? | `/bring-your-problem`, `/problems/new`, `/contact` | `/problems/new` — establishes the `/problems` namespace for the future board |
| 2 | Is "Bring Your Problem" the page heading, or does it live under a different label? | Keep the phrase, use a neutral heading like "Submit a problem" | Keep the phrase — it's distinctive and intentional |
| 3 | Resend or existing SMTP for email? | Resend, Nodemailer + SMTP | Resend unless Centari already has SMTP in use |
| 4 | Supabase region? | EU West (Ireland, eu-west-1) | EU West — consistent with likely Hetzner EU deployment, GDPR residency |
| 5 | Is a privacy policy needed before launch? | Short privacy statement inline on the form vs. full policy page | Minimum: inline statement covering what is stored and why. Full policy before the board is public. |
| 6 | What constitutes a response-worthy submission? | Any problem in Centari's domain vs. only high-fit leads | Define internally — this shapes how the team sets expectations when reviewing |

---

*This plan covers Phase 1 (form → storage → notification → confirmation) and defines the structure for Phase 2 (public board). Implementation sprints are separate.*
