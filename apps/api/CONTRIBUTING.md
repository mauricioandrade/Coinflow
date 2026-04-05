# Contributing to Coinflow

Thank you for investing your time in contributing to Coinflow. This document outlines the standards we enforce to keep the codebase consistent, secure, and maintainable.

---

## Table of Contents

- [Branch Strategy (GitFlow)](#branch-strategy-gitflow)
- [Commit Message Standard](#commit-message-standard)
- [Pull Request Checklist](#pull-request-checklist)
- [Security Rules for Contributors](#security-rules-for-contributors)
- [Local Setup](#local-setup)

---

## Branch Strategy (GitFlow)

We follow a **Feature Branch** workflow derived from GitFlow. The following branch types are in use:

| Branch pattern       | Purpose                                                   | Base branch  | Merges into         |
|----------------------|-----------------------------------------------------------|--------------|---------------------|
| `main`               | Production-ready code. Tagged with release versions.      | —            | —                   |
| `develop`            | Integration branch. All features merge here first.        | `main`       | `main` (via release)|
| `feature/<name>`     | New functionality. One feature per branch.                | `develop`    | `develop`           |
| `fix/<name>`         | Bug fix for development.                                  | `develop`    | `develop`           |
| `hotfix/<name>`      | Critical production bug fix.                              | `main`       | `main` + `develop`  |
| `release/<version>`  | Release preparation (bumps version, final QA).            | `develop`    | `main` + `develop`  |
| `chore/<name>`       | Tooling, dependencies, CI changes (no business logic).    | `develop`    | `develop`           |

### Branch Naming Examples

```
feature/jwt-authentication
feature/transaction-recurring-rules
fix/budget-calculation-overflow
hotfix/refresh-token-expiry
release/0.2.0
chore/update-prisma-client
```

### Rules

- **Never commit directly to `main` or `develop`.**
- Branch names must use `kebab-case`.
- Delete branches after merging.
- One logical change per branch — keep PRs small and reviewable.

---

## Commit Message Standard

We enforce **Conventional Commits** via [Commitlint](https://commitlint.js.org/) + [Husky](https://typicode.github.io/husky/). Non-conforming commits will be **rejected** locally.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Allowed Types

| Type       | When to use                                          |
|------------|------------------------------------------------------|
| `feat`     | A new feature                                        |
| `fix`      | A bug fix                                            |
| `docs`     | Documentation changes only                           |
| `style`    | Formatting, whitespace (no logic change)             |
| `refactor` | Code restructure without adding features or fixing bugs |
| `test`     | Adding or updating tests                             |
| `chore`    | Build scripts, dependency updates, tooling           |
| `perf`     | Performance improvement                              |
| `ci`       | CI/CD pipeline changes                               |
| `build`    | Changes to build system or external dependencies     |
| `revert`   | Reverts a previous commit                            |
| `security` | Security hardening, vulnerability fix                |

### Scope (optional but recommended)

Use the module or domain area in parentheses:

```
feat(auth): implement refresh token rotation
fix(transactions): correct BigInt serialization in DTO
security(encryption): upgrade AES key derivation to PBKDF2
```

### Rules

- Subject line **must not** end with a period.
- Subject line **must not** exceed 100 characters.
- Subject line **must** be in lowercase (imperative mood preferred).
- Body lines must not exceed 150 characters.

### Good Examples

```
feat(auth): add JWT guard with @Public() decorator bypass
fix(budget): prevent negative limitCents on update
security(bank-connection): encrypt credentials with AES-256-GCM
chore(deps): upgrade prisma to v7.6.0
docs: add API authentication section to README
test(transactions): add edge case for concurrent transfer
```

### Bad Examples (will be rejected)

```
Added new feature          ← no type prefix
feat: Added new feature.   ← sentence-case + trailing period
FEAT: add new feature      ← uppercase type
fix(auth): fixed the bug and also updated some other things and refactored the service and...  ← too long
```

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] Branch is up-to-date with `develop`
- [ ] All commits follow the Conventional Commits format
- [ ] No secrets, credentials, or `.env` files committed
- [ ] DTOs exclude sensitive fields (`password`, `tokenHash`, `encryptedCredentials`)
- [ ] New endpoints are protected by the JWT Guard (or explicitly use `@Public()` with justification)
- [ ] Monetary values use `BigInt` (cents), never `Float`
- [ ] Any new IDs use `@default(cuid())` — no auto-increment integers
- [ ] Tests pass locally (`npm test`)
- [ ] Lint passes (`npm run lint`)

---

## Security Rules for Contributors

1. **No raw secrets in code.** All secrets go through `ConfigService` via `.env`.
2. **Passwords** must be hashed with `bcrypt` (min cost factor: 12).
3. **Bank tokens** must be encrypted with `EncryptionService` (AES-256-GCM) before persistence.
4. **Never log** request bodies, tokens, or user PII directly. Use the `SecureLogger`.
5. **Webhook endpoints** must verify the provider's HMAC-SHA256 signature before processing.
6. **Open Finance consent tokens** must be refreshed before expiry and revoked on user request.

See [SECURITY.md](./SECURITY.md) for the full security architecture.

---

## Local Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd coinflow
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# 3. Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# 4. Start development server
npm run start:dev
```

Husky hooks are installed automatically via the `prepare` script on `npm install`.

To verify Commitlint is working:

```bash
echo "bad commit message" | npx commitlint
# Should return an error

echo "feat(auth): add login endpoint" | npx commitlint
# Should pass
```
