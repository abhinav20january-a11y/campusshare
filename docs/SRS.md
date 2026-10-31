# Software Requirements Specification (SRS)
# CampusShare — Campus Item Borrowing Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Final

---

## 1. Introduction

### 1.1 Purpose
This document specifies the complete software requirements for **CampusShare**, a web-based platform that enables university students to borrow and lend physical items within their campus community. It is intended for developers, testers, and academic evaluators.

### 1.2 Project Scope
**In Scope:**
- User registration, authentication, and profile management
- Item listing, browsing, search, and filtering
- Borrow request creation, acceptance, and rejection
- Full transaction lifecycle: handover → active → return → completion
- Two-way review and trust score system
- In-app messaging between borrower and lender
- Borrow Circles (private community groups)
- Dispute management and admin moderation
- Payment gateway integration (Razorpay Test Mode)
- Admin dashboard and audit logging

**Out of Scope:**
- Native mobile applications (iOS/Android)
- Inter-university sharing
- Real-money financial transactions
- AI-powered recommendations
- Real-time push notifications (WebSocket)

### 1.3 Definitions and Acronyms

| Term | Definition |
|---|---|
| Borrower | A verified student who requests to borrow an item |
| Lender | A verified student who lists and lends an item |
| Transaction | A confirmed exchange from handover to return |
| Trust Score | A 0–100 score reflecting a user's exchange reliability |
| Circle | A private group (club/hostel) for restricted item sharing |
| JWT | JSON Web Token — used for session authentication |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| SRS | Software Requirements Specification |
| CRUD | Create, Read, Update, Delete |

### 1.4 Target Users

| User Type | Description |
|---|---|
| Student (Borrower) | Registered student who browses and requests items |
| Student (Lender) | Registered student who lists items for others to borrow |
| Administrator | Campus staff who moderate the platform |

> Note: A single student may act as both Borrower and Lender simultaneously.

---

## 2. Overall Description

### 2.1 Product Perspective
CampusShare is a standalone full-stack web application. It operates as a three-tier system:
- **Presentation Tier:** React 18 SPA (Single Page Application)
- **Logic Tier:** Node.js + Express.js REST API
- **Data Tier:** MySQL 8 relational database

External integrations:
- **Cloudinary** — image storage and CDN
- **Razorpay** — payment gateway (Test Mode)

### 2.2 Product Features (Summary)
1. Student registration with college email verification
2. Item marketplace with search, filter, and pagination
3. Borrow request and transaction lifecycle management
4. Evidence-based handover and return confirmation
5. Review system and automated trust score calculation
6. In-app messaging per borrow request
7. Borrow Circles for private community sharing
8. Dispute management with evidence upload
9. Admin moderation panel with full audit trail
10. Dark/light theme support

### 2.3 User Characteristics
- Students with basic web browsing skills
- No technical knowledge required
- Administrators with basic data management skills

### 2.4 Constraints
- All users must belong to the same university to share items
- Item images require Cloudinary configuration
- Payment features require Razorpay Test Mode credentials
- Email verification in production requires SMTP configuration
- Single-institution deployment scope

### 2.5 Assumptions
- Students have access to a modern browser (Chrome, Firefox, Safari, Edge)
- The university provides unique email addresses to enrolled students
- Administrators are trusted campus staff members
- All listed items are legal to own and lend under campus policies

---

## 3. Functional Requirements

### 3.1 Authentication Module

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system shall allow students to register by providing name, email, password (min 10 characters), university, department, year, and hostel. | MUST |
| FR-02 | The system shall hash all passwords using bcrypt before storage. | MUST |
| FR-03 | The system shall send a time-limited email verification token (valid 30 minutes) upon registration. | MUST |
| FR-04 | The system shall verify the user's email when a valid token is submitted via `POST /api/auth/verify-email`. | MUST |
| FR-05 | The system shall reject logins from unverified accounts. | MUST |
| FR-06 | The system shall authenticate users via email and password comparison. | MUST |
| FR-07 | The system shall issue a JWT session stored in an HTTP-only, SameSite=Lax cookie upon successful login. | MUST |
| FR-08 | The system shall allow users to log out, invalidating their current session token. | MUST |
| FR-09 | The system shall allow users to request a password reset via a time-limited token. | SHOULD |
| FR-10 | The system shall allow users to change their password from the Settings page. | SHOULD |

### 3.2 User Profile Module

| ID | Requirement | Priority |
|---|---|---|
| FR-11 | The system shall guide new users through a 6-step onboarding wizard after first login. | SHOULD |
| FR-12 | The system shall allow users to update their name, department, year, hostel, and interests. | MUST |
| FR-13 | The system shall allow users to upload a profile avatar image. | COULD |
| FR-14 | The system shall display a user's public profile showing trust score, ratings, completed borrows, and reviews. | SHOULD |
| FR-15 | The system shall allow users to deactivate their account (only when no active exchanges exist). | COULD |

