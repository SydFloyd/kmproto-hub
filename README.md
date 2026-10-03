# KM Proto

The business site for [kmproto.com](https://kmproto.com): websites, workflow
automation and custom software for small businesses and organizations.

- `/` — the business site (services, website pricing, process, about, contact)
- `/pricing` — website packages, inclusions, add-ons, optional monthly services and terms
- `/lab` — the portal to KM Proto's independent apps
- `/lab/games/asteroids` — the browser arcade game, reached through the Lab header's Games menu

Content lives in `app/data.ts` (email, services, process and Lab projects).
Prices and package scopes live in `app/pricing.ts`, transcribed from the supplied
October 2026 client pricing guide. The PDF is served from
`public/downloads/km-proto-website-pricing.pdf`. The root quote-builder workbook
is an internal working file and is not copied into the public build.
Pages are `app/page.tsx`, `app/pricing/page.tsx` and `app/lab/page.tsx`;
styles are in `app/globals.css`.
The public Vercel build is a static multi-page Vite app: `index.html` → `src/main.tsx`
with matching entries for pricing and the Lab (served at `/pricing` and `/lab`
via `cleanUrls`). `public/og.png` is the 1200×630 social card. Typography uses
system fonts; the site does not fetch external fonts.

Browser games have their own Vite entry points, so their engines are loaded only
on game pages. `app/lab/games/catalog.ts` supplies the Games menu; add future
games there and register their HTML entry in `vite.vercel.config.ts`.
Asteroids uses a fixed-step canvas engine, original stroke graphics and
procedural Web Audio in `app/lab/games/asteroids/`. Sound starts muted. Controls
are scoped to the playfield, with multi-touch buttons, pause, full screen and a
local high score. Leaving the game or hiding the tab pauses play.
Scoring, rock splitting, wave counts and saucers follow Atari's
[1979 operator manual](https://www.manualslib.com/manual/4171318/Atari-Asteroids.html?page=14).
This is a browser recreation, with no ROMs or original game assets.
Run `npm run test:asteroids` for the physics, collision and game-rule tests.

Bible Audio is listed in the Lab at https://bible-audio.kmproto.com. Its browser
player generates speech locally; Android, Windows, macOS and Linux downloads
are hosted in the public `bible-audio-v0.5.0-beta` release of this repository.
The app source repository remains private. A matching browser demo is also
served at `/bible-audio/`: the Vercel prebuild downloads the versioned public
bundle, verifies its SHA-256 in `tools/bible-audio-release.json`, and extracts it
to ignored `public/bible-audio/`. Voice models and installers are not committed
to this repository. Isolation and cache headers apply only to the demo path.

## Local development

```bash
npm install
npm run dev
```

## Publishing

The public [KM Proto hub](https://www.kmproto.com) deploys through Vercel’s GitHub
integration when reviewed changes reach `main`. Use `npm run build:vercel`, `npm run
lint` and `npx tsc --noEmit` before publication. Preview that build with
`npx vite preview --config vite.vercel.config.ts`.

WORK.md records current deployment evidence and the older, unconfigured GitHub
Actions workflow. The owner-private Sites publication in `.openai/hosting.json` is
separate from the public Vercel destination; preserve its audience unless requested.
