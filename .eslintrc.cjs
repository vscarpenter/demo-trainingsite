module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'public',
    'scripts',
    'temp',
    '*.config.js',
    '*.config.ts',
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'semi': ['error', 'always'],
    // Use single quotes in TS, but prefer double quotes in JSX
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'no-useless-escape': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
  overrides: [
    {
      files: ['**/*.tsx', '**/*.jsx'],
      rules: {
        quotes: 'off',
        'jsx-quotes': ['error', 'prefer-double'],
      },
    },
    {
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
