# KM Proto

The business site for [kmproto.com](https://kmproto.com): websites, workflow
automation and custom software for small businesses and organizations.

- `/` — the business site (services, website pricing, process, about, contact)
- `/pricing` — website packages, inclusions, add-ons, optional monthly services and terms
- `/lab` — the portal to KM Proto's independent apps

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

The homepage value offer includes an illustration in
`app/components/WorkflowAnimation.tsx`. It stays still until played, runs once,
supports pause/replay/reset and skips motion when reduced motion is preferred.
Playback pauses when the illustration leaves view or the tab is hidden.

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
