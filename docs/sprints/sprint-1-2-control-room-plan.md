# Sprint 1.2 — Control Room Architecture Plan

**Status:** Planning  
**Type:** Architecture document — no implementation  
**Scope:** Defines the data model, access model, and phased implementation plan for the Centari Control Room platform.

---

## What is the Control Room

The Control Room is Centari's authenticated customer portal. It is the operational centre for organisations that use Centari products — the place where licences are managed, hardware is tracked, software is downloaded, and support is handled.

It is not a product itself. It is the infrastructure layer that connects customers to the Centari product ecosystem.

**URL surface (future):** `/control-room` — the entry point already exists as a placeholder CTA on the homepage.

---

## 1. User roles

Two layers: **Centari internal staff** and **organisation-level customer roles**.

### Centari internal

| Role | Access |
|------|--------|
| **Super Admin** | Full platform access. Can read/write all organisations, impersonate any user, manage products and release channels, override licence states. |
| **Support Agent** | Can view all organisation data and ticket history. Can write ticket responses and internal notes. Cannot modify licences or billing. |
| **Account Manager** | Can manage licences, organisation status (trial/active/suspended), and billing records for assigned accounts. |

### Organisation-level (customer)

| Role | Access |
|------|--------|
| **Admin** | Full organisation management: invite/remove users, assign roles, manage licences, register hardware, raise tickets. Receives billing notifications. |
| **Operator** | Access to all licensed products and their downloads. Can register hardware. Can raise and view tickets. Cannot manage users or billing. |
| **Viewer** | Read-only access to the organisation dashboard, hardware list, and licence summary. Cannot download software or raise tickets. |

**Rules:**
- An organisation must have at least one Admin at all times.
- A user may belong to multiple organisations with different roles in each.
- Centari internal roles are entirely separate from organisation roles — no overlap in the permission system.

---

## 2. Organisation model

Organisations are the primary billing and licensing unit. Every customer interaction is anchored to an organisation, not an individual.

### Organisation states

| State | Description |
|-------|-------------|
| `trial` | Time-limited access, no hardware registration, reduced download access |
| `active` | Full access according to purchased licences |
| `suspended` | Access frozen — overdue payment or policy violation |
| `churned` | Closed account, data retained for legal/audit period |

### Organisation attributes

```
Organisation
  id                  UUID
  name                String
  slug                String (unique, used in URLs)
  billing_email       String
  country             ISO 3166-1 alpha-2
  vat_number          String? (nullable)
  status              Enum: trial | active | suspended | churned
  trial_ends_at       DateTime?
  created_at          DateTime
  updated_at          DateTime
```

### Membership (User ↔ Organisation)

A user is connected to an organisation through a Membership record. This is the correct place for role assignment — not on the User entity, which is role-agnostic.

```
Membership
  id                  UUID
  user_id             → User
  organisation_id     → Organisation
  role                Enum: admin | operator | viewer
  invited_by_user_id  → User?
  invited_at          DateTime
  accepted_at         DateTime?
  status              Enum: pending | active | revoked
```

---

## 3. Dashboard modules

The Control Room home view is composed of discrete modules. Each module is independently loadable and conditionally rendered based on the user's role and the organisation's active licences.

### Module inventory

| Module | Visible to | Description |
|--------|-----------|-------------|
| **System status** | All | Live or last-known status of licensed products and registered devices. Shows counts: devices online, open tickets, licence expiry warnings. |
| **Licence overview** | Admin, Operator | Summary of active licences per product, seat usage, and expiry dates. Link to full licence management. |
| **Recent downloads** | Admin, Operator | Last 3–5 downloads by the user or organisation. Link to the full downloads centre. |
| **Hardware summary** | Admin, Operator | Count of registered devices by type and status (active/offline/maintenance). Link to full inventory. |
| **Open tickets** | Admin, Operator | Count and list of unresolved tickets. Link to ticket centre. |
| **Quick actions** | Admin | Invite user, register device, renew licence, open ticket. |
| **Announcements** | All | Centari platform announcements, maintenance windows, product release notes. Authored by Centari staff. |

