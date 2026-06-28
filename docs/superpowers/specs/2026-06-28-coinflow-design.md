# Coinflow — Design Spec

**Data:** 2026-06-28  
**Status:** Aprovado

---

## Visão Geral

App de organização financeira pessoal para o mercado brasileiro. Usuário declara renda mensal fixa, registra gastos (manualmente no plano free ou via Open Finance no premium), e o app evolui de visibilidade básica para nudges comportamentais personalizados conforme acumula dados.

**Problema central:** Apps financeiros reportam o problema, não mudam comportamento. 73% dos usuários abandonam após 3 meses. Coinflow resolve isso com uma jornada B→C: alertas simples evoluem para padrões comportamentais detectados por ML.

---

## Usuário-Alvo

Perfil primário: brasileiro que ganha razoavelmente bem mas não sabe onde o dinheiro vai. Jornada esperada:

1. **A — O perdido:** não sabe para onde vai o dinheiro
2. **B — O consciente:** vê os dados, começa a definir metas
3. **C — O acumulador:** quer crescer patrimônio com base em dados

O app serve a jornada completa, mas resolve A primeiro e com mais profundidade.

---

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + TypeScript + Fastify |
| Mobile | React Native (Expo) — iOS + Android |
| Banco de dados | PostgreSQL |
| Cache / Filas | Redis + BullMQ |
| Open Finance | Pluggy (agregador) |
| Pagamentos | Stripe (Hosted Checkout) |
| Infra | Docker + Railway |

---

## Arquitetura — Clean Architecture

```
src/
  domain/           → entidades, value objects, interfaces de repositório
  application/      → use cases, DTOs
  infrastructure/   → postgres, pluggy, redis, stripe, crypto
  http/             → routes, controllers, middlewares Fastify
```

**Regra de dependência:** camadas internas nunca importam camadas externas. Domain não conhece Fastify nem PostgreSQL.

---

## Modelo de Dados

```
User
  id (UUID), email_encrypted, password_hash (Argon2id)
  plan (free|premium), created_at, deleted_at

Account (Open Finance)
  id, user_id, pluggy_item_id_encrypted
  institution_name, type, balance_encrypted
  consent_expires_at

Transaction
  id, account_id, user_id, amount
  merchant_encrypted, category_id, date
  source (manual|pluggy), synced_at

Category
  id, name, is_system, user_id (null = sistema)

Budget
  id, user_id, category_id, limit_amount, period (monthly)

NudgeLog
  id, user_id, type, trigger_context
  sent_at, dismissed_at, acted_at

ConsentLog
  id, user_id, pluggy_consent_id
  granted_at, expires_at, revoked_at

Subscription
  id, user_id, plan, status
  stripe_customer_id, stripe_subscription_id
  current_period_end
```

---

## Segurança

### Criptografia
- Dados PII e financeiros: **AES-256-GCM** criptografado em coluna (não só disco)
- Senhas: **Argon2id** (resistente a GPU cracking)
- Tokens Pluggy: armazenados criptografados, chave separada dos dados de usuário
- TLS 1.3 obrigatório em trânsito

### Autenticação
- JWT **RS256** com expiry de 15 minutos
- Refresh token com rotação + detecção de reuso por família
- Armazenamento em **httpOnly cookie** (SameSite: Strict, Secure, __Host- prefix)
- 2FA via **TOTP** (Google Authenticator / Authy) — nunca SMS (vulnerável a SIM swap)
- Device fingerprinting: login de dispositivo novo exige confirmação por email

### Proteção de Endpoints
- **IDOR:** UUID v4 em todos os IDs públicos + middleware que valida `resource.user_id === req.user.id` em toda rota
- **SSRF:** bloqueia IPs internos (10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost) em qualquer input de URL
- **Rate limiting:** 5 tentativas de login → lockout + alerta (Redis por IP + por conta)
- **CORS:** whitelist explícita de origens, nunca `*` em rota autenticada
- **Helmet.js:** todos os security headers configurados (CSP, HSTS, X-Frame-Options, etc.)

### Upload de Arquivos
Validação em 7 camadas (obrigatória para qualquer upload):
1. Extensão permitida (whitelist)
2. Content-Type header
3. **Magic bytes verificados server-side**
4. Re-encode da imagem (strip EXIF, destrói payload embutido)
5. Arquivo nunca servido com permissão de execução
6. Storage fora do webroot (S3/R2 com URL assinada)
7. ClamAV scan

