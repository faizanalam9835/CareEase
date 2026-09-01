import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Without eslint-plugin-react, the core rule cannot see that a
      // PascalCase binding is used as a JSX tag, so every `icon: Icon` prop
      // was reported as unused. PascalCase identifiers are components here.
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]',
          argsIgnorePattern: '^(_|[A-Z])',
          caughtErrors: 'none',
        },
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
    files: ['src/context/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
