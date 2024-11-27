import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    // Note: there should be no other properties in this object
    ignores: ['.next/*/*'],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      indent: ['error', 2], // Enforce 2-space indentation
      semi: ['error', 'never'], // Disallow semicolons
      quotes: ['error', 'single'], // Enforce single quotes (optional)
      'no-console': 'off', // Allow console statements
    },

  },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
]
