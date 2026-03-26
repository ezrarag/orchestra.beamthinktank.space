import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  globalIgnores([
    '**/._*',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'scripts/**',
  ]),
])
