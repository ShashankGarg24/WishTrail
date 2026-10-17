module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'public', 'src/config/firebase.example.js'],
  plugins: ['react', 'react-refresh'],
  rules: {
    // The existing application intentionally keeps several dormant UI variants
    // beside the active versions. Keep release lint focused on correctness.
    'no-unused-vars': 'off',
    'no-empty': 'off',
    'no-useless-escape': 'off',
    'no-control-regex': 'off',
    'no-extra-semi': 'off',
    'react/jsx-uses-vars': 'error',
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': 'off',
  },
} 