### Prevenção de Injeção
- **SQL:** Prisma com queries parametrizadas 100%. Zero concatenação de string em SQL.
- **NoSQL:** inputs serializados antes de qualquer query Redis
- **Command Injection:** nunca passar input de usuário para shell. Whitelist estrita se necessário.
- **Prototype Pollution:** `JSON.parse(JSON.stringify(input))` antes de merges. Audit em dependências com merge profundo.
- **XXE:** external entities desabilitados em qualquer parser XML
- **Path Traversal:** `path.resolve()` + verificação de prefixo em operações de arquivo

### Webhooks
- Validação de assinatura **HMAC** em todos os webhooks (Pluggy, Stripe)
- Resposta 200 imediata + processamento assíncrono via fila

### LGPD
- Consentimento granular registrado (o quê, quando, para quê)
- `GET /me/export` — entrega JSON de todos os dados do usuário
- `DELETE /me` — hard delete em cascata, purge de backups em 30 dias
- Retenção máxima: 5 anos ou deleção sob demanda
- Zero dados sensíveis em logs (middleware de redaction automático)
- App nunca pede credenciais via push notification ou chat in-app

### Supply Chain
- `npm ci` (lockfile estrito) em produção
- CI bloqueia build se CVE crítico detectado (`npm audit`, `better-npm-audit`)
- SBOM gerado automaticamente em cada build
- Dependabot ativo com auto-merge apenas para patch versions
- Trivy scan na imagem Docker

### Ameaças com IA (2025-2026)
Documentadas e mitigadas:
- **Phishing hiper-personalizado via LLM:** DKIM + SPF + DMARC no domínio; app nunca pede dados por email/push
- **Deepfake voice/video:** suporte nunca solicita ações por ligação; autenticação sempre in-app
- **Account takeover por ML:** anomalia de localização/horário → step-up auth; audit log imutável
- **Deepfake-as-a-Service:** device fingerprinting + TOTP bloqueia acesso mesmo com credenciais vazadas

---

## Open Finance (Premium)

**Por que aggregador (Pluggy):** abstrai certificados BACEN, consentimento JSR, múltiplas instituições. Sem Pluggy, precisaria ser instituição participante.

### Fluxo de Consentimento
```
1. Usuário clica "Conectar banco"
2. App chama Pluggy API → gera Connect Token
3. Pluggy Widget abre in-app (JSR 2025, sem sair do app)
4. Usuário autentica no banco dentro do widget
5. Pluggy retorna Item ID
6. App armazena Item ID criptografado (nunca token bruto)
7. Pluggy sincroniza via webhook
```

### Fluxo de Sincronização
```
Pluggy Webhook → POST /webhooks/pluggy
  → Valida HMAC
  → Enfileira em BullMQ
  → Worker: busca transações via Pluggy API
  → Categorização automática (ML + Pluggy nativo)
  → Salva criptografado em Transaction
  → Dispara avaliação de nudge (assíncrono)
```

### Reconsentimento
- Consentimento válido por 12 meses (BACEN)
- Alertas em 30, 7 e 1 dia antes do vencimento
- Revogação in-app → Pluggy delete + purge de dados locais

---

## Engine de Nudges

### Fase B — Alertas de Meta (free + premium)
Regras determinísticas, custo zero:
- Gasto de categoria > 80% do limite → push de alerta
- Saldo disponível < 50% da reserva de emergência → push de alerta
- Total do mês > 90% da renda declarada → push de alerta

### Fase C — Padrões Comportamentais (premium, 30+ dias de dados)

**Padrões detectados:**

| Padrão | Detecção | Nudge |
|---|---|---|
| Spike pós-salário | Gasto 3 dias após crédito > 40% da média | "Você tende a gastar mais logo após receber. Quer separar compromissos antes?" |
| Compra noturna | Transações 22h-2h acima da média | "Sextas à noite custam 3x mais para você. Normal?" |
| Categoria crescendo | MoM +20% em categoria específica | "Seus gastos com delivery subiram R$180 este mês" |

**Regras invioláveis:**
- Máximo 1 nudge por dia por usuário
- Mesmo tipo de nudge não se repete em menos de 7 dias
- Se usuário dispensou 3x o mesmo tipo → parar de enviar
- Nudge é convite à reflexão, nunca julgamento (vergonha aumenta comportamento compulsivo)

### Score de Saúde Financeira (0-100)
```
30% → % do mês dentro do orçamento
25% → consistência (meses consecutivos dentro do limite)
25% → reserva de emergência (meta: 6x renda mensal)
20% → tendência (vs. 3 meses anteriores)
```

