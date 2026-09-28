import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Production is a static multi-page Vite build (vercel.json), so plain
    // anchors and document-level font links are intentional.
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
  globalIgnores(['dist/**', '.next/**', 'out/**', 'build/**', 'outputs/**', 'next-env.d.ts']),
]);

export default eslintConfig;