### Layout

Dashboard modules are arranged in a responsive grid. Layout is role-aware at render time — a Viewer sees System Status and Announcements only. Module visibility is driven by the organisation's active licence set, not hardcoded per role.

---

## 4. Downloads model

Software, firmware, and installer distribution gated by active licences.

### Structure

Each Centari product has one or more **download channels**. Each channel has versioned **releases**. Each release has one or more **assets** (platform-specific binaries or firmware packages).

```
DownloadChannel
  id              UUID
  product_id      → Product
  name            String           e.g. "Stable", "Beta", "Edge"
  slug            Enum: stable | beta | edge
  description     String?

DownloadRelease
  id              UUID
  channel_id      → DownloadChannel
  version         String           semver: "2.4.1"
  release_notes   Text (markdown)
  released_at     DateTime
  is_latest       Boolean
  is_yanked       Boolean          set true if release recalled

DownloadAsset
  id              UUID
  release_id      → DownloadRelease
  platform        Enum: windows | linux | macos | firmware | other
  label           String           e.g. "Windows x64 Installer"
  filename        String
  size_bytes      BigInt
  sha256          String
  download_url    String           signed URL or internal path
```

### Access rules

- A user can only download assets for products their organisation is actively licensed for.
- `edge` channel access requires an explicit `allow_edge_channel` flag on the licence.
- Download events are logged to the audit log with asset ID and user ID.
- Yanked releases are hidden from download lists but retained for audit.

### Download centre UX (planned)

- Grouped by product, then channel
- "Latest stable" prominently surfaced
- Changelog visible before downloading
- SHA-256 checksum shown alongside each asset
- Download history per user

---

## 5. Hardware inventory model

Physical devices registered to an organisation — XR headsets, edge compute units, sensor arrays, custom hardware.

### Device lifecycle

`unregistered → registered → active → maintenance | offline → decommissioned`

### Device entity

```
HardwareDevice
  id                  UUID
  organisation_id     → Organisation
  serial_number       String (unique within Centari)
  device_type         Enum: xr_headset | edge_compute | sensor_array |
                            workstation_unit | custom
  model               String           e.g. "Centari Edge Node v2"
  firmware_version    String?
  status              Enum: active | offline | maintenance | decommissioned
  assigned_to_user_id → User?          current operator
  location_label      String?          free text: "Site A — Rack 3"
  registered_at       DateTime
  last_seen_at        DateTime?        populated by device telemetry
  notes               Text?
```

### Registration flow

1. Operator enters serial number (printed on device)
2. System verifies serial against Centari's device registry (internal — not modelled here)
3. Device appears in organisation's inventory with status `active`
4. Optionally assigned to a user and/or given a location label

### Considerations

- Device telemetry (`last_seen_at`, firmware version) will eventually be pushed by the devices themselves via an API — this is a future sprint and outside the Control Room frontend scope.
- Hardware inventory is display-only initially; commands/remote management are a separate system (possibly `Forge` or `Workstation`).

---

## 6. Ticket model

Support, hardware fault reports, and billing queries — unified under one ticket system.

### Ticket entity

```
Ticket
  id                    UUID
  organisation_id       → Organisation
  created_by_user_id    → User
  assigned_to_user_id   → User?        Centari support agent
  type                  Enum: support | hardware_fault | billing | feature_request
  priority              Enum: low | medium | high | critical
  status                Enum: open | in_progress | awaiting_customer |
                               awaiting_centari | resolved | closed
  subject               String
  product_id            → Product?     if product-related
  device_id             → HardwareDevice?   if hardware-related
  created_at            DateTime
  updated_at            DateTime
  resolved_at           DateTime?
  sla_deadline_at       DateTime?      computed from priority at creation time
```

### Ticket message

