# Control Room — Information Architecture

**Type:** Information architecture — no implementation  
**Depends on:** `docs/sprints/sprint-1-2-control-room-plan.md`, `docs/architecture/control-room-decisions.md`

This document defines the complete structure of the Control Room: every page, every section, every module, every card type, and the relationships between them. It is the reference an implementer works from.

---

## Application shell

The Control Room has a fixed shell into which all content is rendered.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                             │
│  [CENTARI]   [Organisation name ▾]        [🔔 N]  [Avatar ▾]       │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  [Alert banner — dismissible, conditional]               │
│  SIDEBAR ├──────────────────────────────────────────────────────────┤
│          │                                                          │
│  nav     │                MAIN CONTENT AREA                        │
│  items   │                                                          │
│          │  [Breadcrumb]                                            │
│          │  [Page header]                                           │
│          │  [Page content]                                          │
│          │                                                          │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Topbar

| Element | Description |
|---------|-------------|
| `CENTARI` wordmark | Links to `/control-room/dashboard` |
| Organisation name | Current org switcher — dropdown if user belongs to multiple orgs |
| Notification bell | Badge with unread count. Opens notification panel. |
| Avatar | User menu: Account settings, Switch org, Sign out |

### Sidebar navigation

```
Dashboard
Products
  ├── Forge
  ├── Mission
  ├── Twin
  ├── Insight
  ├── Workstation
  └── Lab
Hardware
Downloads
Support
──────────────
Team              [Admin only]
Settings
```

Products sub-items are visible by default. The sidebar collapses on narrow viewports.

### Alert banner

Rendered between topbar and content, above everything else. One banner at a time; highest severity wins.

| Condition | Severity | Copy |
|-----------|----------|------|
| Licence expiring in ≤30 days | Amber | `Licence for [Product] expires in [N] days.` |
| Licence expiring in ≤7 days | Red | `Licence for [Product] expires in [N] days.` |
| Licence expired | Red | `Your licence for [Product] has expired. Access to downloads is suspended.` |
| Organisation suspended | Red, non-dismissible | `Your organisation's access has been suspended. Contact hello@centari.se` |

---

## Navigation tree

Full URL hierarchy for the customer portal. Role constraints noted inline.

```
/control-room
│
├── /dashboard                          All roles
│
├── /products                           All roles (unlicensed shown greyed)
│   ├── /products/forge                 All roles
│   │   └── tabs: Overview | Licence | Downloads | Users
│   ├── /products/mission               All roles
│   ├── /products/twin                  All roles
│   ├── /products/insight               All roles
│   ├── /products/workstation           All roles
│   └── /products/lab                   All roles
│
├── /licences                           Admin, Operator (read)
│   └── /licences/[id]                  Admin (manage), Operator (read)
│
├── /hardware                           Admin, Operator, Viewer (read)
│   ├── /hardware/register              Admin, Operator
│   └── /hardware/[device-id]           Admin, Operator, Viewer (read)
│       └── tabs: Overview | History | Tickets
│
├── /downloads                          Admin, Operator
│   └── /downloads/[product-slug]       Admin, Operator (licence-gated)
│       └── /downloads/[slug]/[version] Admin, Operator
│
├── /support                            Admin, Operator
│   ├── /support/new                    Admin, Operator
│   └── /support/[ticket-id]            Admin, Operator
│
├── /team                               Admin only
│   ├── /team/invite                    Admin only
│   └── /team/[user-id]                 Admin only
│
└── /settings
    ├── /settings/account               All roles (own account)
    ├── /settings/notifications         All roles
    ├── /settings/organisation          Admin only
    └── /settings/billing               Admin only [future]
```

### Centari internal admin panel

Accessible only to Centari staff roles (Super Admin, Support Agent, Account Manager). Rendered inside the same shell with a distinct admin context indicator.

```
/control-room/admin
│
├── /admin/organisations                All staff roles (read), Super Admin (write)
│   └── /admin/organisations/[id]       Staff detail view with impersonation
│
├── /admin/licences                     Super Admin, Account Manager
│   └── /admin/licences/new             Account Manager, Super Admin
│
├── /admin/releases                     Super Admin
│   ├── /admin/releases/new             Super Admin
│   └── /admin/releases/[id]            Super Admin (publish, yank)
│
├── /admin/tickets                      All staff roles
│   └── /admin/tickets/[id]             Support Agent (respond, internal notes)
│
├── /admin/devices                      Super Admin, Account Manager
│
├── /admin/announcements                Super Admin
│   └── /admin/announcements/new        Super Admin
│
└── /admin/users                        Super Admin (search all users)
```

