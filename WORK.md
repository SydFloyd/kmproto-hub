# Current work

Updated: 2026-09-04
Outcome: give kmproto.com a more polished, distinctive landing page while keeping
its four existing project destinations and lightweight static deployment.

Implemented: warm ivory / forest green editorial design, oversized serif headline,
CSS-drawn project illustrations, responsive cards, about section, keyboard skip
link, visible focus treatment, reduced-motion support, consistent page metadata
and matching favicon. No dependency or deployment workflow changes. Removed the
unused Tailwind CSS import after the production build exposed unprocessed directives.

Checks: production Vite build, ESLint and TypeScript passed. Browser checks and
screenshots pass at 1440, 768, 390 and 320px: correct project links, working skip
and return links, no horizontal overflow or page errors, and zero axe WCAG A/AA
violations after correcting the record-label contrast. Desktop and phone screenshots
were visually inspected. This is Chromium verification, not an all-browser guarantee. Full Git integrity passed
on the fresh clone; no pre-existing working edits were present.

Host: Node was absent. Verified official Node 22.23.2 archive against its SHA-256
and unpacked under /tmp/kmproto-toolchain. npm dependencies use the existing lockfile.
Temporary Playwright, Chromium and extracted Debian libraries live under /tmp;
temporary Liberation / DejaVu fonts supplied through /tmp/kmproto-fonts.conf;
no system packages installed. These temporary paths may disappear between sessions.
For normal hosts, use the project's supported Node version and npm ci.

Preview: Vite production preview on 127.0.0.1:4173 while the process remains running.
Ignored outputs/ holds browser verification script, results and screenshots.

Deployment blocker: GitHub repository Actions secrets list is empty. The last
inspected deployment run failed because --token had no value:
https://github.com/SydFloyd/kmproto-hub/actions/runs/32672689484
The existing workflow requires VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID.
No credential values were requested/read. No deployment has been performed.

Next: restore the Vercel connection with the user
and publish the reviewed change through the existing workflow. Never paste tokens
into chat or commit them. Main pushes trigger production deployment; avoid publishing
unreviewed work. Do not rerun a failing deployment until its missing connection is fixed.
