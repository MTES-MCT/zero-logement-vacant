import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import cypressPlugin from 'eslint-plugin-cypress';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/node_modules/',
    '**/eslint.config.mjs',
    '**/vite.config.ts',
    '**/vitest.config.ts',
    'frontend/src/components/_dsfr/',
    'server/src/scripts/import-dpe/dpe_processing_*/**',
    'server/src/scripts/import-dpe/dpe_output_*/**',
    'server/src/scripts/import-dpe/**/*.jsonl',
    'server/src/scripts/import-dpe/**/*.log',
    'tools/**/*.dump'
  ]),
  {
    files: ['**/src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module'
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'import/no-commonjs': 'error',
      eqeqeq: ['error', 'always'],
      semi: ['error', 'always']
    }
  },
  {
    files: ['e2e/**/*.cy.ts'],
    extends: [cypressPlugin.configs.globals, cypressPlugin.configs.recommended]
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.flat.recommended.rules,
      ...jsxA11yPlugin.flatConfigs.recommended.rules,

      // Temporarily downgrade to warnings
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-role': 'warn'
    }
  },
  prettierConfig
]);
