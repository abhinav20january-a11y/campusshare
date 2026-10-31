# Software Project Management (SPM)
# CampusShare — Campus Item Borrowing Platform

**Version:** 1.0  
**Date:** October 2026

---

## 1. Project Overview

| Item | Detail |
|---|---|
| **Project Name** | CampusShare |
| **Type** | Full-stack web application |
| **Domain** | Campus community / sharing economy |
| **Methodology** | Iterative (Agile-inspired) |
| **Duration** | 8 weeks (1 academic semester) |
| **Platform** | Web (React + Express + MySQL) |

---

## 2. Project Objectives

1. Build a verified, trust-based campus item-borrowing platform
2. Cover the complete borrowing lifecycle from request to return
3. Provide admin moderation tools to ensure platform safety
4. Deploy using containerised infrastructure for portability
5. Document the project to professional SE standards

---

## 3. Team Roles and Responsibilities

| Role | Responsibilities |
|---|---|
| **Full-Stack Developer** | React frontend, Express.js backend, MySQL schema design, Docker setup |
| **SE Documentation Lead** | SRS, MoSCoW, UML diagrams, DFD, STD, feasibility study, test cases, SPM |
| **QA / Testing Lead** | Test case design, manual test execution, automated test suite, defect tracking |

> Note: In a small academic team, roles may overlap. One person may handle multiple roles.

---

## 4. Development Methodology

### Iterative Development (Agile-Inspired)

We adopted an **iterative approach** divided into 4 development sprints, each delivering a working, testable increment of the system. This approach was chosen because:

- Requirements for a borrowing platform are well-understood but complex
- Each sprint produced a usable feature that could be demonstrated
- Issues were caught early through iterative integration testing
- Documentation was updated alongside development (not left to the end)

---

## 5. Sprint Plan

### Sprint 1 — Foundation (Week 1–2)
**Sprint Goal:** Students can register, verify email, and log in securely.

| Task | Status |
|---|---|
| Design 21-table MySQL schema | ✅ Complete |
| Implement user registration with bcrypt | ✅ Complete |
| Implement JWT session via HTTP-only cookie | ✅ Complete |
| Email verification token system | ✅ Complete |
| Password reset flow | ✅ Complete |
| Item listing form (CRUD) | ✅ Complete |
| Image upload to Cloudinary | ✅ Complete |
| Basic marketplace browse | ✅ Complete |

**Sprint 1 Deliverable:** Working auth system + item catalogue

---

### Sprint 2 — Core Borrowing (Week 3–5)
**Sprint Goal:** Complete borrow request → handover → return workflow.

| Task | Status |
|---|---|
| Borrow request creation with date conflict check | ✅ Complete |
| Accept / reject / cancel by owner | ✅ Complete |
| Transaction state machine (10 states) | ✅ Complete |
| Two-sided handover confirmation with evidence | ✅ Complete |
| Return initiation and owner confirmation | ✅ Complete |
| Extension request and owner decision | ✅ Complete |
| Overdue detection function | ✅ Complete (function written) |
| Automated overdue cron scheduling | ⚠️ Partial |

**Sprint 2 Deliverable:** Fully working borrow → active → return cycle

---

### Sprint 3 — Community & Trust (Week 5–7)
**Sprint Goal:** Messaging, notifications, reviews, trust score, circles, disputes.

| Task | Status |
|---|---|
| In-app messaging (per borrow request) | ✅ Complete |
| Notification system for all key events | ✅ Complete |
| Post-transaction review (1–5 stars + comment) | ✅ Complete |
| Trust score algorithm | ✅ Complete |
| Borrow Circles with invite links | ✅ Complete |
| Dispute management with evidence upload | ✅ Complete |
| Content reporting (items/users/messages) | ✅ Complete |

**Sprint 3 Deliverable:** Full community and trust ecosystem

---

### Sprint 4 — Admin, Payment & Deployment (Week 7–8)
**Sprint Goal:** Admin control panel, payment, Docker deployment, testing.

| Task | Status |
|---|---|
| Admin dashboard with statistics | ✅ Complete |
| User moderation (verify, warn, suspend, ban) | ✅ Complete |
| Item moderation (hide, delete) | ✅ Complete |
| Dispute resolution by admin | ✅ Complete |
| Audit logging for all admin actions | ✅ Complete |
| Razorpay Test Mode integration | ✅ Complete |
| Demo checkout fallback | ✅ Complete |
| Docker containerisation | ✅ Complete |
| Integration test suite (smoke tests) | ✅ Complete |
| SE documentation (SRS, diagrams, etc.) | ✅ Complete |

**Sprint 4 Deliverable:** Production-ready, fully documented application

---

## 6. Risk Management

