module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'auth', 'user', 'transaction', 'category', 'budget',
      'nudge', 'pluggy', 'stripe', 'infra', 'ci', 'docs', 'security'
    ]],
  },
}
