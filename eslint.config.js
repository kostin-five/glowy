import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'build', 'coverage', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['.storybook/preview.tsx', 'src/components/ui/primitives/**/*.{ts,tsx}'],
    rules: {
      // Primitive modules intentionally expose Radix composition roots together
      // with Glowy wrappers; Storybook preview exports an annotation object.
      'react-refresh/only-export-components': 'off',
    },
  },
])
