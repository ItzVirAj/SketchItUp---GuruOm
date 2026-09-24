import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tsPlugin.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'supabase/functions',
      'coverage',
      '*.config.js',
      '*.config.ts',
      'scratch'
    ]
  },
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['backend/**/*.ts', 'server.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
);