---

## Page hierarchy

Every page: its purpose, primary content, secondary content, and available actions per role.

---

### Dashboard `/dashboard`

**Purpose:** Entry point. At-a-glance status and navigation to active work.

**Content:**
- [Conditional] Alert banner (see shell definition)
- Status strip — four stat tiles in one row
- Module grid — role-dependent (see Dashboard layout section)

**Status strip tiles:**

| Tile | Value shown | Click target |
|------|-------------|-------------|
| Active licences | N of N products licensed | `/licences` |
| Devices online | N / total registered | `/hardware` |
| Open tickets | N open tickets | `/support` |
| Expiring soon | N licences within 30 days | `/licences` |

---

### Products overview `/products`

**Purpose:** Show the full Centari product ecosystem and each product's licence status for this organisation.

**Content:**
- Page heading: "Products"
- 6 product cards in a 3-column grid
- Unlicensed products rendered in a de-emphasised state with a contact prompt

**Actions by role:**

| Action | Admin | Operator | Viewer |
|--------|-------|----------|--------|
| View product cards | ✓ | ✓ | ✓ |
| Open product detail | ✓ | ✓ | ✓ |
| Access downloads | ✓ | ✓ (licensed only) | ✗ |

---

### Product detail `/products/[slug]`

**Purpose:** All information about a single product and this organisation's access to it.

**Tabs:**

| Tab | Content | Roles |
|-----|---------|-------|
| **Overview** | Product name, one-sentence description, current version, links to docs | All |
| **Licence** | Licence type, seats or device count, expiry, assignment list | Admin: full; Operator: read; Viewer: read |
| **Downloads** | Latest release card + release history for this product | Admin, Operator (licence required) |
| **Users** | Team members with an active licence assignment for this product | Admin only |

**Breadcrumb:** Products › [Product name]

---

### Licences `/licences`

**Purpose:** Global view of all licences held by this organisation.

**Content:**
- Page heading: "Licences"
- Filter: by product, by status (active / expiring / expired / trial)
- Licence card list — one per active licence
- Expired licences: collapsed section, expandable

**Actions by role:**

| Action | Admin | Operator | Viewer |
|--------|-------|----------|--------|
| View all licences | ✓ | ✓ | Summary only |
| Manage assignments | ✓ | ✗ | ✗ |
| View assignment history | ✓ | ✗ | ✗ |

---

### Licence detail `/licences/[id]`

**Purpose:** Full detail of one licence: who has it, history of changes.

**Content:**
- Licence header: product name, type badge, status, expiry date
- Seat/device usage bar (if applicable)
- Edge channel access indicator
- Assignment list: name, email, role, assigned date, assigned by
- Unassign action (Admin only)
- Assign to additional user (Admin only, if seats available)
- History section: all assignment changes, creation, modifications

**Breadcrumb:** Products › [Product] › Licence

---

### Hardware inventory `/hardware`

**Purpose:** Full list of devices registered to this organisation.

**Content:**
- Page heading: "Hardware"
- Filter bar: by type, by status, by assigned user, free text search
- Sort: name, type, status, last seen, firmware version
- Device card list
- "Register device" button (Admin, Operator)
- Empty state: "No devices registered." + register prompt

---

### Device detail `/hardware/[id]`

**Purpose:** Full information about one device, its history, and related support tickets.

**Tabs:**

| Tab | Content |
|-----|---------|
| **Overview** | All device attributes: serial, type, model, firmware, status, assigned user, location label, registered date |
| **History** | Timeline of events: firmware updates, status changes, assignment changes, maintenance windows |
| **Tickets** | All tickets that reference this device. Status badges. Link to each ticket. |

**Actions:**
- Edit device (name, assigned user, location label) — Admin, Operator
- Change status → maintenance / decommission — Admin
- Open ticket for this device — Admin, Operator (pre-fills device reference)

**Breadcrumb:** Hardware › [Serial number or name]

