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

Preview: the disposable Vinext development server supported the local check and was
stopped after production verification. Dependencies were installed only in the clone.

Deployment: Verseform's Vercel project and final custom domain are live. Vercel
reports valid production configuration for `verseform.kmproto.com`; HTTPS navigation
and a real NASB John 3:16 insertion passed on that origin. The Verseform card commit
was pushed to this repository's `main` branch on 2026-09-07, allowing the existing
Vercel Git integration to publish the updated collection. `https://www.kmproto.com`
then rendered five projects in the expected order and its Verseform card opened the
custom production origin successfully.

The old GitHub Actions workflow remains unconfigured: its repository Actions
secrets list is empty, and its last inspected run failed because --token had no value:
https://github.com/SydFloyd/kmproto-hub/actions/runs/32672689484
The existing workflow requires VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID.
No credential values were requested or read; deployment remains owned by the existing
Vercel Git integration.

Next: no work remains for this item. The old GitHub Actions workflow remains
redundant and unconfigured; this item did not change it.