---

## Modelo de Negócio

### Free vs. Premium

| Feature | Free | Premium |
|---|---|---|
| Entrada de transações | Manual | Automática (Open Finance) |
| Contas conectadas | — | Ilimitadas |
| Histórico | 3 meses | Ilimitado |
| Categorização | ✓ | ✓ + ML melhorado |
| Dashboard | ✓ | ✓ |
| Alertas de meta (Fase B) | ✓ | ✓ |
| Nudges comportamentais (Fase C) | — | ✓ |
| Score de saúde financeira | Parcial | ✓ completo |
| Relatórios exportáveis | — | ✓ (CSV/PDF) |

### Precificação
- **Premium Mensal:** R$19,90/mês
- **Premium Anual:** R$159/ano (~R$13,25/mês) — 33% desconto, padrão sugerido

### Stripe
- Stripe Hosted Checkout → zero PCI scope próprio (SAQ A)
- `Customer` criado no signup (mesmo free)
- Cancelamento: `cancel_at_period_end = true` (acesso mantido até fim do período)
- Falha de pagamento: Smart Retry 14 dias → downgrade gracioso (dados preservados)

### Unit Economics (conservador)
```
1.000 usuários free → custo infra ~R$200/mês, custo Pluggy R$0
100 usuários premium (10% conversão):
  Receita: R$1.990/mês
  Custo Pluggy: ~R$200/mês
  Stripe fees: ~R$80/mês
  Infra adicional: ~R$100/mês
  Margem bruta: ~R$1.610/mês
```

---

## Testes

### Pirâmide
- **Unitário (Jest):** domain logic, nudge engine, categorização. Meta: ≥80% coverage
- **Integração (Vitest + Testcontainers):** PostgreSQL + Redis reais. Use cases completos. Sem mock de banco.
- **E2E (Playwright + Detox):** fluxos críticos — signup, upgrade, conexão OF, nudge, export LGPD, cancelamento

### Fluxos E2E obrigatórios
1. Signup → onboarding → primeira transação manual
2. Upgrade free → premium (Stripe test mode)
3. Conexão Open Finance via Pluggy sandbox
4. Recebimento de nudge + dismiss
5. Export de dados (LGPD)
6. Cancelamento de assinatura

---

## CI/CD

### Pipeline (GitHub Actions)
```
Em todo PR:
  → npm audit (bloqueia em CVE crítico)
  → TypeScript strict check
  → ESLint + Prettier
  → Jest (unit, coverage ≥80%)
  → Vitest integração (Testcontainers)
  → better-npm-audit (transitivas)
  → Trivy (imagem Docker)

Merge em develop:
  → Build + push imagem
  → Deploy Railway staging
  → Smoke tests E2E

Merge em main:
  → Aprovação manual obrigatória
  → Deploy Railway prod
  → Health check automático
  → Rollback automático se health falhar
```

### Branches
```
main      ← produção (protegida, merge via PR + aprovação)
develop   ← staging (base para features)
feature/* ← nova feature
fix/*     ← bugfix
chore/*   ← infra, deps
```

### Commits (Conventional Commits)
```
feat(nudge): add post-salary spike detection
fix(auth): correct JWT algorithm to RS256
chore(deps): update pluggy-sdk
docs(api): add OpenAPI spec for transactions
refactor(domain): extract budget calculation to value object
test(integration): add Pluggy webhook processing tests
security(upload): add magic bytes validation
```

Commitlint no pre-commit hook via Husky — rejeita formato inválido.

### Qualidade de Código
- TypeScript strict mode (zero `any` implícito)
- ESLint com regras customizadas (no-console em prod, no-unused-vars)
- Prettier (formatação sem debate)
- SonarQube free tier (code smells, duplicação ≤3%, complexidade ciclomática ≤10)

---

## Trade-offs Registrados

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Monolito modular | Microserviços | Produto não validado; overhead brutal no V1 |
| Open Finance só no premium | Free com OF subsidiado | 1.000 usuários free = R$500-1.500/mês custo zero de receita |
| Pluggy como agregador | Integração direta BACEN | Sem necessidade de ser instituição participante |
| TOTP em vez de SMS 2FA | SMS | SIM swap trivial; SMS é vetor de ataque documentado |
| Stripe Hosted Checkout | Formulário próprio | Zero PCI scope; menos superfície de ataque |
| Testcontainers (banco real) | Mocks de banco | Mock diverge de prod — risco de falso negativo em testes |