| Risk ID | Risk | Probability | Impact | Mitigation Strategy | Owner |
|---|---|---|---|---|---|
| R-01 | Database corruption from partial writes | Low | Critical | `atomic()` wrapper uses BEGIN/COMMIT/ROLLBACK — partial writes automatically rolled back | Developer |
| R-02 | JWT secret exposure | Low | Critical | Secret never committed to Git; auto-generated in dev; enforced in `.env.example` | Developer |
| R-03 | Item not returned by borrower | Medium | High | Overdue alerts, trust score penalty, dispute mechanism, admin moderation | Platform |
| R-04 | Overlapping reservation conflicts | Medium | High | `SELECT FOR UPDATE` lock + conflict query before creating any request or transaction | Developer |
| R-05 | Fake student registrations | Medium | Medium | University email domain validation + email verification requirement | Developer |
| R-06 | Admin account compromise | Low | Critical | Separate `requireAdmin()` middleware; role stored in DB, not JWT payload | Developer |
| R-07 | Live payment accidentally enabled | Low | Critical | Mode check in Razorpay config — TEST always; live key requires manual change | Developer |
| R-08 | Platform abuse by bad actors | Medium | Medium | Reporting system + admin moderation tools + audit log trail | Admin |
| R-09 | Image upload failure (Cloudinary down) | Low | Low | Items can be listed without images; fallback placeholder shown | Platform |
| R-10 | Schedule overrun | Medium | Medium | Iterative sprints allow partial delivery; Must Have requirements prioritised first | Team |

---

## 7. Tools and Technologies

| Category | Tool | Purpose |
|---|---|---|
| **Code Editor** | Visual Studio Code | Primary development environment |
| **Version Control** | Git | Source code history and branching |
| **Remote Repository** | GitHub | Code collaboration and backup |
| **Database Design** | MySQL Workbench | Schema design and query testing |
| **API Testing** | Postman / curl | Testing REST endpoints |
| **Diagram Creation** | draw.io / Excalidraw | UML, DFD, STD diagrams |
| **Container Testing** | Docker Desktop | Local container environment |
| **Test Runner** | Node.js `node:test` | Automated test execution |
| **Image CDN** | Cloudinary | Profile and item image storage |
| **Payment Gateway** | Razorpay (Test Mode) | Payment integration |
| **Documentation** | Markdown (GitHub) | All SE documentation |

---

## 8. Version Control Strategy

### Git Branching Model
```
main ─────────────────────────────────────────► (stable, production-ready)
  │
  ├── feature/auth-system          (Sprint 1: registration, JWT, verify)
  ├── feature/item-management      (Sprint 1: CRUD, Cloudinary)
  ├── feature/borrow-requests      (Sprint 2: request lifecycle)
  ├── feature/transaction-engine   (Sprint 2: state machine)
  ├── feature/community-features   (Sprint 3: circles, disputes, messaging)
  ├── feature/admin-panel          (Sprint 4: dashboard, moderation)
  ├── feature/payment-integration  (Sprint 4: Razorpay + demo)
  ├── feature/testing              (Sprint 4: test suite)
  └── feature/documentation        (Sprint 4: SRS, diagrams, test cases)
```

### Commit Convention
```
feat: add borrow request conflict detection
fix: resolve duplicate review submission bug
docs: add SRS and MoSCoW documents
test: add unit tests for core utils
refactor: extract borrowing logic into service layer
```

### Branch Lifecycle
1. Create feature branch from `main`
2. Develop and commit incrementally
3. Write/update tests for the feature
4. Create Pull Request → code review
5. Merge to `main` after review passes
6. Delete feature branch

---

## 9. Quality Assurance Plan

| QA Activity | When | Method |
|---|---|---|
| Code review | Per Pull Request | Peer review checklist |
| Input validation | Development | `ensure()`, `text()`, `id()` utils |
| Automated testing | Every commit | `npm test` (8 automated tests) |
| Manual functional testing | End of each sprint | Test case table (56 test cases) |
| Security review | End of Sprint 4 | Helmet, CORS, rate limit audit |
| Performance check | End of Sprint 4 | Response time under load |
| Documentation review | Final week | Cross-check diagrams against code |

---

## 10. Project Metrics

| Metric | Value |
|---|---|
| Total source files | 45+ |
| Total database tables | 21 |
| Total API endpoints | 60+ |
| Total React pages | 10 |
| Total test cases | 56 (24 automated, 32 manual) |
| Lines of code (approx.) | 5,000+ |
| Documentation files | 8 (SRS, MoSCoW, Architecture, Feasibility, Test Cases, SPM, API Reference, README) |
| Docker services | 2 (app + db) |
| Development duration | 8 weeks |

---

## 11. Lessons Learned

| Area | Learning |
|---|---|
| **Architecture** | Separating business logic into a `services/` layer (instead of keeping it in controllers) made testing and debugging significantly easier |
| **Database** | Using the `atomic()` wrapper from the start prevented several potential data corruption scenarios during testing |
| **Security** | HTTP-only cookies for JWT are more secure than localStorage but require careful CORS configuration |
| **Requirements** | Writing MoSCoW prioritisation first would have prevented scope creep in Sprint 3 |
| **Testing** | Integration tests should be written alongside features, not only at the end of the project |
| **Documentation** | Maintaining architecture documentation continuously prevents it from becoming outdated relative to the code |
