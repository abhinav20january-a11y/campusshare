# Software Architecture Document
# CampusShare — High-Level Design (HLD)

**Version:** 1.0  
**Date:** October 2026

---

## 1. Architecture Overview

CampusShare follows a **Three-Tier Layered REST Architecture** — the industry standard for full-stack web applications.

```
┌─────────────────────────────────────────────────┐
│           TIER 1: PRESENTATION LAYER             │
│         React 18 SPA (client/)                   │
│   Pages │ Components │ Context │ Hooks │ API     │
└─────────────────────┬───────────────────────────┘
                      │ HTTP/JSON REST API
                      │ (secure HTTP-only cookies)
┌─────────────────────▼───────────────────────────┐
│           TIER 2: APPLICATION LOGIC LAYER        │
│         Express.js (server/src/)                 │
│  Routes │ Middleware │ Controllers │ Services    │
└─────────────────────┬───────────────────────────┘
                      │ SQL queries via
                      │ mysql2/promise pool
┌─────────────────────▼───────────────────────────┐
│           TIER 3: DATA LAYER                     │
│         MySQL 8 (21 tables)                      │
│  Users │ Items │ Transactions │ Community        │
└─────────────────────────────────────────────────┘

External Services:
  Cloudinary ◄──── Image upload (Tier 2)
  Razorpay   ◄──── Payment orders (Tier 2)
```

---

## 2. Frontend Architecture (client/)

### 2.1 Technology
- **React 18** — component-based UI framework
- **Vite** — build tool (hot module replacement in development)
- **React Router v6** — client-side routing
- **Framer Motion** — animations and transitions
- **Recharts** — charts for dashboard and analytics
- **Lucide React** — icon library

### 2.2 Folder Structure

```
client/src/
├── api/
│   └── client.js          ← Fetch wrapper: GET, POST, PUT, DELETE helpers
├── context/
│   └── AppContext.jsx      ← Global state: user, theme, toast, act()
├── hooks/
│   └── useData.js         ← Data fetching hook with loading/error states
├── components/
│   ├── common/
│   │   ├── UI.jsx         ← Button, Field, Badge, Modal, ItemCard, Avatar
│   │   ├── Uploads.jsx    ← Image upload component
│   │   ├── DemoPayment.jsx← Demo checkout UI
│   │   └── ErrorBoundary.jsx
│   └── layout/
│       └── Layout.jsx     ← Navigation bar + page wrapper
└── pages/
    ├── Home.jsx           ← Landing page, featured items, categories
    ├── Marketplace.jsx    ← Browse, search, filter items
    ├── ItemDetail.jsx     ← Single item view + borrow request form
    ├── Transaction.jsx    ← Full transaction management
    ├── Workspace.jsx      ← Dashboard, exchanges, requests, my items, calendar
    ├── Community.jsx      ← Notifications, circles, profile, disputes
    ├── Admin.jsx          ← Administration panel
    ├── Auth.jsx           ← Register, login, verify, reset password
    ├── Settings.jsx       ← Profile settings + onboarding wizard
    └── Messages.jsx       ← Conversation and messaging UI
```

### 2.3 Key Design Decisions

| Decision | Rationale |
|---|---|
| **React SPA** | Single page load; faster navigation after initial load |
| **Lazy loading (React.lazy)** | Pages load only when visited — better initial performance |
| **Context API** | Global state (user session, theme) without a third-party library |
| **Custom useData hook** | Encapsulates fetch + loading + error + refresh in one place |
| **HTTP-only cookies** | JWT cannot be read by JavaScript — prevents XSS token theft |
| **Vanilla CSS** | Full control over design; no framework overhead |

---

## 3. Backend Architecture (server/src/)

### 3.1 Technology
- **Node.js 22.12+** — JavaScript runtime
- **Express.js** — HTTP server and routing framework
- **mysql2/promise** — MySQL database driver with Promise API
- **JSON Web Tokens (JWT)** — stateless session tokens
- **bcrypt** — password hashing (12 rounds)
- **Helmet** — HTTP security headers
- **express-rate-limit** — request throttling
- **Multer** — multipart file upload handling
- **Cloudinary SDK** — image storage
- **Razorpay SDK** — payment gateway

### 3.2 Folder Structure

