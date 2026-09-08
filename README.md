# KM Proto Hub

The project directory for [kmproto.com](https://kmproto.com): a small, curated home for independent web projects.

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
