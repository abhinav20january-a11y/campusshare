# Test Case Documentation — CampusShare

**Version:** 1.0  
**Date:** October 2026  
**Tester:** SE Project Team

---

## 1. Test Environment

| Item | Detail |
|---|---|
| Operating System | Windows 10/11 |
| Browser | Google Chrome 120+ |
| Database | MySQL 8 (local, seeded with demo data) |
| Server | Node.js 22.12+ |
| Test Runner | Node.js built-in `node:test` |
| API Testing | curl / Postman |
| Test accounts | student@campusshare.demo, lender@campusshare.demo, admin@campusshare.demo |

---

## 2. Test Types Used

| Type | Description | Used In |
|---|---|---|
| **Unit Testing** | Test individual functions in isolation | TC-31 to TC-44 (utils), TC-45 to TC-47 (payment) |
| **Integration Testing** | Test API endpoint + database interaction | TC-26 to TC-30 (smoke tests) |
| **Functional Testing** | Test complete user flows | TC-01 to TC-25 |
| **Boundary Testing** | Test at the edge of valid input ranges | TC-03, TC-25, TC-38, TC-42 |
| **Negative Testing** | Test with invalid inputs to verify rejection | TC-02, TC-05, TC-06, TC-10, TC-12, TC-13, TC-17, TC-18 |

---

## 3. Test Cases

### Category 1: Authentication (Manual Functional Testing)

| TC-ID | Test Case Name | Pre-condition | Input | Expected Output | Type | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-01 | Valid user registration | No existing account | name="Aarav Singh", email="aarav@dtu.ac.in", password="Student@123", university="DTU" | 201 Created; user object returned; developmentVerificationToken in response | Positive | PASS |
| TC-02 | Duplicate email registration | TC-01 user already exists | Same email as TC-01 | 409 Conflict; "email already registered" | Negative | PASS |
| TC-03 | Registration with short password | None | password="weak" (8 chars) | 400 Bad Request; password validation error | Boundary | PASS |
| TC-04 | Email verification with valid token | TC-01 registration complete | POST /api/auth/verify-email with correct token | 200 OK; verified=true in database | Positive | PASS |
| TC-05 | Email verification with expired/wrong token | Token generated but invalid | POST /api/auth/verify-email with random token | 400 Bad Request; "invalid or expired token" | Negative | PASS |
| TC-06 | Login with correct credentials | TC-04 verification complete | email="aarav@dtu.ac.in", password="Student@123" | 200 OK; user object; campusshare cookie set | Positive | PASS |
| TC-07 | Login with wrong password | Valid user exists | Correct email + wrong password | 401 Unauthorized | Negative | PASS |
| TC-08 | Login with non-existent email | None | fake@test.com + any password | 401 Unauthorized | Negative | PASS |
| TC-09 | Access protected route without token | Not logged in | GET /api/users/me (no cookie) | 401 Unauthorized | Negative | PASS |
| TC-10 | Logout | Logged in user | POST /api/auth/logout | 200 OK; campusshare cookie cleared | Positive | PASS |

---

### Category 2: Item Management (Manual Functional Testing)

| TC-ID | Test Case Name | Pre-condition | Input | Expected Output | Type | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-11 | Create item listing | Verified user logged in | name="Scientific Calculator", category="Academic", condition="GOOD", location="Block A" | 201 Created; item ID returned | Positive | PASS |
| TC-12 | Create item with missing required field | Logged in | name="" (empty), rest valid | 400 Bad Request; validation error | Negative | PASS |
| TC-13 | Edit item by owner | Item exists, owner logged in | PUT /api/items/:id with updated name | 200 OK; updated item data | Positive | PASS |
| TC-14 | Edit item by non-owner | Item exists, different user logged in | PUT /api/items/:id | 403 Forbidden | Negative | PASS |
| TC-15 | Delete item (no active transactions) | Item with no transactions | DELETE /api/items/:id | 200 OK; item status=DELETED | Positive | PASS |
| TC-16 | Delete item with active transaction | Item has ACTIVE transaction | DELETE /api/items/:id | 409 Conflict; "cannot delete with active exchanges" | Negative | PASS |

---

### Category 3: Marketplace (Manual Functional Testing)

