# Campus Objects design handoff

Selected direction: the user's blue-and-white reference, with serif headings, readable DM Sans UI, product photography and restrained motion.

## Implemented

- New responsive homepage, product still life, segmented campus search, category strip and featured listings.
- Shared design system for marketplace, item details, authentication, dashboard, requests, exchanges, listings, messages, settings, community, administration and information pages.
- Locally bundled fonts, native scrolling, responsive navigation, focus indicators and reduced-motion support.
- Existing animated payment experience and custom 404 preserved.
- Existing appearance preferences are preserved. Choose Settings → Appearance → Light if your browser previously saved Dark.

## Verification

- `npm run check`: production client build and server syntax checks passed.
- `npm test`: 8 integration tests passed against the local MySQL-backed server, including authentication, access control, catalogue and payment safeguards.
- Automated Chrome page-load checks at 1440px and 390px covered 24 routes per viewport. No page exceptions, broken loaded images or document horizontal overflow were observed.
- Screenshots reviewed for homepage, marketplace and settings. These checks are not an exhaustive audit of every interaction or a guarantee of production readiness.

## Artwork

The hero is a built-in ImageGen output, optimized to a 1200px JPEG at `client/public/assets/generated/campus-objects-hero.jpg`. Generation direction: premium photoreal product still life of orange headphones, a silver camera on books, scientific calculator and green plant against a pale blue seamless background; no baked-in interface or logos. Existing catalogue photos remain illustrative demo images, not verified photographs of the named products.

## Before public launch

- Razorpay is intentionally test-only. Live charging requires a separate reviewed implementation/configuration change; adding live keys alone is not supported.
- Configure production database, secrets, HTTPS, email delivery, upload storage and public webhook endpoint; verify backups and payment reconciliation.
- Replace demo accounts/listings and illustrative catalogue photographs with real approved campus data.
- Review privacy, terms, safety and dispute procedures with the actual operator.

Run `npm start`, then open http://localhost:3000. Use the server, not a file:// copy of index.html.
