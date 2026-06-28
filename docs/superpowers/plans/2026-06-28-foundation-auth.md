# Coinflow — Plano 1: Foundation + Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API backend autenticada com segurança baseline (JWT RS256, Argon2id, TOTP, rate limiting, criptografia em coluna, LGPD endpoints básicos).

**Architecture:** Clean Architecture em monorepo `backend/`. Domain puro sem frameworks. Application layer com use cases. Infrastructure com Prisma + Redis. HTTP layer com Fastify.

**Tech Stack:** Node.js 22, TypeScript 5 strict, Fastify 5, Prisma 6, PostgreSQL 16, Redis 7, @node-rs/argon2, jose (JWT RS256), otplib (TOTP), ioredis, zod, Jest + Testcontainers.

## Global Constraints

- TypeScript `strict: true` — zero `any` explícito
- Argon2id para senhas (nunca bcrypt, nunca MD5/SHA1)
- JWT RS256 com algoritmo fixado — nunca `alg: none`
- Cookies httpOnly + SameSite: Strict + Secure + `__Host-` prefix
- UUID v4 em todos os IDs públicos (nunca ID sequencial exposto)
- Queries via Prisma parametrizadas — zero concatenação SQL
- Zero dados sensíveis em logs (redaction middleware obrigatório)
- Conventional Commits obrigatórios (commitlint bloqueia no pre-commit)
- Coverage mínimo: 80% nas camadas domain e application
- Todos os testes de integração usam banco/redis reais via Testcontainers

---

## Estrutura de Arquivos

```
coinflow/
  backend/
    src/
      domain/
        entities/
          user.entity.ts
          refresh-token.entity.ts
        value-objects/
          email.vo.ts
          password.vo.ts
        interfaces/
          user.repository.ts
          refresh-token.repository.ts
        errors/
          domain.errors.ts
      application/
        ports/
          crypto.port.ts
          token.port.ts
          totp.port.ts
          mailer.port.ts
        use-cases/
          auth/
            signup.use-case.ts
            login.use-case.ts
            refresh.use-case.ts
            logout.use-case.ts
            setup-totp.use-case.ts
            verify-totp.use-case.ts
          user/
            get-me.use-case.ts
            export-data.use-case.ts
            delete-account.use-case.ts
      infrastructure/
        database/
          prisma/
            schema.prisma
          client.ts
          repositories/
            user.prisma-repository.ts
            refresh-token.prisma-repository.ts
        crypto/
          argon2.service.ts
          aes-gcm.service.ts
        auth/
          jwt.service.ts
          totp.service.ts
        redis/
          client.ts
          rate-limiter.ts
      http/
        server.ts
        plugins/
          security.plugin.ts
          cookie.plugin.ts
        routes/
          auth.routes.ts
          user.routes.ts
        middlewares/
          authenticate.middleware.ts
          redact-logs.middleware.ts
        controllers/
          auth.controller.ts
          user.controller.ts
        errors/
          http-error-handler.ts
    tests/
      unit/
        domain/
          user.entity.test.ts
          email.vo.test.ts
          password.vo.test.ts
        application/
          signup.use-case.test.ts
          login.use-case.test.ts
          refresh.use-case.test.ts
          totp.use-case.test.ts
      integration/
        auth.routes.test.ts
        user.routes.test.ts
    prisma/
      schema.prisma
    package.json
    tsconfig.json
    .eslintrc.cjs
    .prettierrc
    jest.config.ts
    jest.integration.config.ts
    Dockerfile
    .env.example
  .github/
    workflows/
      ci.yml
  docker-compose.yml
  .husky/
    pre-commit
  commitlint.config.cjs
```

---

### Task 1: Scaffolding do Projeto

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.eslintrc.cjs`
- Create: `backend/.prettierrc`
- Create: `backend/jest.config.ts`
- Create: `backend/jest.integration.config.ts`
- Create: `backend/.env.example`
- Create: `commitlint.config.cjs`
- Create: `.husky/pre-commit`
- Create: `docker-compose.yml`

**Interfaces:**
- Produces: ambiente de desenvolvimento funcionando com lint, format e test runner configurados

- [ ] **Step 1: Criar estrutura de diretórios**

```bash
mkdir -p backend/src/{domain/{entities,value-objects,interfaces,errors},application/{ports,use-cases/{auth,user}},infrastructure/{database/{repositories},crypto,auth,redis},http/{plugins,routes,middlewares,controllers,errors}}
mkdir -p backend/tests/{unit/{domain,application},integration}
mkdir -p backend/prisma
mkdir -p .github/workflows
mkdir -p .husky
```

- [ ] **Step 2: Criar `backend/package.json`**

```json
{
  "name": "coinflow-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/http/server.ts",
    "build": "tsc --project tsconfig.build.json",
    "start": "node dist/http/server.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest --config jest.config.ts",
    "test:integration": "node --experimental-vm-modules node_modules/.bin/jest --config jest.integration.config.ts",
    "test:coverage": "node --experimental-vm-modules node_modules/.bin/jest --config jest.config.ts --coverage",
    "lint": "eslint src tests",
    "format": "prettier --write src tests",
    "format:check": "prettier --check src tests",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/helmet": "^13.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@node-rs/argon2": "^2.0.0",
    "@prisma/client": "^6.0.0",
    "fastify": "^5.0.0",
    "ioredis": "^5.3.0",
    "jose": "^5.0.0",
    "otplib": "^12.0.1",
    "qrcode": "^1.5.3",
    "uuid": "^11.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "@testcontainers/postgresql": "^10.0.0",
    "@testcontainers/redis": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^22.0.0",
    "@types/qrcode": "^1.5.0",
    "@types/uuid": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "husky": "^9.0.0",
    "jest": "^29.0.0",
    "prettier": "^3.0.0",
    "prisma": "^6.0.0",
    "testcontainers": "^10.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 3: Criar `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Criar `backend/.eslintrc.cjs`**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict-type-checked'],
  parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
  rules: {
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}
```

- [ ] **Step 5: Criar `backend/.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 6: Criar `backend/jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
  coverageThreshold: { global: { lines: 80, functions: 80, branches: 80 } },
  extensionsToTreatAsEsm: ['.ts'],
}

export default config
```

- [ ] **Step 7: Criar `backend/jest.integration.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testTimeout: 60000,
  extensionsToTreatAsEsm: ['.ts'],
}

export default config
```

- [ ] **Step 8: Criar `backend/.env.example`**

```env
DATABASE_URL="postgresql://coinflow:coinflow@localhost:5432/coinflow"
REDIS_URL="redis://localhost:6379"
JWT_PRIVATE_KEY_BASE64=""
JWT_PUBLIC_KEY_BASE64=""
FIELD_ENCRYPTION_KEY=""
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

- [ ] **Step 9: Criar `commitlint.config.cjs`**

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'auth', 'user', 'transaction', 'category', 'budget',
      'nudge', 'pluggy', 'stripe', 'infra', 'ci', 'docs', 'security'
    ]],
  },
}
```

- [ ] **Step 10: Criar `.husky/pre-commit`**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd backend
npm run lint
npm run format:check
npm run test
```

- [ ] **Step 11: Criar `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: coinflow
      POSTGRES_PASSWORD: coinflow
      POSTGRES_DB: coinflow
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

- [ ] **Step 12: Instalar dependências e configurar Husky**

```bash
cd backend && npm install
npx husky init
```

- [ ] **Step 13: Commit**

```bash
git add .
git commit -m "chore(infra): scaffold backend project with tooling"
```

---

### Task 2: Schema Prisma + Setup de Banco

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/infrastructure/database/client.ts`

**Interfaces:**
- Produces: `PrismaClient` singleton exportado de `client.ts`; tabelas `User`, `RefreshToken`, `ConsentLog`, `Subscription` no banco

- [ ] **Step 1: Criar `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(uuid())
  emailHash    String    @unique
  emailEncrypted String
  passwordHash String
  plan         Plan      @default(FREE)
  totpSecret   String?
  totpEnabled  Boolean   @default(false)
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?

  refreshTokens RefreshToken[]
  subscription  Subscription?

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique
  familyId  String
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}