| TC-ID | Test Case Name | Pre-condition | Input | Expected Output | Type | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-17 | Browse all items | Items exist in DB | GET /api/items | 200 OK; paginated items array (max 24) | Positive | PASS |
| TC-18 | Search items by keyword | Items seeded | GET /api/items?q=calculator | 200 OK; only items matching "calculator" | Positive | PASS |
| TC-19 | Filter by category | Items with different categories | GET /api/items?category=Electronics | 200 OK; only Electronics items | Positive | PASS |
| TC-20 | Filter by available dates | Items with bookings | GET /api/items?start=2025-12-01&end=2025-12-03 | 200 OK; excludes fully booked items | Positive | PASS |
| TC-21 | Favourite an item | Logged in, item exists | POST /api/items/:id/favorite | 200 OK; item saved | Positive | PASS |
| TC-22 | Unfavourite an item | Item already favourited | DELETE /api/items/:id/favorite | 200 OK; item removed from saved | Positive | PASS |

---

### Category 4: Transaction Lifecycle (Manual Functional Testing)

| TC-ID | Test Case Name | Pre-condition | Input | Expected Output | Type | Pass/Fail |
|---|---|---|---|---|---|---|
| TC-23 | Create borrow request (valid dates) | Item available, borrower verified | POST /api/borrow-requests with future start/end | 201 Created; request in REQUESTED status | Positive | PASS |
| TC-24 | Create borrow request for own item | Owner logged in | POST /api/borrow-requests with own item ID | 400 Bad Request; "cannot borrow your own item" | Negative | PASS |
| TC-25 | Create overlapping borrow request | Item already booked for dates | POST /api/borrow-requests with conflicting dates | 409 Conflict; "dates not available" | Boundary | PASS |
| TC-26 | Accept borrow request | Owner logged in, request in REQUESTED | PUT /api/borrow-requests/:id/accept | 200 OK; transaction created; status=ACCEPTED | Positive | PASS |
| TC-27 | Reject borrow request | Owner logged in, request REQUESTED | PUT /api/borrow-requests/:id/reject | 200 OK; request status=REJECTED | Positive | PASS |
| TC-28 | Confirm handover (owner first) | Transaction in ACCEPTED | POST /api/transactions/:id/handover (owner token) | 200 OK; status=HANDOVER_PENDING | Positive | PASS |
| TC-29 | Confirm handover (borrower completes) | Transaction in HANDOVER_PENDING | POST /api/transactions/:id/handover (borrower token) | 200 OK; status=ACTIVE | Positive | PASS |
| TC-30 | Initiate return by borrower | Transaction ACTIVE | POST /api/transactions/:id/return (step=initiate) | 200 OK; status=RETURN_PENDING | Positive | PASS |
| TC-31 | Confirm return by owner | Transaction RETURN_PENDING | POST /api/transactions/:id/return (step=confirm, owner token) | 200 OK; status=COMPLETED | Positive | PASS |
| TC-32 | Submit review after completion | Transaction COMPLETED | POST /api/reviews with rating=5, comment="Great!" | 201 Created; review stored | Positive | PASS |
| TC-33 | Submit review with invalid rating | Transaction COMPLETED | POST /api/reviews with rating=0 | 400 Bad Request; rating validation error | Boundary | PASS |
| TC-34 | Submit review before completion | Transaction ACTIVE | POST /api/reviews | 403 Forbidden; "transaction not completed" | Negative | PASS |

---

### Category 5: Access Control (Automated — smoke.test.js)

| TC-ID | Test Case Name | Input | Expected Output | Automated? | Pass/Fail |
|---|---|---|---|---|---|
| TC-35 | Database health check | GET /api/health | 200 OK; `{database: "connected"}` | ✅ Yes | PASS |
| TC-36 | Public catalogue access without auth | GET /api/items | 200 OK; items array | ✅ Yes | PASS |
| TC-37 | Protected route without auth token | GET /api/users/me (no cookie) | 401 Unauthorized | ✅ Yes | PASS |
| TC-38 | Student cannot access admin panel | GET /api/admin/dashboard (student token) | 403 Forbidden | ✅ Yes | PASS |
| TC-39 | Wrong password rejected at login | POST /api/auth/login (wrong password) | 401 Unauthorized | ✅ Yes | PASS |

---

### Category 6: Payment (Automated — razorpay.test.js, demo-payment.test.js)

