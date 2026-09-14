# Working on CampusShare together

The active application is `client/` (React) and `server/` (Express/MySQL). Do not use the legacy `public/index.html` as the application entry point.

1. Clone this repository and follow README.md to install dependencies and create your own local MySQL database.
2. Copy `server/.env.example` to `server/.env`. Keep private values on your own machine.
3. Create a branch: `git switch -c feature/short-description`.
4. Make the change and run `npm run check`. With the local database and server running, run `npm test`.
5. Commit and push the branch, then open a pull request into `main`.

## Access

Anyone can view and fork this public repository. A friend without write access can fork it and submit a pull request. The owner can grant direct access through GitHub Settings > Collaborators > Add people; the invited user must accept the invitation.

## Keep safe

- Never commit `.env`, API keys, passwords from real accounts, or database exports.
- Keep Razorpay in test mode; do not add live payment support without review.
- Preserve the animated checkout and custom 404 when editing the visual system.
- Test desktop and mobile, keyboard navigation and reduced-motion behavior.
- Document new environment variables in `.env.example` with empty values or obvious placeholders.