```
server/src/
├── server.js              ← Entry point: creates HTTP server
├── app.js                 ← Express setup: middleware, routes, error handler
├── config/
│   ├── db.js              ← MySQL connection pool + query() + atomic()
│   ├── env.js             ← Environment variable loading + JWT secret
│   └── cloudinary.js      ← Cloudinary configuration
├── middleware/
│   └── auth.js            ← auth(), requireAdmin(), verified() middleware
├── routes/
│   ├── index.js           ← ALL API routes registered here
│   ├── razorpay.js        ← Razorpay payment routes
│   └── demoPayments.js    ← Demo checkout routes
├── controllers/
│   ├── authController.js       ← Register, login, logout, verify, reset
│   ├── userController.js       ← Profile CRUD, avatar, preferences
│   ├── itemController.js       ← Item CRUD, search, pagination, analytics
│   ├── transactionController.js← View transactions, extensions, reviews
│   ├── communityController.js  ← Messages, notifications, circles, disputes
│   └── adminController.js      ← Dashboard, moderation, audit logs
├── services/
│   ├── borrowing.js       ← Core business logic: state machine transitions
│   ├── events.js          ← notify(), event(), audit(), updateTrust()
│   └── razorpay.js        ← Payment order + signature verification
└── utils/
    └── core.js            ← ensure(), text(), id(), date(), ok(), wrap()
```

### 3.3 Request Lifecycle

```
HTTP Request
    │
    ▼
app.js middleware pipeline:
  1. helmet()           ← security headers
  2. cors()             ← origin whitelist
  3. compression()      ← gzip
  4. cookieParser()     ← parse JWT cookie
  5. express.json()     ← parse JSON body
    │
    ▼
routes/index.js
  → match URL to route handler
    │
    ▼
auth middleware (if protected route):
  auth()        ← verify JWT, attach req.user
  verified()    ← check email verified
  requireAdmin()← check role === 'ADMIN'
    │
    ▼
Controller function:
  → validate input with text(), id(), date(), ensure()
  → call service function (for complex logic)
  → query database via db.query() or db.atomic()
  → return ok(res, data) or throw AppError
    │
    ▼
Error handler (app.js):
  → catches AppError or unknown errors
  → returns { success: false, error: message }
    │
    ▼
HTTP Response
```

### 3.4 Module Responsibilities

| Module | File | Responsibility |
|---|---|---|
| Entry | `server.js` | Start HTTP server on configured port |
| App | `app.js` | Middleware chain, route registration, error handler |
| Database | `config/db.js` | Connection pool, `query()`, `atomic()` |
| Environment | `config/env.js` | Load `.env`, validate required vars, generate JWT secret |
| Auth Middleware | `middleware/auth.js` | JWT verification, role enforcement |
| Core Utils | `utils/core.js` | Input validation, response helpers, error factory |
| Auth Controller | `authController.js` | Authentication flows |
| User Controller | `userController.js` | Profile management |
| Item Controller | `itemController.js` | Item CRUD, search, analytics |
| Transaction Controller | `transactionController.js` | Transaction views, extensions, reviews |
| Community Controller | `communityController.js` | Messaging, notifications, circles, disputes |
| Admin Controller | `adminController.js` | Platform moderation, statistics |
| Borrowing Service | `services/borrowing.js` | **Core state machine** — all transaction transitions |
| Events Service | `services/events.js` | Notifications, audit events, trust score updates |
| Razorpay Service | `services/razorpay.js` | Payment order creation, HMAC signature verification |

---

## 4. Database Architecture

### 4.1 Overview
- **Engine:** MySQL 8.0
- **Design:** Third Normal Form (3NF) — no redundant data
- **Tables:** 21
- **Transactions:** Multi-step operations use `atomic()` wrapper (BEGIN/COMMIT/ROLLBACK)
- **Indexing:** Foreign keys, status columns, and timestamp columns are indexed

### 4.2 Table Groups

**Users & Auth (3 tables)**
```
users ──────────────── auth_tokens
  │                         (verification + reset tokens)
  └────────────────── user_badges (future)
```

**Items & Uploads (5 tables)**
```
items ──── item_images ──── uploads (Cloudinary refs)
  │──── item_rules
  └──── item_availability
```