### 3.3 Item Management Module

| ID | Requirement | Priority |
|---|---|---|
| FR-16 | A verified student shall be able to create an item listing with name, category, subcategory, condition, description, location, and up to 6 images. | MUST |
| FR-17 | The system shall support 8 item categories: Electronics, Books, Photography, Sports, Gaming, Tools, Academic, Accessories. | MUST |
| FR-18 | The system shall allow item owners to set maximum borrow duration, pickup instructions, and item rules. | SHOULD |
| FR-19 | The system shall allow item owners to edit, pause, archive, or delete their listings. | MUST |
| FR-20 | The system shall prevent deletion of items with active or pending transactions. | MUST |
| FR-21 | The system shall allow items to be assigned to a specific Borrow Circle, restricting visibility to circle members. | SHOULD |
| FR-22 | The system shall allow users to save items to a favourites list. | COULD |
| FR-23 | The system shall track item view counts. | COULD |

### 3.4 Marketplace Module

| ID | Requirement | Priority |
|---|---|---|
| FR-24 | The system shall display only items from the logged-in user's university. | MUST |
| FR-25 | The system shall support text search across item name and description. | MUST |
| FR-26 | The system shall support filtering by category, condition, and location. | MUST |
| FR-27 | The system shall support date-range availability filtering to exclude reserved items. | MUST |
| FR-28 | The system shall support sorting by newest, recommended, highest rated, and most viewed. | SHOULD |
| FR-29 | The system shall paginate marketplace results at 24 items per page. | MUST |

### 3.5 Borrow Request Module

| ID | Requirement | Priority |
|---|---|---|
| FR-30 | A verified student shall be able to create a borrow request specifying item, start date/time, end date/time, and purpose. | MUST |
| FR-31 | The system shall check for conflicting date reservations before creating a borrow request. | MUST |
| FR-32 | A student shall not be able to borrow their own item. | MUST |
| FR-33 | The item owner shall be able to accept, reject, or cancel a borrow request. | MUST |
| FR-34 | The borrower shall be able to cancel their own pending request. | MUST |
| FR-35 | Accepting a borrow request shall automatically create a transaction record. | MUST |

### 3.6 Transaction Lifecycle Module

| ID | Requirement | Priority |
|---|---|---|
| FR-36 | The transaction shall progress through defined states: ACCEPTED → HANDOVER_PENDING → ACTIVE → RETURN_PENDING → COMPLETED. | MUST |
| FR-37 | Both the owner and borrower must individually confirm the handover before the transaction becomes ACTIVE. | MUST |
| FR-38 | The borrower shall upload condition evidence photos at the time of handover. | SHOULD |
| FR-39 | The borrower shall initiate the return process; the owner shall confirm it with a condition grade. | MUST |
| FR-40 | The borrower shall be able to request an extension of the return deadline. | SHOULD |
| FR-41 | The owner shall approve or decline extension requests, with availability conflict checking. | SHOULD |
| FR-42 | The system shall automatically mark transactions as OVERDUE when the expected return time is exceeded. | MUST |
| FR-43 | Either participant shall be able to raise a dispute during ACTIVE, OVERDUE, or RETURN_PENDING states. | MUST |

### 3.7 Review and Trust Module

| ID | Requirement | Priority |
|---|---|---|
| FR-44 | Both borrower and owner shall be able to submit a review (1–5 stars + comment) after a COMPLETED transaction. | SHOULD |
| FR-45 | Each participant may submit only one review per transaction. | MUST |
| FR-46 | The system shall automatically recalculate and update a user's trust score after each transaction completion. | SHOULD |
| FR-47 | Trust score shall be influenced by: completed exchanges, average rating, on-time return rate, and dispute history. | SHOULD |

### 3.8 Messaging and Notifications Module

| ID | Requirement | Priority |
|---|---|---|
| FR-48 | Each accepted borrow request shall create a private conversation between borrower and owner. | SHOULD |
| FR-49 | Both participants shall be able to send and read messages within the conversation. | SHOULD |
| FR-50 | The system shall generate in-app notifications for: request received, accepted, rejected, handover confirmed, return confirmed, overdue, review received, and dispute updates. | MUST |
| FR-51 | Users shall be able to mark individual or all notifications as read. | SHOULD |

### 3.9 Community Module

