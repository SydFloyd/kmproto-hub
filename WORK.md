# Current work

Updated: 2026-09-07
Outcome: add Verseform to the KM Proto collection, linking to the intended
`https://verseform.kmproto.com` production origin.

Implemented: Verseform is the third of five projects, immediately before Shep Study
and Milk Yeller. Its copy focuses on writing and inline Scripture insertion, with a
typographic reference specimen in the existing editorial card system. The project
count is five. No dependency, metadata, navigation, or deployment workflow changed.

Checks: `npm run build:vercel` and `npm run lint` passed on a fresh clone with the
existing lockfile. The dev route compiled and returned HTTP 200 at localhost:3001.
Source order is Verseform → Shep Study → Milk Yeller and the target link is exact.
The earlier responsive/browser evidence for the common card system remains the
baseline; no new visual-browser claim was made for this small addition.

Preview: Vinext development server is on localhost:3001 while the process remains
running. Dependencies were installed only in the disposable clone.

Deployment: Vercel's built-in GitHub integration was connected after the review
branch was pushed. An empty trigger commit, `a040c21`, produced a Vercel preview
deployment that the user reviewed and approved. That commit was fast-forwarded to
`main` and pushed on 2026-09-04. Vercel reported the production deployment as
started; check its dashboard before calling the production site verified.

The old GitHub Actions workflow remains unconfigured: its repository Actions
secrets list is empty, and its last inspected run failed because --token had no value:
https://github.com/SydFloyd/kmproto-hub/actions/runs/32672689484
The existing workflow requires VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID.
No credential values were requested/read. No deployment has been performed.

Next: do not publish the hub card until the Verseform Vercel project and final domain
are live, so kmproto.com does not ship a broken destination. The Verseform CLI/browser
session is logged out. After owner sign-in, import `SydFloyd/verseform`, assign
`verseform.kmproto.com`, copy the project-specific CNAME shown by Vercel into DNS,
verify HTTPS/live DBS/offline reopening, then push this hub commit to main. The old
GitHub Actions workflow remains redundant and unconfigured; this item does not change it.
