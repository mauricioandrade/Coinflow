<div align="center">

# 🔐 Coinflow

**Security-first, API-First personal finance management system.**

Built with NestJS · TypeScript · PostgreSQL · Prisma

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

[English](#english) · [Português](#português)

</div>

---

<a id="english"></a>

## 🇺🇸 English

### About

**Coinflow** is a personal finance management API designed with **application security (AppSec) as a foundational principle**, not an afterthought. Every architectural decision — from database schema to logging — was made with security in mind.

The system is built API-First, meaning a robust, well-documented backend comes first, enabling any frontend (web, mobile, CLI) to integrate seamlessly.

### Features

| Module | Description | Status |
|---|---|---|
| **Transactions** | Manual and automated income/expense tracking with categorization | 🔨 In Progress |
| **Cash Flow** | Real-time balance and projected cash flow | 📋 Planned |
| **Budgets** | Monthly budget management per category | 📋 Planned |
| **Open Finance** | Bank reconciliation via webhook integration | 📋 Planned |
| **Goals & Investments** | Financial goal tracking and investment management | 📋 Planned |

### Security Architecture

Coinflow implements a **defense-in-depth** strategy with multiple security layers:

```
┌─────────────────────────────────────────────────┐
│                  Cloudflare WAF                  │
├─────────────────────────────────────────────────┤
│              Helmet (HTTP Headers)               │
├─────────────────────────────────────────────────┤
│          Honeypot Middleware (Trap Routes)        │
├─────────────────────────────────────────────────┤
│         Restrictive CORS (.env-driven)           │
├─────────────────────────────────────────────────┤
│       JWT Authentication Guards (Global)         │
├─────────────────────────────────────────────────┤
│     Class-Serializer Interceptor (PII Filter)    │
├─────────────────────────────────────────────────┤
│     Secure Logger (Sensitive Data Masking)        │
├─────────────────────────────────────────────────┤
│   AES-256-GCM Encryption · bcrypt · UUID-only    │
└─────────────────────────────────────────────────┘
```

**Key security decisions:**

- **No incremental IDs** — All primary and foreign keys use UUID v4 or CUID, preventing enumeration attacks.
- **Real encryption** — Sensitive data at rest is encrypted with AES-256-GCM using a unique IV and AuthTag per record. No base64 masquerading as encryption.
- **Honeypot routes** — Invisible trap endpoints (e.g., `/api/v1/wp-admin`) that flag and rate-limit suspicious actors.
- **Secure logging** — A custom logger that masks passwords, CPFs, card numbers, and tokens before printing.
- **Serialization guards** — DTOs and interceptors ensure no sensitive field (`password`, `hash`, integration tokens) ever leaks to the client.

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens) |
| Encryption | AES-256-GCM (native `crypto` module) |
| Hashing | bcrypt |
| HTTP Security | Helmet |
| Docs | Swagger / OpenAPI |

### Getting Started

#### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/coinflow.git
cd coinflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run start:dev
```

#### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/coinflow

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-256-bit-hex-key

# CORS
CORS_ORIGINS=http://localhost:3000

# App
PORT=3000
NODE_ENV=development
```

### Project Structure

```
src/
├── common/
│   ├── decorators/         # @Public(), @CurrentUser(), etc.
│   ├── guards/             # JWT Auth Guard, Roles Guard
│   ├── interceptors/       # Serialization, Logging
│   ├── middleware/          # Honeypot, Rate Limiting
│   ├── filters/            # Global Exception Filters
│   └── services/           # EncryptionService, SecureLogger
├── modules/
│   ├── auth/               # Authentication & Authorization
│   ├── users/              # User management
│   ├── transactions/       # Income & Expense tracking
│   ├── categories/         # Transaction categorization
│   ├── accounts/           # Bank accounts & wallets
│   ├── budgets/            # Monthly budget per category
│   ├── goals/              # Financial goals & investments
│   └── webhooks/           # Open Finance integration
├── prisma/
│   └── schema.prisma       # Database schema (UUID-only)
└── main.ts                 # App bootstrap (Helmet, CORS, Guards)
```

### API Documentation

Once the server is running, access the interactive Swagger docs at:

```
http://localhost:3000/api/docs
```

### Roadmap

- [x] **Milestone 1** — Foundation & Security (project scaffold, encryption, guards, honeypot, secure logging)
- [ ] **Milestone 2** — Domain & Database (entities, transactions CRUD, budgets, categories)
- [ ] **Milestone 3** — Open Finance Integration (webhook receivers, bank reconciliation, token vault)

### Contributing

Contributions are welcome. Please read `SECURITY.md` before submitting any PR that touches authentication, encryption, or data handling logic.

### License

This project is licensed under the [MIT License](LICENSE).

---

<a id="português"></a>

## 🇧🇷 Português

### Sobre

**Coinflow** é uma API de gestão financeira pessoal projetada com **segurança de aplicação (AppSec) como princípio fundamental**, não como um adendo. Cada decisão arquitetural — do schema do banco de dados ao sistema de logs — foi tomada com segurança em mente.

O sistema é construído com abordagem API-First: um backend robusto e bem documentado vem primeiro, permitindo que qualquer frontend (web, mobile, CLI) se integre facilmente.

