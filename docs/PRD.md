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

> Built as a `localStorage` UI+logic prototype ahead of Phase 5 — see `CLAUDE.md` →
> "Vendor marketplace (local-prototype layer)". Steps below reflect what's actually
> implemented, not just planned.

1. Add the vendor role to an existing account, or pick it at signup.
2. Complete a profile: skills, per-skill services/pricing, portfolio links, service
   location/radius/remote preference, notification preferences.
3. Submit the profile for admin review; wait for approval before it's public or eligible
   to see event needs.
4. Browse Discover Gigs — event needs matching skill + location radius/selected cities/
   remote preference, with a transparent (non-AI, rule-based) explanation of why each one
   matched.
5. Submit a structured proposal: price, pricing model, message, deliverables, equipment,
   relevant portfolio links, availability confirmation, expiration (1/5/7 days).
6. See an anonymized competitive-bid summary (lowest/highest/median active bid, pricing
   models represented) after submitting — never another vendor's identity or full
   proposal.
7. Edit or withdraw an active proposal; renew one that expired before it was accepted.
8. Get shortlisted, accepted, or declined by the organizer; an accepted proposal creates a
   confirmed engagement and unlocks messaging with the organizer.
9. Manage confirmed gigs from a vendor dashboard; the organizer marks the engagement
   complete once the event has happened.
10. Receive a review from the organizer; optionally post one public response.
11. Choose whether each completed Foundry engagement shows on the public profile as event
    history.

### 4.4 Admin journey
1. Review pending venue listings and vendor profiles.
2. Approve or reject with a reason.
3. Review flagged content (including vendor reviews flagged by the reviewed vendor) or
   documents.
4. Moderate published event needs (e.g. cancel one that violates policy).
5. Audit platform activity via `admin_audit_logs`.

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
- Payments, deposits, or any money movement (Stripe integration is a later phase). An
  accepted vendor proposal creates a confirmed engagement and unlocks messaging;
  payment happens outside Foundry until Phase 7.
- Venue operator subscription billing (planned, not built this phase)
- Real-time chat (manual-refresh message threads only, no push/websocket)
- Search ranking / recommendation algorithms — matching and "recommended" proposal
  sorting are transparent and rule-based (skill match, service radius/remote, rating,
  completed-event count), never an opaque or AI-driven ranking; never described to users
  as an "algorithm" or "AI match"
- Calendar sync (Google Calendar, iCal export)
- Native mobile apps
- Multi-city expansion (the vendor skill catalog and location model support it, but only
  San Francisco is seeded/promoted)
- Automated legal verification of uploaded documents (humans review; language stays
  "submitted" / "under review" / "reviewed" — never "verified")
- Contract e-signature workflows
- SMS notifications
- Publicly visible phone numbers or email addresses before a proposal is accepted

**Now included (built as a `localStorage` prototype ahead of schedule — see §4.3):**
reviews and ratings, vendor-organizer messaging (post-acceptance only), and rule-based
(not AI) event/skill matching. These were listed as excluded in earlier drafts of this
document; they are still *not* backed by a real database/RLS, so treat "included" here as
"UX validated, not production-ready."

## 6. Success Signals for MVP (directional, not contractual)

- An organizer can go from event brief to confirmed venue booking without leaving the app.
- A venue operator can respond to a request and confirm a booking without email.
- A vendor can find and propose on a real posted need.
- No exact venue address or private document is ever exposed outside authorized parties.