```
TicketMessage
  id                UUID
  ticket_id         → Ticket
  author_user_id    → User
  body              Text (markdown)
  is_internal       Boolean      true = Centari-only note, hidden from customer
  attachments       JSON[]       { filename, url, size_bytes }
  created_at        DateTime
```

### Priority SLA targets (suggested)

| Priority | First response | Resolution target |
|----------|---------------|------------------|
| Critical | 1 hour | 4 hours |
| High | 4 hours | 1 business day |
| Medium | 1 business day | 3 business days |
| Low | 2 business days | 10 business days |

### Ticket rules

- Only Admins and Operators can create tickets.
- Hardware fault tickets must reference a registered device from the organisation.
- `is_internal` messages are only visible to Centari staff — never to the customer.
- Closing a ticket archives it but retains full message history.
- Reopening a closed ticket resets status to `open` and notifies the assigned agent.

---

## 7. Licence model

Licences connect an organisation to a Centari product. They are the access control primitive — if no active licence exists for a product, that product is inaccessible in the Control Room.

### Licence types

| Type | Description |
|------|-------------|
| `seat` | N named users may use the product simultaneously |
| `device` | N registered devices may run the product |
| `site` | Unlimited users/devices within one physical site |
| `enterprise` | Unlimited users/devices across all org sites |

### Licence entity

```
Licence
  id                    UUID
  organisation_id       → Organisation
  product_id            → Product
  licence_type          Enum: seat | device | site | enterprise
  seat_count            Int?          for seat licences
  device_count          Int?          for device licences
  starts_at             DateTime
  expires_at            DateTime?     null = perpetual (rare)
  is_active             Boolean       computed: starts_at ≤ now < expires_at
  allow_edge_channel    Boolean       grants access to edge download channel
  notes                 String?       internal notes (Centari staff only)
  created_by_user_id    → User        Centari account manager who issued it
```

### Licence assignment

```
LicenceAssignment
  id                    UUID
  licence_id            → Licence
  assignee_type         Enum: user | device
  user_id               → User?
  device_id             → HardwareDevice?
  assigned_at           DateTime
  assigned_by_user_id   → User
  revoked_at            DateTime?
```

### Licence logic

- A licence is considered **active** only when `is_active = true` AND `expires_at` is in the future (or null).
- Seat licences require explicit assignment — a user does not automatically consume a seat by belonging to the organisation.
- Licence expiry warnings are surfaced 30 days and 7 days before `expires_at`.
- Expired licences lock product access but do not delete data.

---

## 8. Future store and account integration

The Control Room is the natural home for commercial self-service. These features are explicitly out of scope until a payment processor and billing architecture are decided, but the data model above is designed to accommodate them.

### Planned capabilities

**Licence management (self-service)**
- Extend or renew existing licences before expiry
- Purchase additional seats on an active seat licence
- Upgrade from seat → device → enterprise licence
- Add `allow_edge_channel` to an existing licence

**Hardware ordering**
- Browse and configure Centari hardware
- Submit purchase orders (linked to organisation)
- Track fulfilment and register shipped devices on arrival

**Billing and invoicing**
- View invoice history
- Download PDF invoices
- Update payment method
- VAT/tax ID management

### Integration points

The store will require an external payment processor. Stripe is the likely choice given API quality and B2B feature set (invoicing, subscriptions, tax handling). This decision is deferred — no payment infrastructure should be built until the first commercial transaction is near.

Account management (SSO, SAML, directory sync for enterprise customers) is also deferred.

---

## 9. Suggested database entities — summary

```
User
Organisation
Membership                (User ↔ Organisation, with role)

Product                   (Forge, Mission, Twin, Insight, Workstation, Lab)
Licence                   (Organisation ↔ Product, with type and dates)
LicenceAssignment         (Licence → User or HardwareDevice)

HardwareDevice            (registered to Organisation)

DownloadChannel           (Product → channel)
DownloadRelease           (Channel → versioned release)
DownloadAsset             (Release → platform-specific binary)

Ticket                    (Organisation → support request)
TicketMessage             (Ticket → message thread)

AuditLog                  (append-only: actor, action, resource, timestamp)
Announcement              (authored by Centari staff, visible to all)
```

