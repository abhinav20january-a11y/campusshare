# Razorpay integration

The animated card introduces Razorpay Standard Checkout. Actual payment details are entered only in Razorpay's hosted window. When Test keys are absent, the same component switches to an explicitly labelled local demonstration; its receipt can never be treated as a Razorpay payment.

## Configure the college test integration

1. Generate Test Mode keys in your own Razorpay dashboard.
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env`. Never put the secret in React, Git, screenshots or chat.
3. Run `npm run db:setup --prefix server` to install the payment table on a new development database. The current local database has already been migrated.
4. Restart the Express server. Sign in again if its development session key changed.
5. Open an accepted exchange as the borrower, choose **Continue to secure payment**, flip the preview card if desired, then open Razorpay Test Checkout.
6. Use the test methods documented in the Razorpay dashboard. Do not enter a real card for this demonstration.
7. Configure automatic capture in Razorpay. Authorized is shown as pending; only captured is displayed as verified completion.

## Implemented protections

- Server-created INR orders at a server-controlled ₹100 TEST amount; client amounts are ignored.
- Participant access checks and borrower-only order creation and verification.
- One locally stored gateway order per exchange; repeat checkout reuses that order.
- HMAC SHA-256 signature verification using the stored order ID, followed by a Razorpay API lookup checking amount, currency, order and capture status.
- Dedicated MySQL gateway records; simulated receipts cannot mark a gateway order paid.
- Failure, cancellation and missing-key states do not report payment success.
- Live keys are intentionally rejected. This is a real gateway integration in Test Mode, not live monetary billing.

## Still required before accepting real money

End-to-end testing requires your Test Mode keys. Production also needs merchant activation, agreed rental/deposit/fee calculations, reconciliation/webhooks for interrupted checkout, a refund/dispute policy, settlement decisions (platform vs student payouts), production secrets and HTTPS. No automatic lender payouts or refunds are implemented. A lost verification callback must be reconciled with the Razorpay dashboard; do not ask a borrower to pay again without checking it.

Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