model Subscription {
  id                   String             @id @default(uuid())
  userId               String             @unique
  stripeCustomerId     String
  stripeSubscriptionId String?
  status               SubscriptionStatus @default(INACTIVE)
  currentPeriodEnd     DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

enum Plan {
  FREE
  PREMIUM
}

enum SubscriptionStatus {
  INACTIVE
  ACTIVE
  PAST_DUE
  CANCELED
}
```

- [ ] **Step 2: Criar `backend/src/infrastructure/database/client.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 3: Subir banco e rodar migration**

```bash
docker compose up -d postgres redis
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma backend/src/infrastructure/database/client.ts
git commit -m "chore(infra): add Prisma schema and database client"
```

---

### Task 3: Camada de Criptografia

**Files:**
- Create: `backend/src/application/ports/crypto.port.ts`
- Create: `backend/src/infrastructure/crypto/argon2.service.ts`
- Create: `backend/src/infrastructure/crypto/aes-gcm.service.ts`
- Create: `backend/tests/unit/domain/crypto.test.ts`

**Interfaces:**
- Produces:
  - `CryptoPort` interface com `hashPassword`, `verifyPassword`, `encryptField`, `decryptField`, `hashForLookup`
  - `Argon2Service implements CryptoPort`
  - `AesGcmService` com `encrypt(plain: string): string` e `decrypt(cipher: string): string`

- [ ] **Step 1: Escrever teste falhando**

```typescript
// backend/tests/unit/domain/crypto.test.ts
import { Argon2Service } from '../../../src/infrastructure/crypto/argon2.service.js'
import { AesGcmService } from '../../../src/infrastructure/crypto/aes-gcm.service.js'

describe('Argon2Service', () => {
  const svc = new Argon2Service()

  it('hashes and verifies password', async () => {
    const hash = await svc.hashPassword('MySecret123!')
    expect(hash).toMatch(/^\$argon2id\$/)
    await expect(svc.verifyPassword('MySecret123!', hash)).resolves.toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await svc.hashPassword('MySecret123!')
    await expect(svc.verifyPassword('wrong', hash)).resolves.toBe(false)
  })

  it('hashForLookup returns consistent HMAC', () => {
    const key = 'a'.repeat(64)
    const h1 = svc.hashForLookup('test@example.com', key)
    const h2 = svc.hashForLookup('test@example.com', key)
    expect(h1).toBe(h2)
    expect(h1).not.toBe('test@example.com')
  })
})

describe('AesGcmService', () => {
  const key = Buffer.from('a'.repeat(64), 'hex').toString('base64')
  const svc = new AesGcmService(key)

  it('encrypts and decrypts field', () => {
    const cipher = svc.encrypt('test@example.com')
    expect(cipher).not.toBe('test@example.com')
    expect(svc.decrypt(cipher)).toBe('test@example.com')
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const c1 = svc.encrypt('same')
    const c2 = svc.encrypt('same')
    expect(c1).not.toBe(c2)
    expect(svc.decrypt(c1)).toBe('same')
    expect(svc.decrypt(c2)).toBe('same')
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
cd backend && npm test -- --testPathPattern=crypto
```

Expected: FAIL — módulos não existem ainda

- [ ] **Step 3: Criar `backend/src/application/ports/crypto.port.ts`**

```typescript
export interface CryptoPort {
  hashPassword(password: string): Promise<string>
  verifyPassword(password: string, hash: string): Promise<boolean>
  hashForLookup(value: string, key: string): string
}
```

- [ ] **Step 4: Criar `backend/src/infrastructure/crypto/argon2.service.ts`**

```typescript
import { hash, verify } from '@node-rs/argon2'
import { createHmac } from 'node:crypto'
import type { CryptoPort } from '../../application/ports/crypto.port.js'

export class Argon2Service implements CryptoPort {
  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      algorithm: 1, // Argon2id
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verify(hash, password)
  }

  hashForLookup(value: string, key: string): string {
    return createHmac('sha256', key).update(value.toLowerCase()).digest('hex')
  }
}
```

- [ ] **Step 5: Criar `backend/src/infrastructure/crypto/aes-gcm.service.ts`**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

export class AesGcmService {
  private readonly key: Buffer

  constructor(base64Key: string) {
    const buf = Buffer.from(base64Key, 'base64')
    if (buf.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes (base64)')
    this.key = buf
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64url')
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64url')
    const iv = buf.subarray(0, IV_BYTES)
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
    const encrypted = buf.subarray(IV_BYTES + TAG_BYTES)
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }
}
```

- [ ] **Step 6: Rodar teste — deve passar**

```bash
cd backend && npm test -- --testPathPattern=crypto
```

Expected: PASS — 5 tests

- [ ] **Step 7: Commit**

```bash
git add backend/src/infrastructure/crypto backend/src/application/ports/crypto.port.ts backend/tests/unit/domain/crypto.test.ts
git commit -m "feat(security): add Argon2id password hashing and AES-256-GCM field encryption"
```

---

### Task 4: Domain Layer — User Entity + Value Objects

**Files:**
- Create: `backend/src/domain/errors/domain.errors.ts`
- Create: `backend/src/domain/value-objects/email.vo.ts`
- Create: `backend/src/domain/value-objects/password.vo.ts`
- Create: `backend/src/domain/entities/user.entity.ts`
- Create: `backend/src/domain/interfaces/user.repository.ts`
- Create: `backend/tests/unit/domain/user.entity.test.ts`
- Create: `backend/tests/unit/domain/email.vo.test.ts`

**Interfaces:**
- Produces:
  - `DomainError` base class e erros: `EmailAlreadyExistsError`, `InvalidCredentialsError`, `UserNotFoundError`, `TotpAlreadyEnabledError`
  - `Email` value object com `Email.create(raw: string): Email`, `email.value: string`
  - `UserEntity` com `UserEntity.create(props)`, campos tipados, `plan: 'free' | 'premium'`
  - `UserRepository` interface

- [ ] **Step 1: Escrever testes falhando**

```typescript
// backend/tests/unit/domain/email.vo.test.ts
import { Email } from '../../../src/domain/value-objects/email.vo.js'

describe('Email', () => {
  it('accepts valid email', () => {
    const email = Email.create('Test@Example.COM')
    expect(email.value).toBe('test@example.com')
  })

  it('rejects invalid email', () => {
    expect(() => Email.create('notanemail')).toThrow('INVALID_EMAIL')
    expect(() => Email.create('')).toThrow('INVALID_EMAIL')
    expect(() => Email.create('a@')).toThrow('INVALID_EMAIL')
  })
})
```

```typescript
// backend/tests/unit/domain/user.entity.test.ts
import { UserEntity } from '../../../src/domain/entities/user.entity.js'

describe('UserEntity', () => {
  it('creates user with free plan by default', () => {
    const user = UserEntity.create({
      emailHash: 'hash',
      emailEncrypted: 'enc',
      passwordHash: '$argon2id$...',
    })
    expect(user.plan).toBe('free')
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(user.totpEnabled).toBe(false)
  })

  it('upgrades plan', () => {
    const user = UserEntity.create({ emailHash: 'h', emailEncrypted: 'e', passwordHash: 'p' })
    user.upgradeToPremium()
    expect(user.plan).toBe('premium')
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
cd backend && npm test -- --testPathPattern="email.vo|user.entity"
```

Expected: FAIL

- [ ] **Step 3: Criar `backend/src/domain/errors/domain.errors.ts`**

```typescript
export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class EmailAlreadyExistsError extends DomainError {
  constructor() { super('EMAIL_ALREADY_EXISTS', 'Email already registered') }
}

export class InvalidCredentialsError extends DomainError {
  constructor() { super('INVALID_CREDENTIALS', 'Invalid email or password') }
}

export class UserNotFoundError extends DomainError {
  constructor() { super('USER_NOT_FOUND', 'User not found') }
}

export class TotpAlreadyEnabledError extends DomainError {
  constructor() { super('TOTP_ALREADY_ENABLED', '2FA is already enabled') }
}

export class TotpNotEnabledError extends DomainError {
  constructor() { super('TOTP_NOT_ENABLED', '2FA is not enabled') }
}

export class InvalidTotpTokenError extends DomainError {
  constructor() { super('INVALID_TOTP_TOKEN', 'Invalid or expired 2FA code') }
}
```

- [ ] **Step 4: Criar `backend/src/domain/value-objects/email.vo.ts`**

```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error('INVALID_EMAIL')
    }
    return new Email(normalized)
  }
}
```

- [ ] **Step 5: Criar `backend/src/domain/entities/user.entity.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid'

type Plan = 'free' | 'premium'

interface UserProps {
  id?: string
  emailHash: string
  emailEncrypted: string
  passwordHash: string
  plan?: Plan
  totpSecret?: string
  totpEnabled?: boolean
  createdAt?: Date
}

export class UserEntity {
  readonly id: string
  emailHash: string
  emailEncrypted: string
  passwordHash: string
  plan: Plan
  totpSecret: string | null
  totpEnabled: boolean
  readonly createdAt: Date

  private constructor(props: Required<UserProps> & { totpSecret: string | null }) {
    this.id = props.id
    this.emailHash = props.emailHash
    this.emailEncrypted = props.emailEncrypted
    this.passwordHash = props.passwordHash
    this.plan = props.plan
    this.totpSecret = props.totpSecret
    this.totpEnabled = props.totpEnabled
    this.createdAt = props.createdAt
  }

  static create(props: UserProps): UserEntity {
    return new UserEntity({
      id: props.id ?? uuidv4(),
      emailHash: props.emailHash,
      emailEncrypted: props.emailEncrypted,
      passwordHash: props.passwordHash,
      plan: props.plan ?? 'free',
      totpSecret: props.totpSecret ?? null,
      totpEnabled: props.totpEnabled ?? false,
      createdAt: props.createdAt ?? new Date(),
    })
  }

  upgradeToPremium(): void {
    this.plan = 'premium'
  }

  downgradToFree(): void {
    this.plan = 'free'
  }

  enableTotp(secret: string): void {
    this.totpSecret = secret
    this.totpEnabled = true
  }
}
```

- [ ] **Step 6: Criar `backend/src/domain/interfaces/user.repository.ts`**

```typescript
import type { UserEntity } from '../entities/user.entity.js'

export interface UserRepository {
  findByEmailHash(emailHash: string): Promise<UserEntity | null>
  findById(id: string): Promise<UserEntity | null>
  save(user: UserEntity): Promise<UserEntity>
  update(user: UserEntity): Promise<UserEntity>
  softDelete(id: string): Promise<void>
}
```

- [ ] **Step 7: Rodar testes — devem passar**

```bash
cd backend && npm test -- --testPathPattern="email.vo|user.entity"
```

Expected: PASS — 5 tests

- [ ] **Step 8: Commit**

```bash
git add backend/src/domain backend/tests/unit/domain
git commit -m "feat(auth): add User entity, Email value object and domain errors"
```

---

### Task 5: JWT Service (RS256)

**Files:**
- Create: `backend/src/application/ports/token.port.ts`
- Create: `backend/src/infrastructure/auth/jwt.service.ts`
- Create: `backend/tests/unit/domain/jwt.service.test.ts`

**Interfaces:**
- Produces:
  - `TokenPort` com `signAccess(payload: AccessPayload): Promise<string>`, `verifyAccess(token: string): Promise<AccessPayload>`
  - `AccessPayload: { sub: string; plan: 'free' | 'premium' }`
  - `JwtService implements TokenPort`

- [ ] **Step 1: Gerar chave RS256 para `.env`**

```bash
cd backend
node -e "
const { generateKeyPairSync } = require('crypto')
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
console.log('JWT_PRIVATE_KEY_BASE64=' + Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'))
console.log('JWT_PUBLIC_KEY_BASE64=' + Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64'))
"
```

Copiar os valores para `.env`.

- [ ] **Step 2: Escrever teste falhando**

```typescript
// backend/tests/unit/domain/jwt.service.test.ts
import { generateKeyPairSync } from 'node:crypto'
import { JwtService } from '../../../src/infrastructure/auth/jwt.service.js'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const privateKeyB64 = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64')
const publicKeyB64 = Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64')

describe('JwtService', () => {
  const svc = new JwtService(privateKeyB64, publicKeyB64)

  it('signs and verifies access token', async () => {
    const token = await svc.signAccess({ sub: 'user-id', plan: 'free' })
    const payload = await svc.verifyAccess(token)
    expect(payload.sub).toBe('user-id')
    expect(payload.plan).toBe('free')
  })

  it('rejects expired token', async () => {
    const svc2 = new JwtService(privateKeyB64, publicKeyB64, { accessExpiresIn: '0s' })
    const token = await svc2.signAccess({ sub: 'x', plan: 'free' })
    await expect(svc2.verifyAccess(token)).rejects.toThrow()
  })

  it('rejects token with wrong algorithm', async () => {
    await expect(svc.verifyAccess('eyJhbGciOiJub25lIn0.e30.')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Rodar — deve falhar**

```bash
cd backend && npm test -- --testPathPattern=jwt.service
```

Expected: FAIL

- [ ] **Step 4: Criar `backend/src/application/ports/token.port.ts`**

```typescript
export interface AccessPayload {
  sub: string
  plan: 'free' | 'premium'
}

export interface TokenPort {
  signAccess(payload: AccessPayload): Promise<string>
  verifyAccess(token: string): Promise<AccessPayload>
}
```

- [ ] **Step 5: Criar `backend/src/infrastructure/auth/jwt.service.ts`**

```typescript
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose'
import type { TokenPort, AccessPayload } from '../../application/ports/token.port.js'

interface JwtOptions {
  accessExpiresIn?: string
}

export class JwtService implements TokenPort {
  constructor(
    private readonly privateKeyBase64: string,
    private readonly publicKeyBase64: string,
    private readonly options: JwtOptions = {},
  ) {}

  async signAccess(payload: AccessPayload): Promise<string> {
    const pem = Buffer.from(this.privateKeyBase64, 'base64').toString('utf8')
    const privateKey = await importPKCS8(pem, 'RS256')
    return new SignJWT({ plan: payload.plan })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(this.options.accessExpiresIn ?? '15m')
      .setIssuer('coinflow')
      .sign(privateKey)
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    const pem = Buffer.from(this.publicKeyBase64, 'base64').toString('utf8')
    const publicKey = await importSPKI(pem, 'RS256')
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'coinflow',
    })
    return {
      sub: payload.sub as string,
      plan: payload['plan'] as 'free' | 'premium',
    }
  }
}
```

- [ ] **Step 6: Rodar — deve passar**

```bash
cd backend && npm test -- --testPathPattern=jwt.service
```

Expected: PASS — 3 tests

- [ ] **Step 7: Commit**

```bash
git add backend/src/infrastructure/auth/jwt.service.ts backend/src/application/ports/token.port.ts backend/tests/unit/domain/jwt.service.test.ts
git commit -m "feat(auth): add JWT RS256 service with fixed algorithm enforcement"
```

---

### Task 6: Signup Use Case

**Files:**
- Create: `backend/src/infrastructure/database/repositories/user.prisma-repository.ts`
- Create: `backend/src/application/use-cases/auth/signup.use-case.ts`
- Create: `backend/tests/unit/application/signup.use-case.test.ts`

**Interfaces:**
- Consumes: `UserRepository`, `CryptoPort` (Tasks 3 e 4)
- Produces:
  - `SignupUseCase.execute(dto: SignupDto): Promise<{ id: string; plan: string }>`
  - `SignupDto: { email: string; password: string }`
  - `UserPrismaRepository implements UserRepository`

- [ ] **Step 1: Escrever teste falhando**

```typescript
// backend/tests/unit/application/signup.use-case.test.ts
import { SignupUseCase } from '../../../src/application/use-cases/auth/signup.use-case.js'
import type { UserRepository } from '../../../src/domain/interfaces/user.repository.js'
import type { CryptoPort } from '../../../src/application/ports/crypto.port.js'

const makeUserRepo = (): jest.Mocked<UserRepository> => ({
  findByEmailHash: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
})

const makeCrypto = (): jest.Mocked<CryptoPort> => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  hashForLookup: jest.fn(),
})

describe('SignupUseCase', () => {
  it('creates user with hashed password and encrypted email', async () => {
    const userRepo = makeUserRepo()
    const crypto = makeCrypto()
    const useCase = new SignupUseCase(userRepo, crypto, 'hmac-key-64chars')

    crypto.hashForLookup.mockReturnValue('email-hash')
    userRepo.findByEmailHash.mockResolvedValue(null)
    crypto.hashPassword.mockResolvedValue('$argon2id$hash')
    userRepo.save.mockImplementation(async (u) => u)

    const result = await useCase.execute({ email: 'test@example.com', password: 'StrongPass123!' })

    expect(crypto.hashPassword).toHaveBeenCalledWith('StrongPass123!')
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: '$argon2id$hash', emailHash: 'email-hash' })
    )
    expect(result.plan).toBe('free')
    expect(result.id).toBeDefined()
  })

  it('throws EmailAlreadyExistsError when email taken', async () => {
    const userRepo = makeUserRepo()
    const crypto = makeCrypto()
    const useCase = new SignupUseCase(userRepo, crypto, 'hmac-key')

    crypto.hashForLookup.mockReturnValue('hash')
    userRepo.findByEmailHash.mockResolvedValue(
      // @ts-expect-error partial mock
      { id: 'existing', emailHash: 'hash', plan: 'free' }
    )

    await expect(useCase.execute({ email: 'taken@x.com', password: 'Pass123!' }))
      .rejects.toThrow('EMAIL_ALREADY_EXISTS')
  })

  it('rejects password shorter than 8 chars', async () => {
    const userRepo = makeUserRepo()
    const crypto = makeCrypto()
    const useCase = new SignupUseCase(userRepo, crypto, 'hmac-key')
    crypto.hashForLookup.mockReturnValue('hash')
    userRepo.findByEmailHash.mockResolvedValue(null)

    await expect(useCase.execute({ email: 'a@b.com', password: 'short' }))
      .rejects.toThrow('WEAK_PASSWORD')
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
cd backend && npm test -- --testPathPattern=signup.use-case
```

Expected: FAIL

- [ ] **Step 3: Criar `backend/src/application/use-cases/auth/signup.use-case.ts`**

```typescript
import { Email } from '../../../domain/value-objects/email.vo.js'
import { UserEntity } from '../../../domain/entities/user.entity.js'
import { EmailAlreadyExistsError } from '../../../domain/errors/domain.errors.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import type { CryptoPort } from '../../ports/crypto.port.js'
import { DomainError } from '../../../domain/errors/domain.errors.js'

export interface SignupDto {
  email: string
  password: string
}

export class SignupUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly crypto: CryptoPort,
    private readonly hmacKey: string,
  ) {}

  async execute(dto: SignupDto): Promise<{ id: string; plan: string }> {
    const email = Email.create(dto.email)

    if (dto.password.length < 8) {
      throw new DomainError('WEAK_PASSWORD', 'Password must be at least 8 characters')
    }

    const emailHash = this.crypto.hashForLookup(email.value, this.hmacKey)
    const existing = await this.userRepo.findByEmailHash(emailHash)
    if (existing) throw new EmailAlreadyExistsError()

    const passwordHash = await this.crypto.hashPassword(dto.password)

    const user = UserEntity.create({
      emailHash,
      emailEncrypted: email.value, // será criptografado pela infra layer no repository
      passwordHash,
    })

    const saved = await this.userRepo.save(user)
    return { id: saved.id, plan: saved.plan }
  }
}
```

- [ ] **Step 4: Criar `backend/src/infrastructure/database/repositories/user.prisma-repository.ts`**

```typescript
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import { UserEntity } from '../../../domain/entities/user.entity.js'
import type { AesGcmService } from '../../crypto/aes-gcm.service.js'
import type { PrismaClient } from '@prisma/client'

export class UserPrismaRepository implements UserRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly aes: AesGcmService,
  ) {}

  async findByEmailHash(emailHash: string): Promise<UserEntity | null> {
    const row = await this.db.user.findUnique({ where: { emailHash } })
    return row ? this.toEntity(row) : null
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.db.user.findUnique({ where: { id, deletedAt: null } })
    return row ? this.toEntity(row) : null
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const row = await this.db.user.create({
      data: {
        id: user.id,
        emailHash: user.emailHash,
        emailEncrypted: this.aes.encrypt(user.emailEncrypted),
        passwordHash: user.passwordHash,
        plan: user.plan === 'free' ? 'FREE' : 'PREMIUM',
        totpEnabled: user.totpEnabled,
        totpSecret: user.totpSecret ?? undefined,
      },
    })
    return this.toEntity(row)
  }

  async update(user: UserEntity): Promise<UserEntity> {
    const row = await this.db.user.update({
      where: { id: user.id },
      data: {
        plan: user.plan === 'free' ? 'FREE' : 'PREMIUM',
        totpEnabled: user.totpEnabled,
        totpSecret: user.totpSecret ?? undefined,
      },
    })
    return this.toEntity(row)
  }

  async softDelete(id: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  private toEntity(row: { id: string; emailHash: string; emailEncrypted: string; passwordHash: string; plan: string; totpSecret: string | null; totpEnabled: boolean; createdAt: Date }): UserEntity {
    return UserEntity.create({
      id: row.id,
      emailHash: row.emailHash,
      emailEncrypted: this.aes.decrypt(row.emailEncrypted),
      passwordHash: row.passwordHash,
      plan: row.plan === 'PREMIUM' ? 'premium' : 'free',
      totpSecret: row.totpSecret ?? undefined,
      totpEnabled: row.totpEnabled,
      createdAt: row.createdAt,
    })
  }
}
```

- [ ] **Step 5: Rodar — deve passar**

```bash
cd backend && npm test -- --testPathPattern=signup.use-case
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/application/use-cases/auth/signup.use-case.ts backend/src/infrastructure/database/repositories/user.prisma-repository.ts backend/tests/unit/application/signup.use-case.test.ts
git commit -m "feat(auth): add SignupUseCase with email dedup and password validation"
```

---

### Task 7: Login + Refresh Token

**Files:**
- Create: `backend/src/domain/entities/refresh-token.entity.ts`
- Create: `backend/src/domain/interfaces/refresh-token.repository.ts`
- Create: `backend/src/infrastructure/database/repositories/refresh-token.prisma-repository.ts`
- Create: `backend/src/application/use-cases/auth/login.use-case.ts`
- Create: `backend/src/application/use-cases/auth/refresh.use-case.ts`
- Create: `backend/src/application/use-cases/auth/logout.use-case.ts`
- Create: `backend/tests/unit/application/login.use-case.test.ts`
- Create: `backend/tests/unit/application/refresh.use-case.test.ts`

**Interfaces:**
- Consumes: `UserRepository`, `CryptoPort`, `TokenPort` (Tasks 3, 4, 5)
- Produces:
  - `LoginUseCase.execute(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; userId: string; plan: string }>`
  - `RefreshUseCase.execute(token: string): Promise<{ accessToken: string; refreshToken: string }>`
  - `LogoutUseCase.execute(refreshToken: string): Promise<void>`
  - `RefreshTokenRepository` interface

- [ ] **Step 1: Criar `backend/src/domain/entities/refresh-token.entity.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid'

interface RefreshTokenProps {
  id?: string
  userId: string
  tokenHash: string
  familyId?: string
  expiresAt?: Date
}

export class RefreshTokenEntity {
  readonly id: string
  readonly userId: string
  tokenHash: string
  readonly familyId: string
  usedAt: Date | null
  readonly expiresAt: Date
  readonly createdAt: Date

  private constructor(props: Required<RefreshTokenProps> & { usedAt: Date | null; createdAt: Date }) {
    this.id = props.id
    this.userId = props.userId
    this.tokenHash = props.tokenHash
    this.familyId = props.familyId
    this.usedAt = props.usedAt
    this.expiresAt = props.expiresAt
    this.createdAt = props.createdAt
  }

  static create(props: RefreshTokenProps): RefreshTokenEntity {
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 30)
    return new RefreshTokenEntity({
      id: props.id ?? uuidv4(),
      userId: props.userId,
      tokenHash: props.tokenHash,
      familyId: props.familyId ?? uuidv4(),
      usedAt: null,
      expiresAt: props.expiresAt ?? expiresAt,
      createdAt: now,
    })
  }

  isExpired(): boolean {
    return this.expiresAt < new Date()
  }

  isUsed(): boolean {
    return this.usedAt !== null
  }

  markUsed(): void {
    this.usedAt = new Date()
  }
}
```

- [ ] **Step 2: Criar `backend/src/domain/interfaces/refresh-token.repository.ts`**

```typescript
import type { RefreshTokenEntity } from '../entities/refresh-token.entity.js'

export interface RefreshTokenRepository {
  save(token: RefreshTokenEntity): Promise<void>
  findByTokenHash(hash: string): Promise<RefreshTokenEntity | null>
  markUsed(id: string): Promise<void>
  revokeFamily(familyId: string): Promise<void>
  revokeAllForUser(userId: string): Promise<void>
}
```

- [ ] **Step 3: Escrever teste de login falhando**

```typescript
// backend/tests/unit/application/login.use-case.test.ts
import { LoginUseCase } from '../../../src/application/use-cases/auth/login.use-case.js'
import type { UserRepository } from '../../../src/domain/interfaces/user.repository.js'
import type { RefreshTokenRepository } from '../../../src/domain/interfaces/refresh-token.repository.js'
import type { CryptoPort } from '../../../src/application/ports/crypto.port.js'
import type { TokenPort } from '../../../src/application/ports/token.port.js'
import { UserEntity } from '../../../src/domain/entities/user.entity.js'

const mockUser = UserEntity.create({
  id: 'user-1',
  emailHash: 'email-hash',
  emailEncrypted: 'enc',
  passwordHash: '$argon2id$hash',
  plan: 'free',
})

describe('LoginUseCase', () => {
  const makeUserRepo = (): jest.Mocked<UserRepository> => ({
    findByEmailHash: jest.fn().mockResolvedValue(mockUser),
    findById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  })
  const makeRefreshRepo = (): jest.Mocked<RefreshTokenRepository> => ({
    save: jest.fn(),
    findByTokenHash: jest.fn(),
    markUsed: jest.fn(),
    revokeFamily: jest.fn(),
    revokeAllForUser: jest.fn(),
  })
  const makeCrypto = (): jest.Mocked<CryptoPort> => ({
    hashPassword: jest.fn(),
    verifyPassword: jest.fn().mockResolvedValue(true),
    hashForLookup: jest.fn().mockReturnValue('email-hash'),
  })
  const makeToken = (): jest.Mocked<TokenPort> => ({
    signAccess: jest.fn().mockResolvedValue('access-token'),
    verifyAccess: jest.fn(),
  })

  it('returns tokens on valid credentials', async () => {
    const useCase = new LoginUseCase(makeUserRepo(), makeRefreshRepo(), makeCrypto(), makeToken(), 'hmac-key')
    const result = await useCase.execute({ email: 'a@b.com', password: 'Pass123!' })
    expect(result.accessToken).toBe('access-token')
    expect(result.refreshToken).toBeDefined()
    expect(result.userId).toBe('user-1')
  })

  it('throws InvalidCredentialsError on wrong password', async () => {
    const crypto = makeCrypto()
    crypto.verifyPassword.mockResolvedValue(false)
    const useCase = new LoginUseCase(makeUserRepo(), makeRefreshRepo(), crypto, makeToken(), 'hmac-key')
    await expect(useCase.execute({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow('INVALID_CREDENTIALS')
  })
})
```

- [ ] **Step 4: Rodar — deve falhar**

```bash
cd backend && npm test -- --testPathPattern=login.use-case
```

Expected: FAIL

- [ ] **Step 5: Criar `backend/src/application/use-cases/auth/login.use-case.ts`**

```typescript
import { randomBytes, createHash } from 'node:crypto'
import { Email } from '../../../domain/value-objects/email.vo.js'
import { InvalidCredentialsError } from '../../../domain/errors/domain.errors.js'
import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import type { RefreshTokenRepository } from '../../../domain/interfaces/refresh-token.repository.js'
import type { CryptoPort } from '../../ports/crypto.port.js'
import type { TokenPort } from '../../ports/token.port.js'

export interface LoginDto {
  email: string
  password: string
}

export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly crypto: CryptoPort,
    private readonly token: TokenPort,
    private readonly hmacKey: string,
  ) {}

  async execute(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; userId: string; plan: string }> {
    const email = Email.create(dto.email)
    const emailHash = this.crypto.hashForLookup(email.value, this.hmacKey)
    const user = await this.userRepo.findByEmailHash(emailHash)
    if (!user) throw new InvalidCredentialsError()

    const valid = await this.crypto.verifyPassword(dto.password, user.passwordHash)
    if (!valid) throw new InvalidCredentialsError()

    const accessToken = await this.token.signAccess({ sub: user.id, plan: user.plan })

    const rawRefreshToken = randomBytes(48).toString('base64url')
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex')
    const refreshEntity = RefreshTokenEntity.create({ userId: user.id, tokenHash })
    await this.refreshRepo.save(refreshEntity)

    return { accessToken, refreshToken: rawRefreshToken, userId: user.id, plan: user.plan }
  }
}
```

- [ ] **Step 6: Criar `backend/src/application/use-cases/auth/refresh.use-case.ts`**

```typescript
import { createHash } from 'node:crypto'
import { randomBytes } from 'node:crypto'
import { DomainError } from '../../../domain/errors/domain.errors.js'
import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity.js'
import type { RefreshTokenRepository } from '../../../domain/interfaces/refresh-token.repository.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import type { TokenPort } from '../../ports/token.port.js'

export class RefreshUseCase {
  constructor(
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly userRepo: UserRepository,
    private readonly token: TokenPort,
  ) {}

  async execute(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const stored = await this.refreshRepo.findByTokenHash(tokenHash)

    if (!stored || stored.isExpired()) {
      throw new DomainError('INVALID_REFRESH_TOKEN', 'Refresh token invalid or expired')
    }

    if (stored.isUsed()) {
      // Token reuse detected — revoke entire family (indicates theft)
      await this.refreshRepo.revokeFamily(stored.familyId)
      throw new DomainError('REFRESH_TOKEN_REUSE', 'Possible token theft detected')
    }

    await this.refreshRepo.markUsed(stored.id)

    const user = await this.userRepo.findById(stored.userId)
    if (!user) throw new DomainError('USER_NOT_FOUND', 'User not found')

    const accessToken = await this.token.signAccess({ sub: user.id, plan: user.plan })
    const newRaw = randomBytes(48).toString('base64url')
    const newHash = createHash('sha256').update(newRaw).digest('hex')
    const newToken = RefreshTokenEntity.create({
      userId: user.id,
      tokenHash: newHash,
      familyId: stored.familyId,
    })
    await this.refreshRepo.save(newToken)

    return { accessToken, refreshToken: newRaw }
  }
}
```

- [ ] **Step 7: Criar `backend/src/application/use-cases/auth/logout.use-case.ts`**

```typescript
import { createHash } from 'node:crypto'
import type { RefreshTokenRepository } from '../../../domain/interfaces/refresh-token.repository.js'

export class LogoutUseCase {
  constructor(private readonly refreshRepo: RefreshTokenRepository) {}

  async execute(rawToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const stored = await this.refreshRepo.findByTokenHash(tokenHash)
    if (stored) {
      await this.refreshRepo.revokeFamily(stored.familyId)
    }
  }
}
```

- [ ] **Step 8: Criar `backend/src/infrastructure/database/repositories/refresh-token.prisma-repository.ts`**

```typescript
import type { RefreshTokenRepository } from '../../../domain/interfaces/refresh-token.repository.js'
import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity.js'
import type { PrismaClient } from '@prisma/client'

export class RefreshTokenPrismaRepository implements RefreshTokenRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(token: RefreshTokenEntity): Promise<void> {
    await this.db.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        familyId: token.familyId,
        expiresAt: token.expiresAt,
      },
    })
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenEntity | null> {
    const row = await this.db.refreshToken.findUnique({ where: { tokenHash: hash } })
    if (!row) return null
    const entity = RefreshTokenEntity.create({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      familyId: row.familyId,
      expiresAt: row.expiresAt,
    })
    if (row.usedAt) entity.markUsed()
    return entity
  }

  async markUsed(id: string): Promise<void> {
    await this.db.refreshToken.update({ where: { id }, data: { usedAt: new Date() } })
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { familyId, usedAt: null },
      data: { usedAt: new Date() },
    })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
  }
}
```

- [ ] **Step 9: Rodar todos os testes unitários**

```bash
cd backend && npm test
```

Expected: PASS — todos os testes unitários

- [ ] **Step 10: Commit**

```bash
git add backend/src backend/tests
git commit -m "feat(auth): add login, refresh with token family rotation, and logout"
```

---

### Task 8: HTTP Layer — Fastify Server + Auth Routes

**Files:**
- Create: `backend/src/http/server.ts`
- Create: `backend/src/http/plugins/security.plugin.ts`
- Create: `backend/src/http/plugins/cookie.plugin.ts`
- Create: `backend/src/http/errors/http-error-handler.ts`
- Create: `backend/src/http/middlewares/authenticate.middleware.ts`
- Create: `backend/src/http/middlewares/redact-logs.middleware.ts`
- Create: `backend/src/http/routes/auth.routes.ts`
- Create: `backend/src/http/controllers/auth.controller.ts`
- Create: `backend/tests/integration/auth.routes.test.ts`

**Interfaces:**
- Consumes: `SignupUseCase`, `LoginUseCase`, `RefreshUseCase`, `LogoutUseCase` (Tasks 6, 7)
- Produces: `buildServer(): FastifyInstance` — servidor Fastify com rotas `/auth/*`

- [ ] **Step 1: Criar `backend/src/http/errors/http-error-handler.ts`**

```typescript
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { DomainError } from '../../domain/errors/domain.errors.js'

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  EMAIL_ALREADY_EXISTS: 409,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 404,
  INVALID_REFRESH_TOKEN: 401,
  REFRESH_TOKEN_REUSE: 401,
  TOTP_ALREADY_ENABLED: 409,
  TOTP_NOT_ENABLED: 400,
  INVALID_TOTP_TOKEN: 401,
  WEAK_PASSWORD: 422,
  INVALID_EMAIL: 422,
}

export function httpErrorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof DomainError) {
    void reply.status(DOMAIN_ERROR_STATUS[error.code] ?? 400).send({ error: error.code, message: error.message })
    return
  }

  if (error.validation) {
    void reply.status(422).send({ error: 'VALIDATION_ERROR', message: 'Invalid request data' })
    return
  }

  // Never expose internals
  void reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' })
}
```

- [ ] **Step 2: Criar `backend/src/http/plugins/security.plugin.ts`**

```typescript
import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

export const securityPlugin = fp(async (app: FastifyInstance) => {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })

  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: undefined, // substituir por ioredis client em produção
  })
})
```

- [ ] **Step 3: Criar `backend/src/http/middlewares/redact-logs.middleware.ts`**

```typescript
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'cookie', 'cpf', 'email']

export function redactLogs(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  if (request.body && typeof request.body === 'object') {
    request.body = redact(request.body as Record<string, unknown>)
  }
  done()
}

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (SENSITIVE_FIELDS.some((f) => k.toLowerCase().includes(f))) return [k, '[REDACTED]']
      if (v && typeof v === 'object') return [k, redact(v as Record<string, unknown>)]
      return [k, v]
    }),
  )
}
```

- [ ] **Step 4: Criar `backend/src/http/middlewares/authenticate.middleware.ts`**

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtService } from '../../infrastructure/auth/jwt.service.js'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    userPlan: 'free' | 'premium'
  }
}

export function makeAuthMiddleware(jwt: JwtService) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = request.cookies['__Host-access']
    if (!token) {
      void reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing access token' })
      return
    }
    try {
      const payload = await jwt.verifyAccess(token)
      request.userId = payload.sub
      request.userPlan = payload.plan
    } catch {
      void reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' })
    }
  }
}
```

- [ ] **Step 5: Criar `backend/src/http/routes/auth.routes.ts`**

```typescript
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { SignupUseCase } from '../../application/use-cases/auth/signup.use-case.js'
import type { LoginUseCase } from '../../application/use-cases/auth/login.use-case.js'
import type { RefreshUseCase } from '../../application/use-cases/auth/refresh.use-case.js'
import type { LogoutUseCase } from '../../application/use-cases/auth/logout.use-case.js'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8) })
const loginSchema = z.object({ email: z.string().email(), password: z.string() })

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: {
    signup: SignupUseCase
    login: LoginUseCase
    refresh: RefreshUseCase
    logout: LogoutUseCase
  },
): void {
  app.post('/auth/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body)
    const result = await deps.signup.execute(body)
    return reply.status(201).send(result)
  })

  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const result = await deps.login.execute(body)
    void reply
      .cookie('__Host-access', result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 })
      .cookie('__Host-refresh', result.refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 })
      .send({ userId: result.userId, plan: result.plan })
  })

  app.post('/auth/refresh', async (request, reply) => {
    const raw = request.cookies['__Host-refresh']
    if (!raw) return reply.status(401).send({ error: 'MISSING_REFRESH_TOKEN' })
    const result = await deps.refresh.execute(raw)
    void reply
      .cookie('__Host-access', result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 })
      .cookie('__Host-refresh', result.refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 })
      .send({ ok: true })
  })

  app.post('/auth/logout', async (request, reply) => {
    const raw = request.cookies['__Host-refresh']
    if (raw) await deps.logout.execute(raw)
    void reply
      .clearCookie('__Host-access', { path: '/' })
      .clearCookie('__Host-refresh', { path: '/' })
      .send({ ok: true })
  })
}
```

- [ ] **Step 6: Criar `backend/src/http/server.ts`**

```typescript
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { prisma } from '../infrastructure/database/client.js'
import { AesGcmService } from '../infrastructure/crypto/aes-gcm.service.js'
import { Argon2Service } from '../infrastructure/crypto/argon2.service.js'
import { JwtService } from '../infrastructure/auth/jwt.service.js'
import { UserPrismaRepository } from '../infrastructure/database/repositories/user.prisma-repository.js'
import { RefreshTokenPrismaRepository } from '../infrastructure/database/repositories/refresh-token.prisma-repository.js'
import { SignupUseCase } from '../application/use-cases/auth/signup.use-case.js'
import { LoginUseCase } from '../application/use-cases/auth/login.use-case.js'
import { RefreshUseCase } from '../application/use-cases/auth/refresh.use-case.js'
import { LogoutUseCase } from '../application/use-cases/auth/logout.use-case.js'
import { securityPlugin } from './plugins/security.plugin.js'
import { registerAuthRoutes } from './routes/auth.routes.js'
import { httpErrorHandler } from './errors/http-error-handler.js'
import { redactLogs } from './middlewares/redact-logs.middleware.js'

