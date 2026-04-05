import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Types allowed — same convention as the backend (coinflow)
    "type-enum": [
      2,
      "always",
      [
        "feat",     // new feature
        "fix",      // bug fix
        "docs",     // documentation only
        "style",    // formatting, no logic change
        "refactor", // code restructure, no feature/fix
        "perf",     // performance improvement
        "test",     // adding/updating tests
        "build",    // build system or external dependencies
        "ci",       // CI/CD pipeline changes
        "chore",    // maintenance (bumps, lockfiles, config)
        "revert",   // revert a prior commit
        "security", // security fix (custom — matches backend convention)
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
};

export default config;
