import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // Fetching on mount and storing the result in state is the intended
      // pattern in this app (there is no data-fetching library), so this rule
      // reports the normal case. Kept as a warning rather than switched off.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // A context module exporting both its provider and its hook is the usual
    // shape; it only costs this file its fast-refresh boundary.
    files: ['src/context/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