| ID | Requirement | Priority |
|---|---|---|
| FR-52 | Verified students shall be able to create a Borrow Circle with name, description, rules, and university. | SHOULD |
| FR-53 | Students shall be able to join or leave circles using an invite link. | SHOULD |
| FR-54 | Items assigned to a circle shall only be visible to circle members. | SHOULD |
| FR-55 | Users shall be able to report items, users, or messages to administrators. | SHOULD |

### 3.10 Administration Module

| ID | Requirement | Priority |
|---|---|---|
| FR-56 | Administrators shall have access to a dashboard showing platform-wide statistics. | MUST |
| FR-57 | Administrators shall be able to view all users, items, transactions, borrow requests, disputes, reports, and reviews. | MUST |
| FR-58 | Administrators shall be able to verify, warn, suspend, or ban users. | MUST |
| FR-59 | Administrators shall be able to hide or delete item listings. | MUST |
| FR-60 | Administrators shall resolve disputes with a formal decision category and written explanation. | MUST |
| FR-61 | All administrative actions shall be recorded in an immutable audit log. | MUST |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | Passwords shall be hashed using bcrypt with a cost factor of 12. |
| NFR-02 | Security | Sessions shall use HTTP-only, SameSite=Lax JWT cookies. JWT secrets are never committed to version control. |
| NFR-03 | Security | Authentication and upload endpoints shall be rate-limited to prevent brute-force and abuse. |
| NFR-04 | Security | All HTTP responses shall include security headers (CSP, X-Frame-Options, X-Content-Type-Options) via Helmet.js. |
| NFR-05 | Security | API input shall be validated and sanitised before database use to prevent SQL injection and XSS. |
| NFR-06 | Performance | Marketplace queries shall respond within 500ms for datasets up to 1,000 items. |
| NFR-07 | Performance | API responses shall be compressed using gzip to reduce transfer size. |
| NFR-08 | Performance | Frequently queried columns (category, status, user IDs, timestamps) shall have database indexes. |
| NFR-09 | Usability | The interface shall be fully responsive across screen widths from 390px (mobile) to 1440px (desktop). |
| NFR-10 | Usability | The application shall support light and dark colour themes, respecting the OS preference by default. |
| NFR-11 | Usability | Page transitions and loading states shall use animations to maintain user orientation. |
| NFR-12 | Reliability | All multi-step database operations shall execute within atomic transactions to prevent partial writes. |
| NFR-13 | Reliability | The system shall return standardised HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 500. |
| NFR-14 | Maintainability | Business logic shall be separated into service modules, distinct from HTTP controllers. |
| NFR-15 | Maintainability | All shared utilities (validation, error handling, response formatting) shall reside in a single core utility module. |
| NFR-16 | Portability | The application shall be fully deployable via Docker with a single `docker compose up --build` command. |
| NFR-17 | Portability | All environment-specific configuration shall be provided via `.env` files; no secrets shall be hardcoded. |
| NFR-18 | Scalability | Database schema shall use normalised design (3NF) to support future growth without structural changes. |

---

## 5. System Constraints

1. Users must be registered with the same university to view and borrow each other's items.
2. Only verified users (email confirmed) may create item listings or borrow requests.
3. Item images depend on Cloudinary credentials — optional in development, required in production.
4. Payment checkout requires Razorpay Test Mode keys; a demo fallback is provided without them.
5. Email delivery in production requires SMTP configuration; development uses in-response token delivery.
6. The platform is scoped to a single university instance per deployment.

---

## 6. External Interface Requirements

### 6.1 User Interface
- Web browser-based SPA; no installation required
- Supports keyboard navigation and basic ARIA accessibility labels
- Consistent design system: custom CSS variables, Google-inspired typography

### 6.2 Hardware Interface
- Any device with a modern web browser and internet connection

### 6.3 Software Interface
- **Cloudinary API** — image upload and URL delivery
- **Razorpay API** — payment order creation and signature verification
- **MySQL 8** — primary data store via `mysql2/promise` connection pool

### 6.4 Communication Interface
- HTTPS for all production communication
- REST API with JSON request/response bodies
- HTTP-only cookies for session management

---

## 7. Appendix — Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 18 |
| Build Tool | Vite | Latest |
| Routing | React Router | v6 |
| Animations | Framer Motion | Latest |
| Charts | Recharts | Latest |
| Icons | Lucide React | Latest |
| Backend Framework | Express.js | Latest |
| Runtime | Node.js | 22.12+ |
| Database | MySQL | 8.0 |
| ORM/Driver | mysql2/promise | Latest |
| Auth | JSON Web Tokens (JWT) | — |
| Password Hashing | bcrypt | 12 rounds |
| File Upload | Multer + Cloudinary | — |
| Security | Helmet, CORS, express-rate-limit | — |
| Containerisation | Docker + Docker Compose | — |
