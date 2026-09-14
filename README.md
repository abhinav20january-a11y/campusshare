# CampusShare

CampusShare is a full-stack campus borrowing platform. Verified students can discover items, send requests, message owners, record two-sided handovers and returns, review exchanges, create circles, report problems, and complete a Razorpay Test Mode checkout.

The launch application is the React client in `client/` backed by the Express/MySQL API in `server/`. The older static BorrowBox prototype remains in `public/` only as design-history material; it is not the deployment entrypoint.

## Local development

Requirements: Node.js 22.12+, npm, and MySQL 8.

1. Copy `server/.env.example` to `server/.env` and enter your local database settings.
2. Install packages with `npm ci`, `npm --prefix client ci`, and `npm --prefix server ci`.
3. Create and seed the database with `npm --prefix server run db:setup`.
4. Start the API with `npm --prefix server start`.
5. Start the frontend with `npm --prefix client run dev`.
6. Open `http://127.0.0.1:5173`.

Development accounts:

- `student@campusshare.demo` / `Student123!`
- `lender@campusshare.demo` / `Lender123!`
- `admin@campusshare.demo` / `Admin123!`

## Production-like local start

Build the React application and serve it with the API on one origin:

```sh
npm run build
npm start
```

Open `http://localhost:3000`. MySQL must match the values in `server/.env`.

## Collaboration and documentation

- [Technology stack PDF](output/pdf/CampusShare-Tech-Stack.pdf)
- [Contribution guide](CONTRIBUTING.md)
- [Design handoff and launch checklist](DESIGN-HANDOFF.md)

This repository is public source code, not a publicly deployed website. Never commit `.env` files, production credentials, database dumps or real user data. Demo credentials are for a local seeded database only.

## Integration tests

With MySQL seeded and the unified app running through `npm start` on port 3000:

```sh
npm test
```

This builds the frontend and checks authentication, permissions, public catalogue access, transactions, demonstration payments, and Razorpay signature handling.

## Razorpay Test Mode

Add only Razorpay **Test Mode** credentials to `server/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_test_secret
```

The browser requests an order from the server, then opens Razorpay’s hosted checkout. CampusShare verifies the signature and retrieves the payment from Razorpay before marking it verified. Secrets never enter client JavaScript, and the application rejects live-mode keys.

If Test keys are absent, the checkout clearly switches to a safe animated college demonstration. No bank, card network, or gateway is contacted.

## Containers

Create a private `.env` beside `docker-compose.yml` with strong database and JWT secrets, and optional Razorpay/Cloudinary credentials. Then run:

```sh
docker compose up --build
```

The container build compiles the React client, installs production server packages, waits for MySQL, creates the schema and demo dataset when the database is empty, and serves the UI and API together at `http://localhost:3000`.

## Before a public launch

- Replace all demonstration accounts and rotate every secret.
- Use a managed MySQL instance with encrypted backups.
- Configure HTTPS and the final public `CLIENT_URL`.
- Configure email delivery and keep `DEMO_VERIFICATION=false`.
- Add real Cloudinary credentials if uploads are required.
- Complete Razorpay account/KYC setup, keep this build in Test Mode until acceptance testing is signed off, and add webhook reconciliation before enabling live money.
- Run accessibility, security, browser, and load testing in the production environment.