| TC-ID | Test Case Name | Input | Expected Output | Automated? | Pass/Fail |
|---|---|---|---|---|---|
| TC-40 | Valid Razorpay HMAC signature | Correct orderId + paymentId + secret | Signature valid = true | ✅ Yes | PASS |
| TC-41 | Tampered order ID fails verification | Modified orderId | Signature valid = false | ✅ Yes | PASS |
| TC-42 | Payment config never enables live charges | Check config mode | mode = "test" (never "live") | ✅ Yes | PASS |
| TC-43 | Owner cannot pay for own transaction | POST /api/transactions/:id/demo-payment (owner token) | 403 Forbidden | ✅ Yes | PASS |
| TC-44 | Borrower can access demo checkout | POST /api/transactions/:id/demo-payment (borrower token) | 200 OK | ✅ Yes | PASS |

---

### Category 7: Unit Tests — Utility Functions (Automated — core.test.js)

| TC-ID | Test Case Name | Function | Input | Expected Output | Pass/Fail |
|---|---|---|---|---|---|
| TC-45 | ensure() passes for true condition | `ensure()` | true, 400, "msg" | No error thrown | PASS |
| TC-46 | ensure() throws AppError for false | `ensure()` | false, 400, "Test error" | AppError with status=400 | PASS |
| TC-47 | text() accepts valid string | `text()` | "Hello World", "Name", 100 | "Hello World" | PASS |
| TC-48 | text() trims whitespace | `text()` | "  hello  ", "Name", 100 | "hello" | PASS |
| TC-49 | text() rejects empty string | `text()` | "", "Name", 100, 1 | AppError status=400 | PASS |
| TC-50 | text() rejects string over max length | `text()` | "a"×201, "Name", 200 | AppError status=400 | PASS |
| TC-51 | id() accepts valid positive integer | `id()` | "42" | 42 (number) | PASS |
| TC-52 | id() rejects zero | `id()` | "0" | AppError status=400 | PASS |
| TC-53 | id() rejects negative | `id()` | "-5" | AppError status=400 | PASS |
| TC-54 | id() rejects non-numeric | `id()` | "abc" | AppError status=400 | PASS |
| TC-55 | date() parses valid ISO datetime | `date()` | "2025-06-15T10:00:00" | Contains "2025-06-15" | PASS |
| TC-56 | date() rejects invalid string | `date()` | "not-a-date" | AppError status=400 | PASS |

---

## 4. Test Execution Commands

### Run all automated tests:
```powershell
# Terminal 1 — start server
npm run build
npm start

# Terminal 2 — run tests
npm test
```

### Expected output:
```
✔ database health and paginated catalog (45ms)
✔ private resources require authentication (12ms)
✔ student can read workspace but cannot access administrator data (18ms)
✔ invalid credentials are rejected (203ms)
✔ Razorpay signatures bind the stored order to the payment (1ms)
✔ payment configuration never enables live charges (0ms)
✔ demo checkout is participant-only and rejects owner payment (25ms)
✔ borrower can inspect checkout (22ms)

8 tests passed
```

### Run unit tests only (no server needed):
```powershell
npm --prefix server run test:unit
```

---

## 5. Test Summary Report

| Category | Total TCs | Automated | Manual | Pass | Fail |
|---|---|---|---|---|---|
| Authentication | 10 | 2 | 8 | 10 | 0 |
| Item Management | 6 | 0 | 6 | 6 | 0 |
| Marketplace | 6 | 0 | 6 | 6 | 0 |
| Transaction Lifecycle | 12 | 0 | 12 | 12 | 0 |
| Access Control | 5 | 5 | 0 | 5 | 0 |
| Payment | 5 | 5 | 0 | 5 | 0 |
| Unit Tests (Utils) | 12 | 12 | 0 | 12 | 0 |
| **TOTAL** | **56** | **24** | **32** | **56** | **0** |

---

## 6. Boundary Conditions Tested

| Feature | Boundary Condition | Test Case |
|---|---|---|
| Password length | Minimum 10 characters — tested with 8 characters | TC-03 |
| Review rating | Minimum 1, Maximum 5 — tested with 0 (invalid) | TC-33 |
| Borrow request dates | Overlapping with existing booking | TC-25 |
| Text validation | Empty string (min=1) and string over max length | TC-49, TC-50 |
| ID validation | Zero and negative IDs rejected | TC-52, TC-53 |
| Date validation | Non-date string rejected | TC-56 |

---

## 7. Defects Found and Status

| Defect ID | Description | Severity | Status |
|---|---|---|---|
| BUG-01 | Overdue detection function exists but is not triggered automatically | Medium | Open — scheduled cron job needed |
| BUG-02 | User badges table exists in DB but no backend logic awards badges | Low | Open — feature not implemented |
| BUG-03 | Review sub-ratings (communication, punctuality, item_care) all set equal to main rating | Low | Open — review form only collects one rating |
