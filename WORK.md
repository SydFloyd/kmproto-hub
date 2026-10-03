# Bible Audio publication

Updated: 2026-10-03
Status: application published; Lab entry ready for production.

Bible Audio is live at https://bible-audio.kmproto.com. Dedicated Vercel project
`bible-audio`, deployment `dpl_9xQ9bDJZqo4FFEg3UzKs414Sv4Qo`, reports READY.
The custom domain is verified; HTTPS returns 200 using the current public DNS
address while this machine's earlier NXDOMAIN is cached. Public production alias:
https://bible-audio-dun.vercel.app. Both voices generate speech in a fresh browser
without login. Speed changes work during playback/pause; voice preview is removed.

Added a Bible Audio card to the Lab and the derived homepage project list. The
existing six destinations are retained. Added the same browser bundle under
`/bible-audio/` as a fallback, fetched and SHA-256 checked during Vercel prebuild.
Generated model assets stay outside Git. Headers are scoped to this demo path.

All 12 Android/Windows/macOS/Linux downloads are in the public release
https://github.com/SydFloyd/kmproto-hub/releases/tag/bible-audio-v0.5.0-beta.
GitHub's upload digests and sizes match every local package. Each is under 100 MB
compressed and extracted. Android APKs request no network/storage permissions;
native Windows/macOS and Android WebView checks remain device checks.
Application source commit `6a6c3dc` is pushed to the private Bible Audio repository;
the original backup branch and earlier private releases remain available.

Checks: Vercel build, lint, TypeScript and git diff --check pass. App browser
checks cover both voices, live speed, offline saving and all four download
platforms. App verification also passes chapter continuity and cold offline
reopening. Hub-to-player browser verification follows production publication.

---

# Current work

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com.

Production source: 20797edbcd86fb103f170bec095bbaa7ab11269c, pushed to main.
Vercel production deployment 6829388953 completed successfully at
2026-10-03T15:20:52Z. Live browser checks at 1440, 390 and 320px confirm the
animation is removed, the value offer and quote/service actions remain, and
there are no page errors or horizontal overflow.
Evidence: ignored outputs/animation-removed-live.json and matching PNGs.

Removed the optional workflow illustration, its controls, component and CSS.
The homepage introduction now uses the full content width, with the existing
value offer, local service-area copy and quote/service actions. Hero pricing
remains removed.

Checks: Vercel build, lint, TypeScript and git diff --check pass. Browser checks
at 1440, 390 and 320px confirm the animation and playback controls are gone,
the value offer and quote/service links work, and there are no page errors or
horizontal overflow. Desktop and mobile screenshots reviewed.
Evidence: ignored outputs/animation-removed-local.json and matching PNGs.

---

# October 2026 hero release

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com.

Production source: a9edf6f187877857ac03f9e7d765421ad9ecb31e, pushed to main.
Vercel production deployment 6823067965 completed successfully at
2026-10-03T04:08:39Z. Live desktop (1440px) and mobile (390px) checks confirm the
new value offer, no hero pricing, no autoplay, working play/pause/resume and a
single completed run. Reduced-motion playback shows the finished illustration
without animation. /pricing and /lab return 200, and the public social card and
pricing PDF match the released files. No page errors or horizontal overflow.
Evidence: ignored outputs/live-hero-verification.json and outputs/live-hero-*.png.

Replaced the homepage hero's Website projects price range and payment summary
with a high-level value offer and an optional workflow illustration. The hero now
reads “Make your business easier to find and run.” Its actions are Request a quote
and Explore services. The full pricing section and /pricing remain available.
The social card follows the same value offer and no longer advertises a price.

The illustration untangles four connections and sends a signal along each one.
It is still on load and plays once only after a click or keyboard activation.
Visitors can pause, resume, replay and reset it. Reduced-motion preferences skip
the transition, including when the preference changes during playback. Playback
pauses off screen or when the document is hidden. No new dependency was added.

Checks: Vercel build, lint, TypeScript and git diff --check pass. Browser checks at
1440, 768, 390 and 320px find no horizontal overflow, page errors or automated
WCAG A/AA violations. Verified no autoplay, keyboard play, pause/resume, one-run
completion, replay/reset, offscreen pause and reduced-motion behavior. Reviewed
idle, playing and completed screenshots. /pricing and /lab smoke checks pass.
Evidence: ignored outputs/workflow-verification.json and outputs/workflow-*.png.

---

# October 2026 redesign release

Updated: 2026-10-02
Status: published and verified at https://www.kmproto.com.

Production source: e3a7ee585b1ef1b062299694cdfa43a39aa9815f, pushed to main.
Vercel production deployment 6822499204 reports success at
2026-10-03T03:03:39Z. Public /, /pricing and /lab return 200 at 1440px and 390px,
with the new headings, lower Bucks County copy and no page errors or horizontal
overflow. The public PDF, social image and favicon match the released files
byte-for-byte. Evidence is in ignored outputs/live-verification.json.

The custom software page and broader business positioning remain proposed
follow-up work; this release publishes the reviewed redesign and service-area copy.

Pulled origin/main with --ff-only; already current at 538a24e. Recovered the
checkout's missing source files and Git references/objects before editing.

Replaced the orange palette, star glyphs, animated marquee, mock workbench and
Busywork Sorter with a navy/white layout, system typography and direct copy.
Updated the business page, Lab directory, favicon, social card and metadata.
All six project destinations are preserved.

