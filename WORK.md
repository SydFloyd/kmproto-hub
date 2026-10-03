# Browser games: Bubble Bobble

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/bubble-bobble.

Production source: b14cdfed0b1846e47dbdef2b5f98f102bacbd035, pushed to main.
Vercel production deployment 6832801777 reports success at
2026-10-03T20:38:14Z. Live verification passes at 1440/768/390/320px, including
the three-game header menu, seven Lab projects, playable keyboard/touch controls,
co-op, sound, pause and saved scores. Landscape full screen, the Super title code
and continuing after actual game over pass. Live Contra and Asteroids regressions
pass at 1440/390px. No page errors, overflow or automated WCAG A/AA violations.
Evidence: ignored outputs/bubble-bobble-live-verification.json,
outputs/bubble-bobble-live-extras.json, outputs/contra-live-verification.json,
outputs/asteroids-live-verification.json and screenshots.

Added /lab/games/bubble-bobble to the Lab's shared Games menu, with its own Vite
entry so the game engine stays off the business and Lab pages. All seven Lab
projects and the existing Asteroids and Contra entries remain available.

The recreation follows the 1986 arcade game: 100 transcribed platform layouts,
Bub and Bob on one keyboard, bubble trapping and riding, touching chain pops,
food and separate player scores, candy upgrades, shoes, water/fire/lightning,
EXTEND, time limits and Skel-Monsta. Includes secret doors, umbrellas, title
codes, a harder Super variant, the full-health Super Drunk fight and co-op endings.
Pixel art and synthesized sound are authored for this implementation. Physics,
air currents, enemy patterns, item timing and secret rooms are approximations,
with reference provenance and limits recorded in README.md. No ROMs, sampled
music or original sprite files are distributed. Play and sound start off.

All 18 Bubble Bobble, 18 Contra and 13 Asteroids engine tests pass. A test clears
the first round using movement, jump and bubble controls with damage protection
to isolate traversal; campaign fixtures check all 100 round transitions and the
final fight at full health. Both the Vinext and public Vercel builds, lint,
TypeScript and diff checks pass. Reviewed rendered art for all 100 rounds.
Browser checks cover desktop/mobile navigation, keyboard co-op, joining Bob,
multi-touch input, sound, pause, automatic pause, high scores and blocked storage.
All four widths (1440/768/390/320px) pass without page errors, horizontal overflow
or automated WCAG A/AA violations. Contra and Asteroids browser regressions pass
at 1440/390px; the Lab still has seven project links and three game links.
Landscape full screen fits at 844×390 and 568×320, including readable touch labels.
The Super title code and continuing after an actual game over pass at 320px.
The shared bitmap font was extracted without changing Contra's rendering.

## Earlier release: Contra

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/contra.

Production source: b230c9075d3fa16891f05c212e3b2fb678ff9de5, pushed to main.
Vercel production deployment 6831895921 reports success at
2026-10-03T19:11:19Z. Live browser checks at 1440/768/390/320px pass the Games
menu, keyboard and touch controls, co-op, sound, pause, restart and saved scores.
Landscape full screen and continuing after actual game over also pass.
Asteroids regression checks pass on the live site at 1440/390px.
No page errors, horizontal overflow or automated WCAG A/AA violations.
Evidence: ignored outputs/contra-live-verification.json,
outputs/contra-live-extras.json, outputs/asteroids-live-verification.json and PNGs.

Added /lab/games/contra to the shared Games menu. Its separate Vite entry keeps
the engine off the business and Lab pages. Existing Asteroids and the seven Lab
project links remain available. Shared cabinet styles moved to games/arcade.css.
Asteroids already has optional, muted-by-default synthesized sound effects.

Contra is an eight-zone browser recreation modeled on the NES game: side-scrolling
areas, two forward-facing bases and the ascending waterfall; directional fire,
crouching, somersault jumps, swimming, weapon capsules, shielded bosses and local
two-player co-op. Includes three lives, three continues, stage-clear bonus lives,
the optional 30-life code, synthesized effects and original chiptune music.
Code, level layouts and pixel art are original; no ROMs or sampled game assets.
Sound is muted initially and play starts only on request. Keyboard and multi-touch
input, pause, automatic pause when leaving the playfield, full screen and optional
browser-local high scores match the existing cabinet behavior.