**Recommended database:** PostgreSQL. The relational model here is well-normalised and benefits from foreign key constraints, enum types, and full-text search (for tickets). A document store would be a poor fit for this schema.

**ORM:** Drizzle or Prisma — decision deferred to implementation sprint.

**Audit log** should be treated as append-only from day one. No `UPDATE` or `DELETE` on `AuditLog` rows. If using PostgreSQL, a `INSERT`-only role for the audit table enforces this at the database level.

---

## 10. Implementation phases

Each phase is a discrete sprint. Phases must be completed in order — each depends on the foundation laid by the previous.

### Phase 1 — Auth and organisation shell
*Prerequisite for everything else.*

- Email + password authentication (no OAuth in Phase 1 — deferred)
- Session management (JWT or server-side session)
- Organisation creation flow (Centari-initiated for now, not self-service)
- User invitation by email
- Role assignment (Admin, Operator, Viewer)
- Basic authenticated shell: header, sidebar, user menu
- `/control-room` route renders the authenticated dashboard shell
- Centari super admin panel: list organisations, impersonate user

**Does not include:** SSO, SAML, self-serve org creation, OAuth providers.

### Phase 2 — Licence management and access control
*Depends on: Phase 1*

- Centari account manager creates and assigns licences to organisations
- Organisation admins view active licences per product
- Licence expiry warnings surfaced on dashboard
- Access gating: product tiles disabled if no active licence
- LicenceAssignment: admin assigns seats to users
- Seat usage counter visible on licence detail

**Does not include:** self-service licence purchase, payment.

### Phase 3 — Downloads centre
*Depends on: Phase 2 (access must be licence-gated)*

- Product download pages, grouped by channel
- Latest stable release surfaced prominently
- Changelog per release
- SHA-256 checksum display
- Download events logged to AuditLog
- Yanked releases hidden (but retained)
- Edge channel access gated by `allow_edge_channel` licence flag

### Phase 4 — Hardware inventory
*Depends on: Phase 1 (org context required)*

- Device registration by serial number
- Device list view: type, model, firmware version, status, assigned user
- Assign device to user
- Add location label
- Status transitions: active → maintenance → decommissioned
- Hardware fault ticket shortcut from device detail view

**Does not include:** remote telemetry, device commands.

### Phase 5 — Ticket system
*Depends on: Phase 1 (user identity), Phase 4 (hardware reference)*

- Ticket creation: type, priority, subject, description
- Hardware fault tickets reference a registered device
- Message thread with markdown support
- File attachments (images, logs)
- Internal notes (Centari staff only)
- Status workflow with email notifications at key transitions
- Centari support agent view: all tickets across all organisations
- SLA deadline display per ticket

### Phase 6 — Store and self-service billing
*Depends on: Phase 2 (licence model), payment processor decision*

- Licence renewal flow
- Seat expansion
- Payment method management
- Invoice history and PDF download
- Hardware order form (linked to org)

---

## Open questions

These must be answered before Phase 1 begins:

1. **Auth strategy** — Email/password only for Phase 1, or include Google/Microsoft OAuth from the start? OAuth significantly reduces friction for enterprise users but adds complexity.

2. **Session approach** — JWT (stateless, fits edge deployment) or server-side sessions (easier revocation)? Matters for Hetzner deployment architecture.

3. **Org creation** — Is org creation always Centari-initiated (account manager creates, then invites the customer admin), or should there be a self-serve signup flow?

4. **Multi-tenancy isolation** — Row-level security in PostgreSQL (recommended) or application-level tenancy filtering? Both work; RLS is safer but adds schema complexity.

5. **Control Room hosting** — Same Next.js app as the public site (protected routes), or a separate application? Separate app is cleaner for security isolation and deployment independence; same app is simpler initially.

---

*Implementation begins in a future sprint. This document is the single source of truth for Control Room architecture decisions until superseded by a more detailed spec or ADR.*
