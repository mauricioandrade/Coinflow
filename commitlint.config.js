module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Formatting, missing semicolons, etc (no code change)
        'refactor', // Refactoring production code
        'test',     // Adding tests, refactoring tests
        'chore',    // Updating build tasks, package manager configs, etc
        'perf',     // Performance improvements
        'ci',       // CI/CD configuration changes
        'build',    // Build system changes
        'revert',   // Reverting a previous commit
        'security', // Security fixes or improvements
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 150],
  },
};