### Funcionalidades

| Módulo | Descrição | Status |
|---|---|---|
| **Transações** | Lançamento manual e automatizado de receitas/despesas com categorização | 🔨 Em Progresso |
| **Fluxo de Caixa** | Saldo em tempo real e fluxo de caixa projetado | 📋 Planejado |
| **Orçamentos** | Gestão de orçamento mensal por categoria | 📋 Planejado |
| **Open Finance** | Conciliação bancária via integração com webhooks | 📋 Planejado |
| **Metas e Investimentos** | Acompanhamento de metas financeiras e gestão de investimentos | 📋 Planejado |

### Arquitetura de Segurança

O Coinflow implementa uma estratégia de **defesa em profundidade** com múltiplas camadas de segurança:

```
┌─────────────────────────────────────────────────┐
│                  Cloudflare WAF                  │
├─────────────────────────────────────────────────┤
│            Helmet (Cabeçalhos HTTP)              │
├─────────────────────────────────────────────────┤
│       Middleware Honeypot (Rotas Armadilha)       │
├─────────────────────────────────────────────────┤
│        CORS Restritivo (via .env)                │
├─────────────────────────────────────────────────┤
│       Guards de Autenticação JWT (Global)        │
├─────────────────────────────────────────────────┤
│   Class-Serializer Interceptor (Filtro de PII)   │
├─────────────────────────────────────────────────┤
│    Logger Seguro (Mascaramento de Dados)          │
├─────────────────────────────────────────────────┤
│  Criptografia AES-256-GCM · bcrypt · UUID-only   │
└─────────────────────────────────────────────────┘
```

**Decisões-chave de segurança:**

- **Sem IDs incrementais** — Todas as chaves primárias e estrangeiras usam UUID v4 ou CUID, prevenindo ataques de enumeração.
- **Criptografia real** — Dados sensíveis em repouso são criptografados com AES-256-GCM usando IV e AuthTag únicos por registro. Nada de base64 fingindo ser criptografia.
- **Rotas honeypot** — Endpoints armadilha invisíveis (ex: `/api/v1/wp-admin`) que identificam e limitam atores suspeitos.
- **Logging seguro** — Logger customizado que mascara senhas, CPFs, números de cartão e tokens antes de imprimir.
- **Serialização protegida** — DTOs e interceptors garantem que nenhum campo sensível (`password`, `hash`, tokens de integração) vaze para o cliente.

### Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Linguagem | TypeScript (modo estrito) |
| Banco de Dados | PostgreSQL |
| ORM | Prisma |
| Autenticação | JWT (access + refresh tokens) |
| Criptografia | AES-256-GCM (módulo nativo `crypto`) |
| Hashing | bcrypt |
| Segurança HTTP | Helmet |
| Documentação | Swagger / OpenAPI |

### Primeiros Passos

#### Pré-requisitos

- Node.js >= 18
- PostgreSQL >= 15
- npm ou yarn

#### Instalação

```bash
# Clone o repositório
git clone https://github.com/your-username/coinflow.git
cd coinflow

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais de banco e secrets

# Execute as migrações do banco
npx prisma migrate dev

# Inicie o servidor de desenvolvimento
npm run start:dev
```

#### Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/coinflow

# JWT
JWT_SECRET=sua-chave-super-secreta
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Criptografia
ENCRYPTION_KEY=sua-chave-hex-de-256-bits

# CORS
CORS_ORIGINS=http://localhost:3000

# App
PORT=3000
NODE_ENV=development
```

### Estrutura do Projeto

```
src/
├── common/
│   ├── decorators/         # @Public(), @CurrentUser(), etc.
│   ├── guards/             # JWT Auth Guard, Roles Guard
│   ├── interceptors/       # Serialização, Logging
│   ├── middleware/          # Honeypot, Rate Limiting
│   ├── filters/            # Filtros de Exceção Globais
│   └── services/           # EncryptionService, SecureLogger
├── modules/
│   ├── auth/               # Autenticação e Autorização
│   ├── users/              # Gestão de usuários
│   ├── transactions/       # Lançamento de receitas e despesas
│   ├── categories/         # Categorização de transações
│   ├── accounts/           # Contas bancárias e carteiras
│   ├── budgets/            # Orçamento mensal por categoria
│   ├── goals/              # Metas financeiras e investimentos
│   └── webhooks/           # Integração Open Finance
├── prisma/
│   └── schema.prisma       # Schema do banco (UUID-only)
└── main.ts                 # Bootstrap (Helmet, CORS, Guards)
```

### Documentação da API

Com o servidor rodando, acesse a documentação interativa do Swagger em:

```
http://localhost:3000/api/docs
```

### Roadmap

- [x] **Milestone 1** — Fundação e Segurança (scaffold do projeto, criptografia, guards, honeypot, logging seguro)
- [ ] **Milestone 2** — Domínio e Banco de Dados (entidades, CRUD de transações, orçamentos, categorias)
- [ ] **Milestone 3** — Integração Open Finance (receivers de webhook, conciliação bancária, cofre de tokens)

### Contribuindo

Contribuições são bem-vindas. Por favor, leia o `SECURITY.md` antes de submeter qualquer PR que envolva autenticação, criptografia ou lógica de manipulação de dados.

### Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).