---

### Hardware registration `/hardware/register`

**Purpose:** Register a new device by serial number.

**Content:**
- Single-step form: serial number input
- Serial number is verified against Centari's device registry on submission
- If valid: device type and model pre-filled from registry; user adds optional name, location label, assignee
- If invalid: clear error — serial not found in registry
- Submit creates device record with status `active`

---

### Downloads centre `/downloads`

**Purpose:** Software, firmware, and installer distribution for all licensed products.

**Content:**
- Page heading: "Downloads"
- Product tabs: one per licensed product (unlicensed products not shown)
- For each product: channel selector (Stable / Beta / Edge)
  - Edge channel only visible if `allow_edge_channel` is enabled on the licence
- Latest release: prominent card with all assets
- Previous releases: collapsed list below latest

---

### Product downloads `/downloads/[product-slug]`

**Purpose:** All releases for one product across channels.

**Content:**
- Product name header
- Channel selector tabs: Stable | Beta | Edge (conditional)
- Latest release: full card with assets, release notes, checksums
- Previous releases: compact list (version, date, platform badges)

---

### Release detail `/downloads/[product-slug]/[version]`

**Purpose:** Full detail for one specific release, including all assets and complete release notes.

**Content:**
- Version number + release date
- Channel badge + latest / previous indicator
- Full release notes (markdown rendered)
- Asset list: one download card per platform asset
- Each asset: platform, filename, file size, SHA-256 checksum (collapsed by default)
- Download buttons per asset
- Warning if this is not the latest release

**Breadcrumb:** Downloads › [Product] › [Version]

---

### Support tickets `/support`

**Purpose:** All support tickets for this organisation.

**Content:**
- Page heading: "Support"
- Filter: by status, by type, by priority, by assignee
- Ticket list — sorted by last activity (most recent first)
- "Open ticket" button
- Empty state: "No open tickets."

---

### New ticket `/support/new`

**Purpose:** Create a new support ticket.

**Content:**
- Type selector: Support / Hardware Fault / Billing / Feature Request
- Subject line input
- Description (markdown editor)
- Conditional fields:
  - Hardware Fault: device selector (from registered devices)
  - Any type: product selector (optional)
- Priority: Low / Medium / High / Critical
- Submit creates ticket + sends notification to Centari support

---

### Ticket detail `/support/[id]`

**Purpose:** Full ticket thread: metadata, messages, status.

**Content:**
- Header: ticket ID, subject, status badge, priority badge
- Metadata sidebar: type, product reference (linked), device reference (linked), created by, SLA deadline (for HIGH/CRITICAL), assigned Centari agent
- Message thread: chronological, newest at bottom
  - Each message: author avatar + name, timestamp, markdown body, attachment thumbnails
  - Centari-internal messages: not visible to customer users
