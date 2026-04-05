# Security Architecture — Coinflow

This document describes the security controls built into Coinflow and the **mandatory operational steps** required before exposing the API to the internet.

---

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Authentication & Authorization](#authentication--authorization)
- [Data Encryption](#data-encryption)
- [Transport & Headers](#transport--headers)
- [Honeypot & Threat Detection](#honeypot--threat-detection)
- [Logging](#logging)
- [Open Finance / Webhooks](#open-finance--webhooks)
- [Pre-Launch Checklist](#pre-launch-checklist)

---

## Design Philosophy

> **Secure by default, explicit to opt-out.**

- Every HTTP route is **private** unless decorated with `@Public()`.
- Sensitive data never reaches the log pipeline.
- Credentials are never stored in plain text — not even in transit between application layers.
- Monetary values are `BigInt` (cents) to eliminate float-based precision exploits.
- Database IDs are CUID — no sequential integers that enable enumeration attacks.

---

## Authentication & Authorization

### JWT Strategy

- **Access tokens** expire in `JWT_EXPIRES_IN` (default: `15m`).
- **Refresh tokens** expire in `JWT_REFRESH_EXPIRES_IN` (default: `7d`).
- Refresh tokens are stored as a **SHA-256 hash** in the `refresh_tokens` table — the raw token is never persisted.
- On refresh, the old token is revoked (rotated) and a new pair is issued.

### Global Guard

`JwtAuthGuard` is registered globally in `main.ts`. It rejects all requests without a valid Bearer token **unless** the route carries `@Public()`.

```
Allowed @Public() targets:
  POST /api/v1/auth/login
  POST /api/v1/auth/register
  POST /api/v1/auth/refresh
  POST /api/v1/webhooks/*
```

Any deviation must be justified in the PR description and reviewed.

---

## Data Encryption

### Passwords — bcrypt

All user passwords are hashed with `bcrypt` at a minimum cost factor of **12** before storage. The `password` field is excluded from all DTOs via `@Exclude()`.

### Sensitive Tokens — AES-256-GCM (`EncryptionService`)

Open Finance access/refresh tokens and consent IDs are encrypted **before** database insertion using `EncryptionService`.

**Algorithm:** `aes-256-gcm`
**Key size:** 256-bit (32 bytes, supplied as 64 hex chars via `ENCRYPTION_KEY`)
**IV:** 12 bytes, randomly generated **per encryption call** — never reused
**AuthTag:** 16 bytes — GCM integrity tag; decryption fails if ciphertext is tampered

**Storage format** (column `encryptedCredentials`):
```
<iv_hex>:<authtag_hex>:<ciphertext_hex>
```

**Key rotation:** To rotate the `ENCRYPTION_KEY`, decrypt all existing records with the old key and re-encrypt with the new key in a migration. Never change the key without a migration.

### Refresh Token Hashing — SHA-256

Raw refresh tokens are never stored. Only their `SHA-256` hash is persisted for lookup. This limits the blast radius of a database breach — an attacker with the hash cannot reconstruct the token.

---

## Transport & Headers

### Helmet

`helmet` is configured in `main.ts` and sets the following headers on every response:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; object-src 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `X-XSS-Protection` | `0` (modern CSP is preferred) |
| `Referrer-Policy` | `no-referrer` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

### CORS

Allowed origins are read **exclusively** from `CORS_ALLOWED_ORIGINS` in `.env`. No origin is hardcoded in source. In production, this list must contain only the exact domain(s) of your frontend.

---

## Honeypot & Threat Detection

`HoneypotMiddleware` runs before every route handler. It maintains a set of **decoy paths** (e.g., `/wp-admin`, `/.env`, `/phpmyadmin`) that no legitimate user would ever access.

**On trap trigger:**
1. The source IP is blocked in memory for `HONEYPOT_BLOCK_DURATION_MS` (default: 1 hour).
2. A `WARN` log is emitted: `[HONEYPOT] Scanner detected and blocked: ip=X path=Y`.
3. The request receives a generic `404` — the honeypot is not revealed.
4. Subsequent requests from the blocked IP receive `403` until the block expires.

> **Production note:** The in-memory block list does not survive restarts. Back it with **Redis** and forward threat intelligence to **Cloudflare** via Workers or the Firewall API for persistent blocking.

---

## Logging

`SecureLogger` replaces NestJS's default `ConsoleLogger`. Before printing any message it:

1. Replaces values at sensitive keys (`password`, `token`, `encryptedCredentials`, `apiKey`, etc.) with `[REDACTED]`.
2. Masks strings matching JWT shape (`xxxxx.xxxxx.xxxxx`).
3. Masks long hex strings (≥ 32 chars) — likely keys or ciphertext blobs.
4. Masks AES-GCM format strings (`<hex>:<hex>:<hex>`).

**Rules for developers:**
- Never call `console.log` — always inject and use `Logger` from `@nestjs/common`.
- Never log `req.body` or `req.headers['authorization']` directly.
- Raw webhook payloads (`WebhookEvent.rawPayload`) must never be logged — store in DB only.

---

## Open Finance / Webhooks

- Webhook endpoints use `@Public()` since they are called by third-party providers without a user JWT.
- Every inbound webhook **must** verify the provider's `HMAC-SHA256` signature from the request header before processing.
- Unverified or malformed webhooks are rejected with `400` and the event stored with `status: FAILED`.
- The raw payload is stored in `WebhookEvent.rawPayload` for audit and replay — it is **never logged**.

---

## Pre-Launch Checklist

Before pointing your domain to this server, complete **all** of the following:

### Infrastructure

- [ ] **Cloudflare WAF (Shield) must be activated** before the DNS record points to the origin server. The API should never be directly reachable from the internet without WAF protection.
- [ ] Set Cloudflare Security Level to **High** for the API subdomain.
- [ ] Enable **Bot Fight Mode** in Cloudflare to complement the in-process Honeypot.
- [ ] Configure Cloudflare **Rate Limiting** rules as a second layer (in addition to `@nestjs/throttler`).
- [ ] Origin server should only accept traffic from **Cloudflare IP ranges** (firewall rule).

### Application

- [ ] `NODE_ENV=production` is set.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong random values (≥ 64 chars). **Never reuse development secrets.**
- [ ] `ENCRYPTION_KEY` is a cryptographically random 32-byte (64 hex char) value. **Back it up securely.**
- [ ] `CORS_ALLOWED_ORIGINS` contains only the production frontend domain(s).
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`).
- [ ] `.env` is excluded from all deployments and CI/CD artifact archives.

### Frontend (if applicable)

- [ ] **All `console.log` calls must be removed or stripped in the production build.** Use a build plugin (e.g., `terser` with `drop_console: true` or `vite-plugin-remove-console`) to enforce this automatically.
- [ ] Do not store JWT access tokens in `localStorage` — use `httpOnly` cookies or in-memory state with refresh token rotation.
- [ ] Apply `Content-Security-Policy` meta tag or HTTP header on the frontend origin too.

---

## Reporting a Vulnerability

If you discover a security issue in this project, do **not** open a public GitHub issue. Contact the maintainer directly via email. We commit to acknowledging reports within 48 hours.
