# Current work

Updated: 2026-09-08
Outcome: list Stillcraft’s usable early photo-editor preview on the public KM Proto
hub, under the user’s standing “Publish at will” authority for this app and listing.

Implemented on `codex/stillcraft-preview`: Stillcraft is the first of six cards, with
an original composition illustration and plain early-preview copy. It links to the
verified public app at `https://stillcraft.kyleaddison98.chatgpt.site` while
`stillcraft.kmproto.com` awaits Cloudflare DNS. The count derives from the collection.
A fetch found the newer Verseform work on remote main (`ca59638`); it was merged and
preserved, including its position before Shep Study and Milk Yeller. The only conflict
was the old fixed project count, resolved to the derived count. No reset or force-push.

Checks: Vercel production build, lint, TypeScript and diff checks pass. The card was
checked at 1440/390/320px for exact destinations, count, horizontal overflow, page
errors and automated WCAG A/AA checks. All three widths pass with six cards after merging
Verseform; zero overflow, page errors or automated accessibility violations. Final
screenshots were visually inspected. Live publication verification follows.

An existing ignored `outputs/verify-page.cjs` made repository lint fail on its CommonJS
imports. Added `outputs/**` to ESLint’s generated-output ignores; tracked app code is
still checked. Added generated `*.tsbuildinfo` to Git ignores. No runtime dependency
or deployment workflow changed. Local checks use the prepared Stillcraft Node/browser
toolchain; preview must use `--config vite.vercel.config.ts` to match the public build.
The default Vinext/Cloudflare preview requires a different build and is not this target.

Publication complete: `a415afaa52d842758e193e630ef7afe43653a5a2` was pushed to the
review branch and fast-forwarded to main. The existing Vercel Git integration’s
production deployment `6337854724` reports success. Live
`https://www.kmproto.com` verification found six cards, the exact Verseform destination,
the derived 06 count, and a Stillcraft card that opens the usable public editor with
no page errors. The source implementation is `02365ec` plus merge `c97afc5`, preserving
remote Verseform work through `ca59638`. The final follow-up only records this result.
The old GitHub Actions deploy workflow remains redundant and unconfigured; it is
not the active production path.

The `.openai/hosting.json` Sites project
`appgprj_6a8b5731a4c48191901cb5e31a749036` was inspected with Sites. It is an older
owner-private publication at `kmproto-hub.kyleaddison98.chatgpt.site`, with no custom
domains. Its audience and deployed version were not changed. This task does not
migrate the public hub between hosts.

Next: after Stillcraft’s exact custom hostname passes DNS/SSL and live app checks,
replace only its temporary card URL with `https://stillcraft.kmproto.com` and verify
again. App-side deployment IDs and exact DNS records live in
`../stillcraft/docs/HOSTING.md`; the owning app checkpoint is `../stillcraft/WORK.md`.
No app photo uploads or paid inference are involved.
