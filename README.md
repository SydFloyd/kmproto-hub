# KM Proto

The business site for [kmproto.com](https://kmproto.com): **KM Proto — websites, AI
automation & custom software. Practical technology for small businesses.**

- `/` — the business site (services, the interactive Busywork Sorter, process, about, contact)
- `/lab` — the portal to KM Proto's independent apps

Content lives in `app/data.ts` (email, services, process, sorter chores, Lab projects).
Pages are `app/page.tsx` and `app/lab/page.tsx`; styles are in `app/globals.css`.
The public Vercel build is a static multi-page Vite app: `index.html` → `src/main.tsx`
and `lab.html` → `src/lab.tsx` (served at `/lab` via `cleanUrls`). `public/og.png` is the
1200×630 social card.

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