export async function buildServer(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: { level: 'info' } })

  const aes = new AesGcmService(process.env['FIELD_ENCRYPTION_KEY'] ?? '')
  const argon = new Argon2Service()
  const jwt = new JwtService(
    process.env['JWT_PRIVATE_KEY_BASE64'] ?? '',
    process.env['JWT_PUBLIC_KEY_BASE64'] ?? '',
  )

  const userRepo = new UserPrismaRepository(prisma, aes)
  const refreshRepo = new RefreshTokenPrismaRepository(prisma)

  const hmacKey = process.env['FIELD_ENCRYPTION_KEY'] ?? ''

  const signup = new SignupUseCase(userRepo, argon, hmacKey)
  const login = new LoginUseCase(userRepo, refreshRepo, argon, jwt, hmacKey)
  const refresh = new RefreshUseCase(refreshRepo, userRepo, jwt)
  const logout = new LogoutUseCase(refreshRepo)

  await app.register(cookie)
  await app.register(securityPlugin)

  app.addHook('preHandler', redactLogs)
  app.setErrorHandler(httpErrorHandler)

  registerAuthRoutes(app, { signup, login, refresh, logout })

  return app
}

if (process.argv[1] === import.meta.filename) {
  const server = await buildServer()
  await server.listen({ port: Number(process.env['PORT'] ?? 3000), host: '0.0.0.0' })
}
```

- [ ] **Step 7: Escrever teste de integração**

```typescript
// backend/tests/integration/auth.routes.test.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'node:child_process'

