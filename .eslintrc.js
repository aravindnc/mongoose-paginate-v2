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
};