- Reply input: markdown editor, attachment upload, submit button
- Status change (Admin only — customer can't change status directly)

**Related items:** Device card (if referenced), Product card (if referenced) — shown in sidebar

---

### Team members `/team` — Admin only

**Purpose:** Manage all users in this organisation.

**Content:**
- Active members list: name, email, role badge, joined date, last active
- Pending invitations section: email, invited by, expiry
- "Invite user" button
- Empty invited-only state: just the current admin + invite prompt

**Actions:**
- Invite new user (email + role)
- Change a member's role (not own role)
- Remove a member (not self — org must retain ≥1 Admin)
- Resend invitation
- Cancel invitation

---

### Invite user `/team/invite` — Admin only

**Content:**
- Email input
- Role selector: Operator / Viewer (cannot invite Admin — existing Admin must promote)
- Submit sends invitation email + creates pending Membership

---

### Team member detail `/team/[user-id]` — Admin only

**Content:**
- Member name, email, role
- Licence assignments: which products this user is assigned to
- Ticket history: tickets created by this user
- Session history: last 5 login events (date, approximate location if available)
- Actions: change role, remove from organisation

---

### Settings hub `/settings`

Redirects to `/settings/account` by default. Sub-navigation via tabs.

---

### Account settings `/settings/account` — all roles

**Content:**
- Display name (editable)
- Email (read-only — change requires re-verification flow, future)
- Change password
- Active sessions: list of active sessions with revoke button per session

---

### Notification preferences `/settings/notifications` — all roles

**Content:**
- Toggle list: which event types trigger email notifications
  - Ticket replied (by Centari agent)
  - Ticket status changed
  - Licence assignment (added/removed)
  - Licence expiry warning (30-day, 7-day)
  - New Centari announcement
  - Device status change (offline)

---

### Organisation settings `/settings/organisation` — Admin only

**Content:**
- Organisation name
- Billing email
- Country
- VAT number
- Read-only: organisation slug, account status, created date

---

## Role access matrix

Full summary of what each customer role can access. Centari staff roles omitted (they have separate elevated access across all organisations).

| Section | Admin | Operator | Viewer |
|---------|-------|----------|--------|
| Dashboard — full modules | ✓ | ✓ | Status + Announcements |
| Dashboard — quick actions | ✓ | ✗ | ✗ |
| Products — view all | ✓ | ✓ | ✓ |
| Products — licence detail | ✓ full | ✓ read | ✓ read |
| Products — manage assignments | ✓ | ✗ | ✗ |
| Downloads — access | ✓ | ✓ licensed | ✗ |
| Downloads — edge channel | Licence flag required | Licence flag required | ✗ |
| Hardware — view | ✓ | ✓ | ✓ |
| Hardware — register | ✓ | ✓ | ✗ |
| Hardware — edit / change status | ✓ | ✓ | ✗ |
| Hardware — decommission | ✓ | ✗ | ✗ |
| Support — view tickets | ✓ all | ✓ own | ✗ |
| Support — create ticket | ✓ | ✓ | ✗ |
| Support — close ticket | ✓ | ✗ | ✗ |
| Team — view | ✓ | ✗ | ✗ |
| Team — invite | ✓ | ✗ | ✗ |
| Team — manage roles | ✓ | ✗ | ✗ |
| Settings — account | ✓ | ✓ | ✓ |
| Settings — organisation | ✓ | ✗ | ✗ |
| Settings — billing | ✓ future | ✗ | ✗ |
| Admin panel | ✗ | ✗ | ✗ |

---

## Dashboard layout

The dashboard is a module grid. Layout and module selection vary by role.

### Admin layout

```
┌────────────────────────────────────────────────────────────┐
│  STATUS STRIP                                              │
│  [Active licences] [Devices online] [Open tickets] [Expiry]│
├──────────────────────────────┬─────────────────────────────┤
│                              │                             │
│  LICENCE OVERVIEW            │  SYSTEM STATUS              │
│  (2/3 width)                 │  (1/3 width)                │
│                              │                             │
├──────────────┬───────────────┴──────────────┬──────────────┤
│              │                              │              │
│  HARDWARE    │   OPEN TICKETS               │  QUICK       │
│  SUMMARY     │                              │  ACTIONS     │
│              │                              │              │
├──────────────┴──────────────┬───────────────┴──────────────┤
│                             │                              │
│  RECENT DOWNLOADS           │  ANNOUNCEMENTS               │
│                             │                              │
└─────────────────────────────┴──────────────────────────────┘
```

### Operator layout

```
┌────────────────────────────────────────────────────────────┐
│  STATUS STRIP                                              │
│  [Active licences] [Devices online] [Open tickets]         │
├──────────────────┬─────────────────────┬───────────────────┤
│                  │                     │                   │
│  SYSTEM STATUS   │  RECENT DOWNLOADS   │  LICENCE OVERVIEW │
│                  │                     │                   │
├──────────────────┴──────────┬──────────┴───────────────────┤
│                             │                              │
│  HARDWARE SUMMARY           │  OPEN TICKETS                │
│                             │                              │
├─────────────────────────────┴──────────────────────────────┤
│  ANNOUNCEMENTS (full width)                                │
└────────────────────────────────────────────────────────────┘
```

### Viewer layout

```
┌────────────────────────────────────────────────────────────┐
│  STATUS STRIP                                              │
│  [Active licences] [Devices online]                        │
├────────────────────────────────────────────────────────────┤
│  SYSTEM STATUS (full width)                                │
├────────────────────────────────────────────────────────────┤
│  ANNOUNCEMENTS (full width)                                │
└────────────────────────────────────────────────────────────┘
```

---

## Module definitions

Each module is independently loadable. Modules render their own loading skeleton and error state.

---

### System Status

**Purpose:** Current health of licensed products and hardware estate at a glance.

**Content:**
- Section: Licensed products — one row per product
  - Product name (mono label)
  - Status dot: ONLINE (green) / DEGRADED (amber) / OFFLINE (red) / UNLICENSED (grey)
  - Status label
- Section: Hardware summary — three counts
  - Online devices (green)
  - Offline devices (grey)
  - In maintenance (amber)
- Section: Open critical/high tickets — count badge with link
- Footer link: "View all →" to `/support`

**Visible to:** All roles (Viewer sees product status and device counts; no ticket link)  
**Updates:** On page load and via polling interval (30s)

---

### Licence Overview

**Purpose:** Licence status across all products at a glance; surface expiry risk.

**Content:**
- One row per licence:
  - Product name (mono label)
  - Licence type badge: SEAT / DEVICE / SITE / ENTERPRISE
  - Usage: seat bar (N / N used) for seat licences; device count for device licences; "Unlimited" for site/enterprise
  - Expiry date, with warning state:
    - > 30 days: normal
    - ≤ 30 days: amber
    - ≤ 7 days: red
    - Expired: red strikethrough
  - Edge channel badge if `allow_edge_channel = true`
- Footer link: "Manage licences →" to `/licences`

**Visible to:** Admin (full), Operator (read-only rows, no usage detail)

---

### Hardware Summary

**Purpose:** Status of the registered device estate; surface devices needing attention.

**Content:**
- Three stat tiles: Online / Offline / Maintenance
- List: last 3 devices with a status change (what changed, when)
  - Each item: device serial/name, type badge, old status → new status, timestamp
- Footer: "View inventory →" to `/hardware` + "Register device" button (Admin, Operator)

**Visible to:** Admin, Operator

---

### Recent Downloads

**Purpose:** Surface recently available releases and log last downloads.

**Content:**
- Default: latest release per licensed product — one row per product
  - Product name, latest version, release date, "New" badge if released in last 7 days
- Alternative (toggle): last 5 download events by any org member
  - Who downloaded, what, when, platform
- Footer link: "Download centre →" to `/downloads`

**Visible to:** Admin, Operator

---

### Open Tickets

**Purpose:** Outstanding support cases requiring attention.

**Content:**
- Unresolved ticket count by status: Open / In Progress / Awaiting Customer
- List: last 5 tickets by last activity (most recent first)
  - Ticket ID (mono, truncated), subject (truncated), priority badge, status badge, age ("3 days ago")
  - CRITICAL/HIGH tickets sorted to top regardless of recency
- Footer: "All tickets →" to `/support` + "Open ticket" button

**Visible to:** Admin (all org tickets), Operator (own tickets only)

---

### Quick Actions

**Purpose:** Reduce navigation depth for the most common Admin tasks.

**Content:**

| Button | Target | Admin | Operator |
|--------|--------|-------|----------|
| Invite user | Opens invite form (modal or `/team/invite`) | ✓ | ✗ |
| Register device | Opens register form (modal or `/hardware/register`) | ✓ | ✓ |
| Open ticket | Opens new ticket form (modal or `/support/new`) | ✓ | ✓ |

**Visible to:** Admin, Operator (reduced set)

---

### Announcements

**Purpose:** Centari platform communications: maintenance, releases, general notices.

**Content:**
- Latest 3 announcements (newest first)
  - Type badge: MAINTENANCE / RELEASE / GENERAL
  - Title
  - Body preview (2 lines, truncated)
  - Date
  - Unread indicator (bold title + dot)
- Mark all as read action
- No "View all" pagination in Phase 1 — max 10 announcements shown

**Visible to:** All roles

---

## Card hierarchy

Card types used throughout the Control Room. Each card type defines a fixed content hierarchy: what appears prominently, what is secondary, and what is accessible on interaction.

---

### Product card

Used on: `/products` overview grid

```
┌──────────────────────────────────────────┐
│  FORGE                        [LICENSED] │  ← name (mono) + status badge
│                                          │
│  Configure and deploy complex            │  ← one-sentence description
│  operational systems.                    │
│                                          │
│  SEAT LICENCE · 12/25 seats              │  ← licence type + usage
│  Expires 2027-03-15                      │  ← expiry date
│                                          │
│  [Downloads]  [Licence]                  │  ← actions (role-gated)
└──────────────────────────────────────────┘
```

**States:**
- Licensed: full colour, actions visible
- Unlicensed: de-emphasised, description greyed, no actions, "Contact sales" link
- Trial: amber badge, expiry countdown
- Expired: red badge, de-emphasised

---

### Licence card

Used on: `/licences`, product detail licence tab

```
┌──────────────────────────────────────────┐
│  FORGE                    [SEAT] [ACTIVE]│  ← product + type + status
│                                          │
│  ██████████░░░░░  12 / 25 seats          │  ← usage bar
│                                          │
│  Expires 15 Mar 2027  ·  Edge: No        │  ← expiry + edge flag
│                                          │
│  [Manage assignments]  [History]         │  ← Admin-only actions
└──────────────────────────────────────────┘
```

**Status badge colours:**
- ACTIVE → green
- EXPIRING (≤30 days) → amber
- EXPIRING (≤7 days) → red
- EXPIRED → red, de-emphasised
- TRIAL → amber

---

### Device card

Used on: `/hardware` inventory list, hardware summary module

```
┌──────────────────────────────────────────┐
│  ● SN-7742-XR-09          [XR HEADSET]  │  ← status dot + serial + type
│  "Field Unit Alpha"                      │  ← assigned name (if given)
│                                          │
│  Firmware 2.4.1  ·  Online 2 min ago    │  ← firmware + last seen
│                                          │
│  Assigned: J. Eriksson                   │  ← assigned user
│  Location: Site B — Level 3             │  ← location label
│                                          │
│  [Details]  [Open ticket]               │  ← actions
└──────────────────────────────────────────┘
```

**Status dot colours:**
- Online → green
- Offline → grey
- Maintenance → amber
- Decommissioned → red, full card de-emphasised

---

### Ticket card

Used on: `/support` list, open tickets module

```
┌──────────────────────────────────────────┐
│  #1047                    [HIGH] [OPEN] │  ← ID + priority + status
│  Firmware update failure on SN-7742     │  ← subject (truncated)
│                                          │
│  [HARDWARE FAULT]  ·  3 days ago         │  ← type + age
│  Opened by M. Chen  ·  Unassigned        │  ← creator + agent
│                                          │
│  SLA: 1 day remaining                    │  ← SLA (HIGH/CRITICAL only)
└──────────────────────────────────────────┘
```

**Priority badge colours:**
- CRITICAL → red
- HIGH → orange
- MEDIUM → amber
- LOW → grey

**Status badge:**
- OPEN → blue
- IN PROGRESS → blue (filled)
- AWAITING CUSTOMER → amber
- AWAITING CENTARI → grey
- RESOLVED → green
- CLOSED → grey

---

### Download asset card

Used on: release detail pages, downloads centre

```
┌──────────────────────────────────────────┐
│  [WINDOWS x64]                           │  ← platform badge
│  centari-forge-2.4.1-win-x64.exe        │  ← filename
│  245 MB                                  │  ← file size
│                                          │
│  SHA-256: [show]                         │  ← collapsible checksum
│                                          │
│  [Download]                              │  ← action
└──────────────────────────────────────────┘
```

**Platform badge variants:** WINDOWS / LINUX / MACOS / FIRMWARE / OTHER

**States:**
- Normal: Download button active
- Yanked (recalled): De-emphasised, RECALLED badge, no download button

---

### Team member card

Used on: `/team` list

```
┌──────────────────────────────────────────┐
│  Marcus Chen              [OPERATOR]     │  ← name + role badge
│  m.chen@customer.org                     │  ← email
│                                          │
│  Joined 2025-11-04  ·  Active 2 days ago │  ← dates
│                                          │
│  [Edit role]  [Remove]                   │  ← Admin-only actions
└──────────────────────────────────────────┘
```

**Pending invitation state:**
```
┌──────────────────────────────────────────┐
│  a.lindqvist@customer.org  [PENDING]     │
│  Invited by M. Admin  ·  Expires in 48h  │
│  [Resend]  [Cancel]                      │
└──────────────────────────────────────────┘
```

---

## Data relationships

How entities in the UI connect to each other. These define what links and contextual cross-references appear on each page.

```
Organisation
│
├── Memberships → Users
│   └── User detail shows: licence assignments, created tickets
│
├── Licences → Products
│   ├── Licence detail shows: assigned users/devices, history
│   └── Product detail shows: its licence (via Licence tab)
│
├── LicenceAssignments → (User | HardwareDevice)
│   ├── User card (team page): shows their licence assignments
│   └── Licence card: shows assigned users or devices
│
├── HardwareDevices
│   ├── Device detail shows: its tickets, its assigned user
│   ├── Ticket creation: device selector pre-fills device reference
│   └── Ticket detail: device card shown in sidebar if referenced
│
├── Tickets → (Product | HardwareDevice) [optional references]
│   ├── Ticket list: filter by product or device
│   └── Device detail (Tickets tab): all tickets for that device
│
└── DownloadReleases → Products → Licences
    ├── Download access gated by active licence for that product
    └── Product detail (Downloads tab): release list for that product
```

### Cross-navigation map

| From | To | Via |
|------|----|-----|
| Ticket detail | Referenced device | Device card in sidebar → device detail |
| Ticket detail | Referenced product | Product link in metadata |
| Device detail | Assigned user | User name link → team member detail |
| Device detail | Device's tickets | Tickets tab |
| Team member detail | Licence assignments | Listed in member detail |
| Licence detail | Assigned users | Assignment list → team member detail |
| Product detail | Downloads | Downloads tab |
| Product detail | Licence | Licence tab |
| Hardware Summary module | Full inventory | "View inventory →" footer |
| Open Tickets module | Full ticket list | "All tickets →" footer |
| Status strip tile | Relevant section | Each tile links to its full page |

---

## Notification centre

The notification bell in the topbar opens a panel listing recent events. Notifications are not real-time in Phase 1 — fetched on panel open.

### Notification types

| Event | Recipient | Message |
|-------|-----------|---------|
| Ticket replied to (by Centari) | Ticket creator | `Centari replied to ticket #1047` |
| Ticket status changed | Ticket creator + org Admin | `Ticket #1047 status: In Progress → Resolved` |
| Licence assignment added | Assigned user | `You have been granted access to Forge` |
| Licence assignment removed | Removed user | `Your access to Forge has been removed` |
| Licence expiry warning | All Admins | `Licence for Forge expires in 28 days` |
| New Centari announcement | All users | `[Announcement title]` |
| Device went offline | All Admins | `Device SN-7742-XR-09 is offline` |

### Notification panel structure

```
Notifications                        [Mark all read]
────────────────────────────────────
● Centari replied to ticket #1047             2h ago
  View ticket →

  Licence for Forge expires in 28 days        1d ago
  Manage licences →

  Device SN-7742-XR-09 is offline             3d ago
  View device →

[Load earlier]
```

Unread notifications: filled dot. Read: no dot. Max 20 shown in panel.

---

## Empty states

Each section has a defined empty state to guide first-time and zero-data scenarios.

| Page / section | Empty state message | Action |
|----------------|--------------------|----|
| Hardware inventory | No devices registered. Register your first device to begin tracking your hardware estate. | [Register device] |
| Support tickets | No open tickets. | [Open a ticket] |
| Downloads (unlicensed product) | A licence for [Product] is required to access downloads. | Contact your account manager |
| Downloads (licensed, no releases) | No releases are currently available for [Product]. | — |
| Team (only admin present) | Your team is empty. Invite your first team member. | [Invite user] |
| Notifications panel | You're up to date. | — |
| Announcements module | No announcements at this time. | — |

---

## Page titles

Browser tab titles for navigation and accessibility.

```
Dashboard            — Control Room · [Org name]
Products             — Products · Control Room
Product detail       — [Product name] · Control Room
Licences             — Licences · Control Room
Hardware             — Hardware · Control Room
Device detail        — [Serial/Name] · Control Room
Downloads            — Downloads · Control Room
Support              — Support · Control Room
Ticket detail        — Ticket #[id] · Control Room
Team                 — Team · Control Room
Settings             — [Tab name] · Settings · Control Room
Admin panel          — [Section] · Admin · Control Room
```

---

*This document is the IA reference. It defines structure, not visual design. Typography, colour, spacing, and interaction patterns are governed by the design system established in Sprint 1.*
