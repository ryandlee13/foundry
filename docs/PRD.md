# Product Requirements Document

## 1. Problem

Booking a venue and the vendors (DJ, caterer, photographer, security, etc.) for a live
event in San Francisco is a fragmented, manual process. Organizers juggle phone calls,
email threads, PDFs, and spreadsheets across multiple venues and vendors at once. Venue
operators lose off-hours revenue because they have no self-serve way to list availability
and take structured booking requests. Vendors rely on word of mouth and referrals to find
gigs.

## 2. Value Proposition

A single marketplace where:

- **Organizers** can describe an event once, browse real venues with real availability,
  request a booking, and post the remaining vendor needs (catering, DJ, photography,
  security, etc.) — then manage the whole event from one dashboard.
- **Venue operators** list their space, define available hours and requirements
  (insurance, capacity, house rules), and turn inbound requests into confirmed,
  paid-off-hours bookings without manual back-and-forth.
- **Vendors and contractors** discover relevant gigs tied to real, confirmed events and
  submit proposals instead of cold-pitching.

Initial market: **San Francisco only.** Depth over breadth — a small number of verified
venues and vendors beats a large unverified directory.

## 3. User Roles

A single Supabase Auth account (one `profiles` row) may hold one or more roles via
`profile_roles`. Roles are not separate login systems — they are permission scopes
layered on one identity.

| Role | Description |
|---|---|
| **Organizer** | Plans events, browses venues, submits booking requests, posts vendor needs, reviews proposals. |
| **Venue Operator** | Lists and manages one or more venues, defines availability, responds to booking requests with quotes, confirms bookings. |
| **Vendor** | Offers a service category (DJ, catering, photography, security, etc.), browses posted event needs, submits proposals. |
| **Admin** | Approves venue listings and vendor profiles before they go public, reviews submitted documents, moderates content, has platform-wide read access for support. |

A user can be, e.g., both an Organizer and a Vendor on the same account.

## 4. Primary User Journeys

### 4.1 Organizer journey (primary MVP flow)
1. Create an event brief (type, date/time window, guest count, budget range, neighborhood).
2. Browse approved venues filtered by capacity, neighborhood, and available dates.
3. Submit a structured booking request to a venue for a specific date/time.
4. Receive a quote from the venue operator (price, terms, required documents).
5. Complete required documents (e.g., Certificate of Insurance) via secure upload.
6. Confirm the venue booking once quote and documents are accepted.
7. Post additional event needs (vendor categories, budget, description).
8. Receive proposals from vendors against each posted need.
9. Accept or decline vendor proposals.
10. Manage the full event — venue booking, vendor roster, documents, messages — from one
    dashboard.

### 4.2 Venue operator journey
1. Submit a venue listing (photos, capacity, amenities, off-hours availability,
   requirements such as required insurance).
2. Wait for admin approval before the listing is public.
3. Receive booking requests from organizers.
4. Send a quote (price, terms) in response to a request.
5. Review submitted documents (e.g., Certificate of Insurance) — mark as reviewed, not
   "verified" or "approved" in a legal sense.
6. Confirm the booking.
7. Manage upcoming bookings from a venue dashboard.

### 4.3 Vendor journey
1. Submit a vendor profile (service category, service area, portfolio, base pricing).
2. Wait for admin approval before the profile is public / eligible to see event needs.
3. Browse posted event needs that match their service category.
4. Submit a structured proposal (price, description, availability confirmation).
5. Get accepted or declined by the organizer.
6. Manage upcoming gigs from a vendor dashboard.

### 4.4 Admin journey
1. Review pending venue listings and vendor profiles.
2. Approve or reject with a reason.
3. Review flagged content or documents.
4. Audit platform activity via `admin_audit_logs`.

## 5. MVP Feature Scope

**Included:**
- Single account, multi-role (organizer / venue operator / vendor / admin)
- Event brief creation
- Public venue directory (approved listings only, approximate location only)
- Structured booking request → quote → document upload → confirmation flow
- Vendor profile creation and admin approval
- Event needs posting → vendor proposals → accept/decline
- Unified organizer dashboard across venue + vendor bookings
- Private document storage (COI, IDs, contracts, permits, security plans) via signed URLs
- Admin approval queue for venues and vendor profiles
- Basic messaging thread per booking/proposal context

**Explicitly excluded from MVP:**
- Payments, deposits, or any money movement (Stripe integration is a later phase)
- Venue operator subscription billing (planned, not built this phase)
- Real-time chat (polling-based message threads only)
- Reviews and ratings
- Search ranking / recommendation algorithms
- Calendar sync (Google Calendar, iCal export)
- Native mobile apps
- Multi-city expansion
- Automated legal verification of uploaded documents (humans review; language stays
  "submitted" / "under review" / "reviewed" — never "verified")
- Contract e-signature workflows
- Automated vendor-venue matching algorithms

## 6. Success Signals for MVP (directional, not contractual)

- An organizer can go from event brief to confirmed venue booking without leaving the app.
- A venue operator can respond to a request and confirm a booking without email.
- A vendor can find and propose on a real posted need.
- No exact venue address or private document is ever exposed outside authorized parties.
