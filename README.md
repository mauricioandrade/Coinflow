# Coinflow

App de organização financeira pessoal para o mercado brasileiro. Transforma consciência financeira em mudança real de comportamento.

## O Problema

Apps financeiros mostram o problema. Não mudam comportamento. 73% dos usuários abandonam após 3 meses.

## A Solução

Jornada progressiva em três fases:

1. **Visibilidade** — usuário declara renda, registra gastos (manual ou Open Finance), vê para onde o dinheiro vai pela primeira vez
2. **Controle** — metas por categoria, alertas antes de estourar o limite
3. **Comportamento** — após 30+ dias de dados, nudges baseados em padrões reais do usuário ("você gasta 40% mais nos 3 dias após receber")

## Stack

- **Backend:** Node.js + TypeScript + Fastify (Clean Architecture)
- **Mobile:** React Native (Expo) — iOS e Android
- **Banco:** PostgreSQL + Redis
- **Open Finance:** Pluggy (agregador)
- **Pagamentos:** Stripe
- **Infra:** Docker + Railway

## Planos

| | Free | Premium (R$19,90/mês) |
|---|---|---|
| Entrada de transações | Manual | Automática via Open Finance |
| Alertas de meta | ✓ | ✓ |
| Nudges comportamentais | — | ✓ |
| Histórico | 3 meses | Ilimitado |
| Relatórios | — | ✓ |

## Segurança

- Dados financeiros e PII criptografados em coluna (AES-256-GCM)
- Senhas com Argon2id
- 2FA via TOTP (sem SMS)
- LGPD completo: export e deleção sob demanda
- Zero dados sensíveis em logs
- Supply chain auditado em CI

## Documentação

- [Design Spec](docs/superpowers/specs/2026-06-28-coinflow-design.md)

## Desenvolvimento

```bash
# Instalar dependências
npm ci

# Rodar testes
npm test

# Rodar em desenvolvimento
npm run dev
```

## Branches

```
main      ← produção
develop   ← staging
feature/* ← novas features
fix/*     ← bugfixes
chore/*   ← infra e dependências
```

## Commits

Projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(nudge): add post-salary spike detection
fix(auth): correct JWT expiry check
security(upload): add magic bytes validation
```
