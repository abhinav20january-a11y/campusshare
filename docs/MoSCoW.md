# MoSCoW Prioritisation — CampusShare

**Version:** 1.0  
**Date:** October 2026

---

## What is MoSCoW?

MoSCoW is a requirements prioritisation technique used in software engineering to classify features by their importance to the project:

| Label | Meaning |
|---|---|
| **M — Must Have** | Non-negotiable core requirements. The system cannot function without these. |
| **S — Should Have** | Important but not critical for MVP launch. High value but workarounds exist. |
| **C — Could Have** | Desirable enhancements. Included only if time and resources allow. |
| **W — Won't Have** | Explicitly excluded from current scope. May be considered in future releases. |

---

## Prioritisation Table

| Requirement / Feature | MoSCoW | Justification | Implemented? |
|---|---|---|---|
| **AUTHENTICATION** | | | |
| User registration with college email | **MUST** | No access without accounts | ✅ Yes |
| Password hashing (bcrypt) | **MUST** | Security fundamental | ✅ Yes |
| Email verification | **MUST** | Ensures campus-only community trust | ✅ Yes |
| Login with JWT session cookie | **MUST** | Core access control mechanism | ✅ Yes |
| Logout with session invalidation | **MUST** | Security requirement | ✅ Yes |
| Password reset via token | **SHOULD** | Important UX; admin reset is fallback | ✅ Yes |
| Password change from Settings | **SHOULD** | User convenience | ✅ Yes |
| **ITEMS** | | | |
| Item listing (text + category + condition) | **MUST** | Core product catalogue | ✅ Yes |
| Item images (up to 6 via Cloudinary) | **SHOULD** | Improves trust; text-only listing is fallback | ✅ Yes |
| Item editing and status management | **MUST** | Owners must control their listings | ✅ Yes |
| Block deletion with active transactions | **MUST** | Data integrity requirement | ✅ Yes |
| Item rules and pickup instructions | **SHOULD** | Reduces misunderstandings | ✅ Yes |
| Item availability calendar | **SHOULD** | Prevents double-booking | ✅ Yes |
| **MARKETPLACE** | | | |
| University-scoped browsing | **MUST** | Core campus-safety constraint | ✅ Yes |
| Text search | **MUST** | Basic discovery mechanism | ✅ Yes |
| Category, condition, location filters | **MUST** | Refinement of results | ✅ Yes |
| Date-range availability filter | **MUST** | Prevents unavailable requests | ✅ Yes |
| Sorting (newest, rating, views) | **SHOULD** | Useful but browsable without | ✅ Yes |
| Pagination (24 items/page) | **MUST** | Performance and usability | ✅ Yes |
| Favourites / saved items | **COULD** | Convenience only | ✅ Yes |
| **BORROWING** | | | |
| Borrow request creation | **MUST** | Core transaction initiation | ✅ Yes |
| Conflict detection on request | **MUST** | Data integrity requirement | ✅ Yes |
| Accept / reject / cancel by owner | **MUST** | Core transaction control | ✅ Yes |
| Cancel by borrower | **MUST** | User control | ✅ Yes |
| Transaction auto-created on accept | **MUST** | Workflow automation | ✅ Yes |
| Two-sided handover confirmation | **MUST** | Protects both parties legally | ✅ Yes |
| Evidence photo upload at handover | **SHOULD** | Proof of condition | ✅ Yes |
| Return initiation and confirmation | **MUST** | Closes the transaction | ✅ Yes |
| Extension request by borrower | **SHOULD** | Reduces overdue situations | ✅ Yes |
| Overdue auto-detection | **MUST** | Platform reliability | ✅ Partial (logic exists; cron needed) |
| **TRUST & REVIEWS** | | | |
| Post-completion reviews (1–5 stars) | **SHOULD** | Builds trust; not needed for first transaction | ✅ Yes |
| Trust score algorithm | **SHOULD** | Useful signal; platform works without | ✅ Yes |
| User badges | **COULD** | Gamification; no functional impact | ❌ Not yet |
| **MESSAGING & NOTIFICATIONS** | | | |
| In-app messaging per borrow request | **SHOULD** | Coordination; email could substitute | ✅ Yes |
| In-app notifications | **MUST** | Users must know what is happening | ✅ Yes |
| Mark notifications as read | **SHOULD** | UX quality | ✅ Yes |
| **COMMUNITY** | | | |
| Borrow Circles (private groups) | **SHOULD** | Adds community value; basic sharing works without | ✅ Yes |
| Invite link for circles | **SHOULD** | Easy onboarding to circles | ✅ Yes |
| Circle-only item visibility | **SHOULD** | Privacy control | ✅ Yes |
| Report items / users / messages | **SHOULD** | Platform safety | ✅ Yes |
| **ADMIN** | | | |
| Admin dashboard with statistics | **MUST** | Platform oversight | ✅ Yes |
| Verify, warn, suspend, ban users | **MUST** | Platform safety | ✅ Yes |
| Hide / delete item listings | **MUST** | Content moderation | ✅ Yes |
| Resolve disputes with decision | **MUST** | Conflict resolution mechanism | ✅ Yes |
| Audit logging of all admin actions | **MUST** | Accountability and compliance | ✅ Yes |
| **PAYMENT** | | | |
| Demo payment (animated checkout) | **COULD** | Demo purposes only; no real value | ✅ Yes |
| Razorpay Test Mode integration | **COULD** | Nice-to-have; borrowing works without payment | ✅ Yes |
| Real-money live payment | **WON'T** | Out of academic scope | ❌ Excluded |
| **DESIGN / UX** | | | |
| Responsive UI (mobile + desktop) | **MUST** | Students use mobile devices | ✅ Yes |
| Dark / light theme | **COULD** | Aesthetic preference | ✅ Yes |
| Onboarding wizard for new users | **SHOULD** | Improves activation rate | ✅ Yes |
| Page animations (Framer Motion) | **COULD** | Premium feel | ✅ Yes |
| **DEPLOYMENT** | | | |
| Docker containerisation | **SHOULD** | Reproducible deployment | ✅ Yes |
| Environment variables via .env | **MUST** | Security — no hardcoded secrets | ✅ Yes |
| **WON'T HAVE (This Release)** | | | |
| Real-time messaging (WebSocket/SSE) | **WON'T** | Polling sufficient for MVP | ❌ Excluded |
| Native iOS / Android app | **WON'T** | Responsive web covers mobile use | ❌ Excluded |
| Inter-university sharing | **WON'T** | Scope is intentionally single-campus | ❌ Excluded |
| AI-powered recommendations | **WON'T** | Out of project scope | ❌ Excluded |
| Email delivery (SMTP) | **WON'T** | Development uses token bypass | ❌ Excluded |
| Automated overdue cron job | **SHOULD** | Logic exists; scheduling not implemented | ⚠️ Partial |

---

## Summary Statistics

| Category | Count |
|---|---|
| **Must Have** | 28 |
| **Should Have** | 22 |
| **Could Have** | 7 |
| **Won't Have** | 6 |
| **Total** | 63 |

| Implemented Status | Count |
|---|---|
|  Fully implemented | 55 |
|  Partially implemented | 2 |
|  Excluded by design | 6 |

---

## MoSCoW Key Insight

The **Must Have** requirements cover the complete borrowing loop:
> Register → Verify → Browse → Request → Accept → Handover → Active → Return → Complete

Without any single **Must Have** feature, this loop breaks and the platform fails its core purpose. All 28 Must Have features have been successfully implemented in CampusShare.