Added “Serving lower Bucks County” near the homepage introduction, with in-person
meetings by appointment. Contact copy invites local project discussions in person;
homepage search and sharing descriptions include the service area.

Added /pricing, homepage package summaries and the original downloadable client
PDF. Prices, inclusions, add-ons, monthly services and terms follow the supplied
October 2026 guide. The quote-builder workbook remains outside the public build.

Validation: Vercel and Vinext builds, lint, TypeScript and git diff --check pass.
Browser checks cover /, /pricing and /lab at 1440, 768, 390 and 320px: no page
errors, horizontal overflow or automated WCAG A/AA violations. Checked package
inquiries, navigation, skip link, copy-email, all six project links, the $3,640
example and exact PDF bytes. Reviewed desktop/mobile screenshots and social card.
Evidence is in ignored outputs/verification.json and outputs/*.png.
The final dist/ is the public Vercel build with the new social card and PDF.

---

# September 2026 release

Updated: 2026-09-28
Outcome: turn kmproto.com into the KM Proto business site (websites, AI automation &
custom software for small businesses) and move the app portal behind it at `/lab`.

Outcome complete: the redesigned business site is live at https://kmproto.com and the
app portal serves at https://kmproto.com/lab. Publication used the existing Vercel Git
integration: `ca56608` (`a27cee4..ca56608` on `main`) built as deployment `6713977716`;
the commit status context `Vercel` reports `Deployment has completed` (success,
2026-09-28T15:36:01Z). A local `gh` (2.101.0, installed to `~/.local/bin`) authorized via
GitHub's device flow as `SydFloyd` because the host had no Git credentials; git now uses
`gh auth git-credential`.

Live verification with a headless browser against the public URLs: `/`, `/lab` and
`/og.png` all return 200; `/lab` resolves through Vercel `cleanUrls`, confirming the new
`lab.html` entry works in production and not just as a local `/lab.html`. Home titles as
"KM Proto | Websites, AI automation & custom software" with the expected `h1`; Lab titles
as "The Lab | KM Proto". Zero page errors and zero horizontal overflow at 1440px and
390px. The Busywork Sorter interacts on the live site, totals 7.5 h/week and 360 h/year for
three chores, and its button builds a `mailto:kyleaddison98@gmail.com` link. Screenshots
were visually inspected.

No further hub work is needed for this slice. The commit below records only this release
evidence.

## Previous redesign work — historical evidence

Implemented and pushed to `main`: full redesign replacing all prior styling. Vercel's Git
integration builds production from `main`.
Home has hero, services, the interactive Busywork Sorter (pick chores, mascot "Proto"
tallies hours saved and pre-fills a mailto), process, about, Lab teaser and contact with
the public email kyleaddison98@gmail.com. `/lab` lists the same six apps with the same
destinations. New favicon, OG image and metadata. Vite build gained a `lab.html` entry.
ESLint now disables Next's `<Link>`/page-font rules because production is plain Vite.

Checks: `npm run build:vercel`, `npm run build`, lint and `tsc --noEmit` pass. Checked at
1440px and 390px for horizontal overflow and page errors (none); screenshots reviewed.
Deployment and live verification are recorded in the completion note above.

## Previous hub work — historical evidence

Updated: 2026-09-08
Outcome: list Stillcraft’s usable early photo-editor preview on the public KM Proto
hub, under the user’s standing “Publish at will” authority for this app and listing.

Current follow-up: Stillcraft is now on Vercel at **https://stillcraft.kmproto.com**.
The user added its DNS record; Google and Cloudflare public resolvers agree on the
Vercel CNAME. HTTPS and the full desktop/phone-layout app workflow pass using that
public IP with certificate verification enabled; the development host's resolver
still has the earlier NXDOMAIN cached. Only Stillcraft's card destination changes.
The other five cards and derived count remain intact.

The temporary Vercel alias release `88ff3ed` deployed successfully (`6341829079`)
and its six-card listing was observed live, but the alias subsequently returned 404
during the custom-domain transition. The final link below replaces it. The app's
export-preview correction is published as `c8a2d6a`; exact app checks and deployment
IDs remain in `../stillcraft/WORK.md`. Hub production build, lint, TypeScript and
diff checks pass. Main release `106f2e25b1932af64114dcd8ff2c66a2252a0384`
deployed successfully through Vercel production `6341925335` at 2026-09-09 03:32:23 UTC.
The public hub shows six cards, retains the exact Verseform link and 06 count, and
its Stillcraft card opens the custom-domain editor with its photo picker enabled.
No page errors occurred. This check used the publicly resolved Stillcraft IP because
the host's ordinary resolver still returned NXDOMAIN; HTTPS verification stayed on.
The ignored live-check script initially sampled readiness before the worker had
started; waiting for the existing enabled picker condition completed the check.

Outcome complete: custom-domain link published and public hub-to-editor journey
verified. No further hub work is needed for this slice. The following commit records
only this release evidence; the built application remains identical.

## Earlier hub listing — historical evidence

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

App-side deployment IDs and exact DNS records live in
`../stillcraft/docs/HOSTING.md`; the owning app checkpoint is `../stillcraft/WORK.md`.
No app photo uploads or paid inference are involved.
