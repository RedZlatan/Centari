# Control Room — Architecture Decisions

**Decided:** 2026-06-11  
**Resolves:** Open questions in `docs/sprints/sprint-1-2-control-room-plan.md`  
**Status:** Approved — binding for Phase 1 implementation

These five decisions must be resolved before Control Room Phase 1 begins. They are documented here as the authoritative record. If a decision is revisited, update this file and record why the original reasoning no longer holds.

---

## Decision 1 — Authentication library

**Decision: Auth.js v5 (`next-auth`), Credentials provider for Phase 1**

Email and password only in Phase 1. OAuth providers (Google Workspace, Microsoft Entra) are deferred to Phase 2.

### Rationale

Auth.js v5 is the App Router-native generation of NextAuth. It integrates directly with Next.js server actions and middleware, requires no separate auth server, and can be self-hosted on Hetzner without vendor dependency.

**Alternatives evaluated:**

| Option | Why rejected |
|--------|-------------|
| **Clerk** | Excellent developer experience but vendor-managed — user data lives on Clerk's servers, not ours. Conflicts with self-hosting intent and becomes expensive at scale. |
| **Auth0 / Okta** | Enterprise-grade but heavy setup, ongoing vendor cost, and more configuration surface than this phase requires. |
| **Custom implementation** | Too many security footguns (session fixation, timing attacks, token storage). Not justified when a maintained library exists. |
| **Better Auth** | Promising TypeScript-first library but less battle-tested than Auth.js for production B2B use. Revisit in future if Auth.js proves limiting. |

### OAuth deferral reasoning

Every Centari customer is a vetted organisation — not a consumer signing up from a landing page. OAuth reduces friction for end-users, but for Phase 1 the friction of email/password is acceptable for a small, known user base. When enterprise customers require SSO (Google Workspace, Microsoft Entra ID, SAML), Auth.js adds providers with minimal architectural change — the decision to defer does not create rework.

### Consequences

**Easier:** Self-hosted deployment on any Node.js server, no per-seat auth cost, full control over user data, provider additions are additive changes.

**Harder:** No passwordless or social login in Phase 1 — users must manage a password. Invitation flow requires email delivery infrastructure from day one.

### Implementation note

Auth.js is configured with a database adapter (Drizzle or Prisma — see Decision 2 on sessions). The Credentials provider validates email/password against a bcrypt-hashed `password_hash` field on the `User` entity. Password reset uses a short-lived, single-use token delivered by email.

---

## Decision 2 — Session strategy

**Decision: Auth.js database sessions (`strategy: "database"`)**

Sessions are stored as rows in a `sessions` table. A signed, httpOnly cookie contains a session token that references the row. No sensitive data is stored in the cookie.

### Rationale

The core question is revocation. When an organisation admin removes a user, when a Centari account manager suspends an organisation, or when a user's role changes, the effect must be immediate. JWT-based sessions cannot be revoked without a server-side denylist — at which point the statefulness has been reintroduced anyway, but with more complexity.

For a platform where users may have billing access or control over operational hardware, immediate revocation is not optional.

**Stateless JWT argument dismissed:** The primary advantage of stateless JWTs is edge deployability — no database read on each request. Centari's deployment target is a Hetzner server running a Node.js process. There is no edge constraint to optimise for. A database session lookup on each request is negligible.

**Cookie configuration:**

```
HttpOnly: true      — not accessible to JavaScript
Secure:   true      — HTTPS only
SameSite: Strict    — no cross-site transmission
Path:     /control-room
```

The cookie scope is `/control-room`, not `/` — session cookies are never sent with requests to the public site.

### Consequences

**Easier:** Immediate session revocation, clear audit trail of active sessions, no JWT expiry window issues, session introspection (active users per org).

**Harder:** Every authenticated request requires a database read to validate the session. At normal B2B scale this is not measurable; at very high request volume a Redis session cache can be introduced without changing the session model.

### Implementation note

Auth.js manages the `sessions` table automatically when a database adapter is configured. Session expiry is set to 30 days, sliding on activity. The session record holds `userId` and `expires` only — all user and org context is loaded from the database on session validation, not stored in the session.

---

## Decision 3 — Organisation creation

**Decision: Centari-initiated only — no public self-serve signup in v1**

Organisations are created by Centari account managers in the admin panel. The invited organisation admin receives an email with a one-time token to complete registration.

### Flow

```
1. Centari account manager (Super Admin role) creates org in admin panel
      — enters: org name, billing email, first admin's email address

2. System creates:
      — Organisation record (status: trial or active)
      — Membership record (user_id: pending, role: admin, status: pending)
      — Invitation token (one-time, expires 72 hours)

3. Invitation email sent to the admin's email address

4. Admin clicks link → sets password → session created → lands in Control Room

5. Admin may then invite additional users from within their org
```

### Rationale

Centari sells hardware and software to vetted organisations — not consumers. There is no landing page signup funnel, no free tier, and no use case for an anonymous visitor registering an organisation. Every customer relationship begins with a sales or account management interaction.

Self-serve signup introduces: spam and abuse surface, email verification complexity, payment gate logic, org deduplication problems, and support overhead for abandoned accounts. None of this is justified for Phase 1.

### Self-serve upgrade path

When the business requires it (e.g., a future SMB tier or a lighter product with self-serve purchasing), the invitation system extends naturally: an org creation form behind a payment step issues the same invitation token flow. No architectural change is needed — only a new entry point to the existing flow.

### Consequences

**Easier:** No public auth surface, no spam/abuse management, clean org data (every org is a real customer), simple implementation.