All 18 Contra engine tests and the existing 13 Asteroids tests pass. Campaign
verification traverses all eight zones and defeats full-health bosses using
control inputs, with enemy-damage protection to isolate navigation and aiming;
no level skips or reduced boss health. No falls during that run. Browser checks
at 1440/768/390/320px pass navigation, keyboard input, co-op, the 30-life code,
multi-touch input, pause, sound, restart, saved scores and blocked storage.
No page errors, horizontal overflow or automated WCAG A/AA violations.
Reviewed ready/playing screenshots and the art for all eight zones.
Landscape full screen fits at 844×390 and 568×320. The continue button restores
three lives after an actual browser game over, including at 320px width.
Vercel and Vinext builds, lint, TypeScript and git diff --check pass.
Evidence: ignored outputs/contra-*-verification.json and matching PNGs.

---

# Browser games: Asteroids

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab/games/asteroids.

Production source: 755ddee2411e14026b5aef8d0534deb2de42dd7d, pushed to main.
Vercel production deployment 6831198566 reports success at
2026-10-03T18:07:22Z. Live browser checks at 1440/768/390/320px confirm navigation
from the Lab's Games menu, keyboard and simultaneous touch controls, pause and
resume, audio, desktop full screen, restart and saved high scores. The ready
screen stays still. Blocked browser storage remains playable. No page errors,
horizontal overflow or automated WCAG A/AA violations.
Evidence: ignored outputs/asteroids-live-verification.json and screenshots.

Added a Games menu to the Lab header and an independently loaded game page at
/lab/games/asteroids. The shared catalog supports future games without loading
their engines on the business or Lab pages. Existing project links are retained.

Asteroids recreates the original monochrome vector style and arcade rules:
inertial thrust/rotation, screen wrapping, four player shots, three rock sizes,
20/50/100-point splitting, large and small saucers, risky hyperspace, three ships
and a bonus ship every 10,000 points. Waves progress through 4/6/8/10 large rocks.
Scoring and waves were checked against Atari's 1979 operator manual. Canvas
graphics and Web Audio effects are authored here; no ROM or game assets are used.

Keyboard input belongs to the focused playfield; mobile buttons support
simultaneous pointers and cancellation. Includes pause/resume, restart, full
screen, muted-by-default sound and browser-local high scores. Leaving the
game, hiding the tab or scrolling the playfield out of view pauses play.
The ready screen stays still. Physics uses a fixed 120 Hz step independent of
render rate; collisions check the full bullet path across screen edges.

Checks: Vercel and Vinext builds, lint, TypeScript and git diff --check pass.
All 13 engine tests pass, covering inertia, wrapping, shot limits, splitting,
scoring, bonus lives, waves, respawn safety, game over, hyperspace, saucers and
pause. Browser checks at 1440/768/390/320px pass navigation, keyboard controls,
pause/resume, mute, desktop full screen, simultaneous touch inputs, restart,
saved-score loading and blocked storage. No page errors, horizontal overflow
or automated WCAG A/AA violations. Reviewed desktop/mobile screenshots.
Landscape full screen fits at 844×390 and 568×320, with controls alongside the
playfield. Actual browser gameplay scored 2,230 points; the high score survived
a new game and page reload.
Evidence: ignored outputs/asteroids-*-verification.json and matching PNGs.

---

# Bible Audio publication

Updated: 2026-10-03
Status: published and verified at https://www.kmproto.com/lab and https://bible-audio.kmproto.com.

## UI refresh: 0.5.1-beta

Normal (Kitten Micro / Bella) is the first voice and default for new users.
Light (Amy) is the ultra-tiny alternative. Both player and installer download
buttons put Normal first. Existing saved voice choices are respected.
All browser and installer assets are rebuilt with the UI update. The versioned
browser bundle and checksum are recorded in `tools/bible-audio-release.json`.
The builders enforce the 100 MB download/payload budgets and Android signatures.
Published app source: `8c63bed`; standalone Vercel deployment
`dpl_D4aKbaT8vzG1nWx6zeaia5YGdysB` is READY and aliased to the main subdomain.
Hub source `9cdd6da` deployed successfully as `9JsoqPcG2CSFCXXXiJsehVvVzxn9`.
The fallback production page serves Normal first, selected by default, followed
by Light. Public release `bible-audio-v0.5.1-beta` contains all 15 expected assets.

## Initial publication: 0.5.0-beta

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
reopening. Hub production source `195ed9b` deployed successfully as Vercel deployment
`HCGZgErtL54UoqFwWtVpoxk2pf3i`. Live browser checks confirm seven Lab entries,
all six original destinations, navigation into the speaking custom-domain player,
and the isolated `/bible-audio/` fallback. Both voices, live speed, offline saving
and all installer links also pass on the custom domain with public DNS. Evidence:
ignored `outputs/bible-audio-live.json` and matching screenshots.

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