**Borrowing (6 tables)**
```
borrow_requests ──────────── transactions
                                 │──── transaction_events
                                 │──── handover_evidence
                                 └──── return_evidence
favorites (user ↔ item)
```

**Community (5 tables)**
```
conversations ──── conversation_participants
                └── messages
notifications
reviews
```

**Groups & Admin (4 tables)**
```
circles ──── circle_members
disputes ──── dispute_evidence
reports
audit_logs
```

### 4.3 Key Database Functions

| Function | Location | Purpose |
|---|---|---|
| `query(sql, params)` | `config/db.js` | Execute a parameterised SQL query |
| `atomic(fn)` | `config/db.js` | Run `fn(connection)` inside BEGIN/COMMIT/ROLLBACK |
| `updateTrust(userId)` | `services/events.js` | Recalculate trust score after transaction completion |
| `notify(userId, type, title, link)` | `services/events.js` | Insert notification and update unread count |
| `event(txId, actorId, state, note)` | `services/events.js` | Append transaction event to audit timeline |

---

## 5. Design Patterns Used

| Pattern | Where Used | Purpose |
|---|---|---|
| **Middleware Chain** | `app.js`, `routes/index.js` | Auth, rate limiting, validation applied per-route without repetition |
| **Service Layer** | `services/` | Complex business logic separated from HTTP controllers — independently testable |
| **Repository-lite** | `config/db.js` | `query()` abstracts raw `mysql2` calls throughout the app |
| **Context (React)** | `AppContext.jsx` | Global state (user, theme, toast) without prop-drilling |
| **Factory / Error** | `utils/core.js (AppError)` | Consistent error objects with HTTP status codes |
| **Lazy Loading** | `App.jsx` | `React.lazy()` defers page bundle loading until navigation |
| **Atomic Transaction** | `config/db.js (atomic)` | Prevents partial writes in multi-step DB operations |
| **Guard Clause** | `utils/core.js (ensure)` | Early exit pattern — validates inputs before processing |

---

## 6. Security Architecture

| Mechanism | Implementation | Protection Against |
|---|---|---|
| **Password hashing** | bcrypt (12 rounds) | Rainbow table attacks |
| **JWT in HttpOnly cookie** | `res.cookie('campusshare', token, {httpOnly:true})` | XSS token theft |
| **Token versioning** | `token_version` column in `users` table | Instant session revocation on logout/password change |
| **Rate limiting** | express-rate-limit: 80 req/15min (auth), 15 req/min (upload) | Brute force and DoS |
| **Input sanitisation** | `text()`, `id()`, `date()` in `utils/core.js` | SQL injection, type coercion attacks |
| **Security headers** | Helmet.js with custom CSP | Clickjacking, MIME sniffing, XSS |
| **CORS whitelist** | `app.js` | Cross-origin request forgery |
| **Role checks** | `requireAdmin()` middleware | Privilege escalation |
| **Participant checks** | Inline in `borrowing.js` | Unauthorised transaction actions |
| **HTTPS** | Enforced in production via `secure: true` cookie flag | Man-in-the-middle attacks |

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Docker Environment            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      app container               │  │
│  │  Node.js + Express (port 3000)  │  │
│  │  Serves: API + static React build│  │
│  └────────────────┬─────────────────┘  │
│                   │                     │
│  ┌────────────────▼─────────────────┐  │
│  │      db container                │  │
│  │  MySQL 8 (port 3306)            │  │
│  │  Volume: ./mysql-data            │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

External:
  Cloudinary CDN  ←── image delivery
  Razorpay API    ←── payment processing
```

**Start production:** `docker compose up --build`  
**Auto-migration:** On first boot, `db:setup` script creates tables and seeds demo data.

---

## 8. API Design Conventions

| Convention | Detail |
|---|---|
| **Base URL** | `/api/` |
| **Auth** | HTTP-only cookie `campusshare` |
| **Success response** | `{ success: true, data: { ... } }` |
| **Error response** | `{ success: false, error: "message" }` |
| **HTTP status codes** | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Server Error |
| **Pagination** | `?page=1&limit=24` query params |
| **Filtering** | Query params: `?category=Electronics&condition=GOOD&q=calculator` |
| **ID validation** | All path params validated with `id()` — must be positive integer |
| **Input validation** | All string inputs validated with `text(value, field, maxLength, minLength)` |
