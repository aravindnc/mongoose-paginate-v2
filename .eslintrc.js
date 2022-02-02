module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
  },
  parser: 'babel-eslint',
  rules: {
    'linebreak-style': ['warn', 'unix'],
  },
  overrides: [
    {
      files: '**/*.{ts,tsx}',
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
      },
    },
  ],
};
