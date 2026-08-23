# KM Proto Hub

The project directory for [kmproto.com](https://kmproto.com): a small, curated home for independent web projects.

## Local development

```bash
npm install
npm run dev
```

## Vercel deployment

The GitHub Actions workflow deploys pushes to `main` after these repository secrets are configured:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