**Harder:** Every new customer requires a manual step from Centari staff. Acceptable for the current sales motion; becomes a bottleneck if volume increases significantly.

---

## Decision 4 — Multi-tenancy isolation

**Decision: Application-level `organisation_id` scoping as the primary defence. PostgreSQL row-level security documented as the upgrade path.**

### The rule

Every function that reads or writes customer data must receive `organisationId` as an explicit, typed parameter. Every query that touches a tenant-scoped table must include `WHERE organisation_id = $organisationId`. The authenticated user's `organisationId` is loaded once at session validation and threaded through the request context — it is never derived from user-supplied input.

### What this looks like in practice

```typescript
// Correct — org context comes from verified session
async function getDevices(db: DB, organisationId: string) {
  return db.query.hardwareDevices.findMany({
    where: eq(hardwareDevices.organisationId, organisationId),
  })
}

// Wrong — never trust client-supplied org context
async function getDevices(db: DB, req: Request) {
  const orgId = req.body.organisationId  // ← never do this
  ...
}
```

The ORM (Drizzle or Prisma) enforces the type — queries on tenant-scoped tables will not compile without the `WHERE` clause. Code review must treat any query on a tenant table without an explicit `organisationId` filter as a security bug.

### Why not PostgreSQL RLS in Phase 1

PostgreSQL RLS is genuinely safer — it makes tenant escape structurally impossible at the database level. However, it introduces complexity that is premature for Phase 1:

- RLS requires setting `SET LOCAL app.current_org_id = ?` at the connection level before each query
- Connection poolers (PgBouncer) operate in transaction or statement mode, where session-level settings do not persist between queries — this requires careful configuration or a pool-per-tenant approach
- Debugging RLS policy failures is harder than debugging a missing `WHERE` clause
- At Phase 1 team size and org count, disciplined application-level scoping is auditable and sufficient

### RLS upgrade path

When org count, compliance requirements, or a security review determines that application-level scoping is insufficient as the sole defence, RLS policies can be layered on top without changing application code — provided the application layer is already clean. The policies become a safety net, not the primary mechanism.

The migration path:
1. Add `SET app.current_org_id` to the connection setup in the ORM adapter
2. Write RLS policies on each tenant-scoped table
3. Enable RLS: `ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY`
4. Test that application queries still work — if they do, the application scoping was already correct

### Consequences

**Easier:** Straightforward to implement, debug, and test; no connection pooler complexity; clear code audit surface.

**Harder:** Application-level filtering is vulnerable to bugs (missing `WHERE` clause). Mitigated by: TypeScript types that require org context, automated tests that assert cross-tenant data isolation, and code review policy treating missing filters as security defects.

---

## Decision 5 — Application structure

**Decision: Protected routes within the same Next.js application. Separation only when concrete complexity demands it.**

### Route structure

```
app/
├── (public)/
│   ├── layout.tsx          public site layout
│   └── page.tsx            homepage
├── control-room/
│   ├── layout.tsx          auth check + Control Room shell layout
│   ├── login/
│   │   └── page.tsx
│   └── (dashboard)/
│       ├── layout.tsx      dashboard layout (sidebar, header)
│       ├── page.tsx        dashboard home
│       ├── licences/
│       ├── hardware/
│       ├── downloads/
│       └── tickets/
└── middleware.ts            session guard for /control-room/* paths
```

### Middleware responsibility

`middleware.ts` intercepts every request to `/control-room/*`. If no valid session exists, it redirects to `/control-room/login`. The middleware does not load full user context — it verifies the session token exists and is not expired. Full user and org context is loaded in `control-room/layout.tsx` as a server component, once per navigation.

```typescript
// middleware.ts — session guard only
export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('next-auth.session-token')
  if (!sessionToken && request.nextUrl.pathname.startsWith('/control-room')) {
    return NextResponse.redirect(new URL('/control-room/login', request.url))
  }
}

export const config = {
  matcher: ['/control-room/:path*'],
}
```

### Why same application

- Shared design tokens, Container, and typography system — no duplication
- One deployment, one `next build`, one SSL certificate
- One codebase for the team to maintain at current scale
- No cross-origin complexity for API routes or auth cookies

### Separation trigger

Split into a separate Next.js application when one of the following becomes true:

1. The public site needs to be deployed to a static CDN (Cloudflare Pages, Vercel Edge) while the Control Room requires a persistent server — these have incompatible deployment requirements
2. The team grows to a size where separate repositories reduce coordination cost
3. The public site build time is materially slowed by the Control Room's complexity

The route group structure (`(public)` vs `control-room/`) is already the correct split boundary. Extraction is a mechanical operation when the trigger arrives.

### Consequences

**Easier:** One deployment unit, shared components, no cross-origin auth complexity, simpler local development.

**Harder:** A large-scale Control Room and public site in one repo can slow `next build` as both grow. Acceptable for the current phase; revisit when build times exceed two minutes.

---

## Summary

| Question | Decision |
|----------|----------|
| Auth library | Auth.js v5, Credentials provider (email/password) — OAuth deferred to Phase 2 |
| Session strategy | Auth.js database sessions — httpOnly cookie, server-side storage, immediate revocability |
| Org creation | Centari-initiated via admin panel + email invitation — no public signup in v1 |
| Multi-tenancy | Application-level `organisation_id` scoping — RLS documented as upgrade path |
| App structure | Same Next.js app, protected routes under `/control-room/*`, middleware session guard |

---

*This document supersedes the open questions section of `docs/sprints/sprint-1-2-control-room-plan.md`. Implementation of Phase 1 may begin once these decisions are reviewed and approved.*