let server: Awaited<ReturnType<typeof import('../../src/http/server.js').buildServer>>

beforeAll(async () => {
  const pg = await new PostgreSqlContainer('postgres:16-alpine').start()
  const redis = await new RedisContainer('redis:7-alpine').start()

  process.env['DATABASE_URL'] = pg.getConnectionUri()
  process.env['REDIS_URL'] = redis.getConnectionUrl()
  process.env['FIELD_ENCRYPTION_KEY'] = Buffer.from('a'.repeat(32)).toString('base64')

  const { generateKeyPairSync } = await import('node:crypto')
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  process.env['JWT_PRIVATE_KEY_BASE64'] = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64')
  process.env['JWT_PUBLIC_KEY_BASE64'] = Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64')

  execSync('npx prisma migrate deploy', { env: { ...process.env } })

  const { buildServer } = await import('../../src/http/server.js')
  server = await buildServer()
}, 60000)

afterAll(async () => { await server.close() })

describe('POST /auth/signup', () => {
  it('creates user and returns id + plan', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'test@coinflow.com', password: 'StrongPass123!' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body) as { id: string; plan: string }
    expect(body.plan).toBe('free')
    expect(body.id).toBeDefined()
  })

  it('returns 409 on duplicate email', async () => {
    await server.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'dup@x.com', password: 'Pass1234!' } })
    const res = await server.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'dup@x.com', password: 'Pass1234!' } })
    expect(res.statusCode).toBe(409)
  })
})

describe('POST /auth/login', () => {
  beforeAll(async () => {
    await server.inject({ method: 'POST', url: '/auth/signup', payload: { email: 'login@x.com', password: 'Pass1234!' } })
  })

  it('sets httpOnly cookies on success', async () => {
    const res = await server.inject({ method: 'POST', url: '/auth/login', payload: { email: 'login@x.com', password: 'Pass1234!' } })
    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as string[]
    expect(cookies.some((c) => c.includes('__Host-access'))).toBe(true)
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true)
  })

  it('returns 401 on wrong password', async () => {
    const res = await server.inject({ method: 'POST', url: '/auth/login', payload: { email: 'login@x.com', password: 'wrong' } })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 8: Rodar testes de integração**

```bash
cd backend && npm run test:integration -- --testPathPattern=auth.routes
```

Expected: PASS — 4 tests (pode demorar ~30s por Testcontainers)

- [ ] **Step 9: Commit**

```bash
git add backend/src/http backend/tests/integration/auth.routes.test.ts
git commit -m "feat(auth): add Fastify HTTP layer with signup, login, refresh, logout routes"
```

---

### Task 9: TOTP 2FA

**Files:**
- Create: `backend/src/application/ports/totp.port.ts`
- Create: `backend/src/infrastructure/auth/totp.service.ts`
- Create: `backend/src/application/use-cases/auth/setup-totp.use-case.ts`
- Create: `backend/src/application/use-cases/auth/verify-totp.use-case.ts`
- Create: `backend/tests/unit/application/totp.use-case.test.ts`

**Interfaces:**
- Consumes: `UserRepository` (Task 4)
- Produces:
  - `TotpPort` com `generateSecret(): string`, `generateOtpauthUrl(secret, email): string`, `verify(token, secret): boolean`
  - `SetupTotpUseCase.execute(userId: string): Promise<{ secret: string; qrUrl: string }>`
  - `VerifyTotpUseCase.execute(userId: string, totpToken: string): Promise<void>`
  - Rotas: `POST /auth/totp/setup`, `POST /auth/totp/verify`

- [ ] **Step 1: Criar `backend/src/application/ports/totp.port.ts`**

```typescript
export interface TotpPort {
  generateSecret(): string
  generateOtpauthUrl(secret: string, email: string): string
  verify(token: string, secret: string): boolean
}
```

- [ ] **Step 2: Criar `backend/src/infrastructure/auth/totp.service.ts`**

```typescript
import { authenticator } from 'otplib'
import type { TotpPort } from '../../application/ports/totp.port.js'

export class TotpService implements TotpPort {
  constructor() {
    authenticator.options = { window: 1 } // aceita ±30s
  }

  generateSecret(): string {
    return authenticator.generateSecret(20)
  }

  generateOtpauthUrl(secret: string, email: string): string {
    return authenticator.keyuri(email, 'Coinflow', secret)
  }

  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret })
  }
}
```

- [ ] **Step 3: Escrever teste falhando**

```typescript
// backend/tests/unit/application/totp.use-case.test.ts
import { SetupTotpUseCase } from '../../../src/application/use-cases/auth/setup-totp.use-case.js'
import { VerifyTotpUseCase } from '../../../src/application/use-cases/auth/verify-totp.use-case.js'
import type { UserRepository } from '../../../src/domain/interfaces/user.repository.js'
import type { TotpPort } from '../../../src/application/ports/totp.port.js'
import { UserEntity } from '../../../src/domain/entities/user.entity.js'

const mockUser = UserEntity.create({ id: 'u1', emailHash: 'h', emailEncrypted: 'enc', passwordHash: 'ph' })

describe('SetupTotpUseCase', () => {
  it('returns secret and qr url', async () => {
    const userRepo: jest.Mocked<UserRepository> = { findById: jest.fn().mockResolvedValue(mockUser), findByEmailHash: jest.fn(), save: jest.fn(), update: jest.fn().mockResolvedValue(mockUser), softDelete: jest.fn() }
    const totp: jest.Mocked<TotpPort> = { generateSecret: jest.fn().mockReturnValue('SECRET'), generateOtpauthUrl: jest.fn().mockReturnValue('otpauth://...'), verify: jest.fn() }
    const useCase = new SetupTotpUseCase(userRepo, totp)
    const result = await useCase.execute('u1')
    expect(result.secret).toBe('SECRET')
    expect(result.qrUrl).toBe('otpauth://...')
    expect(userRepo.update).toHaveBeenCalled()
  })
})

describe('VerifyTotpUseCase', () => {
  it('throws on invalid token', async () => {
    const user = UserEntity.create({ id: 'u1', emailHash: 'h', emailEncrypted: 'enc', passwordHash: 'ph', totpEnabled: true })
    user.enableTotp('SECRET')
    const userRepo: jest.Mocked<UserRepository> = { findById: jest.fn().mockResolvedValue(user), findByEmailHash: jest.fn(), save: jest.fn(), update: jest.fn(), softDelete: jest.fn() }
    const totp: jest.Mocked<TotpPort> = { generateSecret: jest.fn(), generateOtpauthUrl: jest.fn(), verify: jest.fn().mockReturnValue(false) }
    const useCase = new VerifyTotpUseCase(userRepo, totp)
    await expect(useCase.execute('u1', '000000')).rejects.toThrow('INVALID_TOTP_TOKEN')
  })
})
```

- [ ] **Step 4: Rodar — deve falhar**

```bash
cd backend && npm test -- --testPathPattern=totp.use-case
```

Expected: FAIL

- [ ] **Step 5: Criar `backend/src/application/use-cases/auth/setup-totp.use-case.ts`**

```typescript
import { TotpAlreadyEnabledError, UserNotFoundError } from '../../../domain/errors/domain.errors.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import type { TotpPort } from '../../ports/totp.port.js'

export class SetupTotpUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly totp: TotpPort,
  ) {}

  async execute(userId: string): Promise<{ secret: string; qrUrl: string }> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError()
    if (user.totpEnabled) throw new TotpAlreadyEnabledError()

    const secret = this.totp.generateSecret()
    const qrUrl = this.totp.generateOtpauthUrl(secret, user.emailEncrypted)

    user.enableTotp(secret)
    await this.userRepo.update(user)

    return { secret, qrUrl }
  }
}
```

- [ ] **Step 6: Criar `backend/src/application/use-cases/auth/verify-totp.use-case.ts`**

```typescript
import { InvalidTotpTokenError, TotpNotEnabledError, UserNotFoundError } from '../../../domain/errors/domain.errors.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import type { TotpPort } from '../../ports/totp.port.js'

export class VerifyTotpUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly totp: TotpPort,
  ) {}

  async execute(userId: string, token: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError()
    if (!user.totpEnabled || !user.totpSecret) throw new TotpNotEnabledError()

    const valid = this.totp.verify(token, user.totpSecret)
    if (!valid) throw new InvalidTotpTokenError()
  }
}
```

- [ ] **Step 7: Rodar — deve passar**

```bash
cd backend && npm test -- --testPathPattern=totp.use-case
```

Expected: PASS — 2 tests

- [ ] **Step 8: Adicionar rotas TOTP em `backend/src/http/routes/auth.routes.ts`** (acrescentar ao final da função `registerAuthRoutes`)

```typescript
// Adicionar dentro de registerAuthRoutes, após as rotas existentes:
// Requires: SetupTotpUseCase, VerifyTotpUseCase, authMiddleware nos deps
const totpTokenSchema = z.object({ token: z.string().length(6) })

app.post('/auth/totp/setup', { preHandler: deps.authenticate }, async (request, reply) => {
  const result = await deps.setupTotp.execute(request.userId)
  return reply.send(result)
})

app.post('/auth/totp/verify', { preHandler: deps.authenticate }, async (request, reply) => {
  const { token } = totpTokenSchema.parse(request.body)
  await deps.verifyTotp.execute(request.userId, token)
  return reply.send({ ok: true })
})
```

- [ ] **Step 9: Commit**

```bash
git add backend/src backend/tests/unit/application/totp.use-case.test.ts
git commit -m "feat(auth): add TOTP 2FA setup and verify"
```

---

### Task 10: User Routes (LGPD)

**Files:**
- Create: `backend/src/application/use-cases/user/get-me.use-case.ts`
- Create: `backend/src/application/use-cases/user/export-data.use-case.ts`
- Create: `backend/src/application/use-cases/user/delete-account.use-case.ts`
- Create: `backend/src/http/routes/user.routes.ts`
- Create: `backend/tests/integration/user.routes.test.ts`

**Interfaces:**
- Consumes: `UserRepository`, `RefreshTokenRepository`, autenticação middleware (Tasks 4, 7, 8)
- Produces: `GET /me`, `GET /me/export`, `DELETE /me`

- [ ] **Step 1: Criar `backend/src/application/use-cases/user/get-me.use-case.ts`**

```typescript
import { UserNotFoundError } from '../../../domain/errors/domain.errors.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'

export interface MeDto {
  id: string
  plan: string
  totpEnabled: boolean
  createdAt: Date
}

export class GetMeUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(userId: string): Promise<MeDto> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError()
    return { id: user.id, plan: user.plan, totpEnabled: user.totpEnabled, createdAt: user.createdAt }
  }
}
```

- [ ] **Step 2: Criar `backend/src/application/use-cases/user/export-data.use-case.ts`**

```typescript
import { UserNotFoundError } from '../../../domain/errors/domain.errors.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'

export class ExportDataUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError()
    // Retorna todos os dados do usuário — expandir nas próximas fases com transações, budgets etc.
    return {
      id: user.id,
      email: user.emailEncrypted,
      plan: user.plan,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
    }
  }
}
```

- [ ] **Step 3: Criar `backend/src/application/use-cases/user/delete-account.use-case.ts`**

```typescript
import { UserNotFoundError } from '../../../domain/errors/domain.errors.js'
import type { UserRepository } from '../../../domain/interfaces/user.repository.js'
import type { RefreshTokenRepository } from '../../../domain/interfaces/refresh-token.repository.js'

export class DeleteAccountUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshRepo: RefreshTokenRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new UserNotFoundError()
    await this.refreshRepo.revokeAllForUser(userId)
    await this.userRepo.softDelete(userId)
  }
}
```

- [ ] **Step 4: Criar `backend/src/http/routes/user.routes.ts`**

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { GetMeUseCase } from '../../application/use-cases/user/get-me.use-case.js'
import type { ExportDataUseCase } from '../../application/use-cases/user/export-data.use-case.js'
import type { DeleteAccountUseCase } from '../../application/use-cases/user/delete-account.use-case.js'

export function registerUserRoutes(
  app: FastifyInstance,
  deps: {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    getMe: GetMeUseCase
    exportData: ExportDataUseCase
    deleteAccount: DeleteAccountUseCase
  },
): void {
  app.get('/me', { preHandler: deps.authenticate }, async (request, reply) => {
    const result = await deps.getMe.execute(request.userId)
    return reply.send(result)
  })

  app.get('/me/export', { preHandler: deps.authenticate }, async (request, reply) => {
    const result = await deps.exportData.execute(request.userId)
    return reply
      .header('Content-Disposition', 'attachment; filename="coinflow-data.json"')
      .send(result)
  })

  app.delete('/me', { preHandler: deps.authenticate }, async (request, reply) => {
    await deps.deleteAccount.execute(request.userId)
    void reply
      .clearCookie('__Host-access', { path: '/' })
      .clearCookie('__Host-refresh', { path: '/' })
      .status(204).send()
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/application/use-cases/user backend/src/http/routes/user.routes.ts
git commit -m "feat(user): add GET /me, GET /me/export and DELETE /me (LGPD)"
```

---

### Task 11: CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `backend/Dockerfile`

**Interfaces:**
- Produces: pipeline GitHub Actions que roda em todo PR; imagem Docker de produção

- [ ] **Step 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npx prisma generate
      - run: npm run format:check
      - run: npm run lint
      - run: npx tsc --noEmit

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npx prisma generate
      - run: npm run test:coverage

      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: backend/coverage/

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npx prisma generate
      - run: npm run test:integration
        env:
          # Testcontainers levanta os containers automaticamente
          TESTCONTAINERS_RYUK_DISABLED: "true"

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npm audit --audit-level=critical
      - run: npx better-npm-audit audit

  docker:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: [quality, unit-tests]

    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: false
          tags: coinflow-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Criar `backend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/http/server.js"]
```

- [ ] **Step 3: Commit final**

```bash
git add .github/workflows/ci.yml backend/Dockerfile
git commit -m "chore(ci): add GitHub Actions pipeline and production Dockerfile"
```

- [ ] **Step 4: Verificar que todos os testes passam localmente**

```bash
cd backend
npm test
npm run test:integration
npm run lint
npx tsc --noEmit
```

Expected: tudo PASS

---

## Self-Review

**Spec coverage:**
- ✓ Clean Architecture com camadas Domain/Application/Infrastructure/HTTP
- ✓ TypeScript strict
- ✓ Argon2id para senhas
- ✓ JWT RS256 com algoritmo fixado, httpOnly cookies, refresh token rotation
- ✓ TOTP 2FA (sem SMS)
- ✓ AES-256-GCM em colunas sensíveis
- ✓ UUID v4 em IDs públicos
- ✓ IDOR middleware (authenticate.middleware)
- ✓ Rate limiting
- ✓ CORS whitelist
- ✓ Helmet.js security headers
- ✓ Log redaction middleware
- ✓ LGPD: export + soft delete
- ✓ Supply chain: npm audit no CI
- ✓ Testes unitários com mocks (sem banco)
- ✓ Testes de integração com Testcontainers (banco real)
- ✓ CI pipeline completo
- ✓ Conventional Commits + Commitlint + Husky
- ✓ Docker de produção

**Não coberto neste plano (próximos planos):**
- Transações, categorias, orçamentos (Plano 2)
- Stripe (Plano 3)
- Open Finance / Pluggy (Plano 4)
- Nudge engine (Plano 5)
- Mobile React Native (Plano 6)
- SSRF bloqueio explícito (será adicionado quando integrar Pluggy webhooks no Plano 4)
- Upload de arquivos + magic bytes (não há upload neste plano)
