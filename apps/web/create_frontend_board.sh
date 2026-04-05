#!/usr/bin/env bash
# =============================================================================
# create_frontend_board.sh — Coinflow Web GitHub Project Board Setup
#
# Creates labels, milestones, and issues for the frontend repository.
# Requires: gh CLI authenticated (gh auth login)
#
# Usage: bash create_frontend_board.sh
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
# Change REPO to your frontend repository (owner/repo)
REPO="${GITHUB_REPO:-mauricioandrade/coinflow-web}"

echo "🚀 Setting up GitHub project board for: $REPO"
echo ""

# ── Labels ────────────────────────────────────────────────────────────────────
echo "🏷️  Creating labels..."

gh label create "ui/ux"         --repo "$REPO" --color "E91E8C" --description "🎨 UI/UX improvements and design system" --force
gh label create "performance"   --repo "$REPO" --color "FF9800" --description "⚡ Performance optimizations (LCP, CLS, FID)" --force
gh label create "security"      --repo "$REPO" --color "F44336" --description "🔒 Security hardening and vulnerability fixes" --force
gh label create "testing"       --repo "$REPO" --color "4CAF50" --description "🧪 Tests, E2E flows, and QA coverage" --force

echo "✅ Labels created."
echo ""

# ── Milestones ────────────────────────────────────────────────────────────────
echo "🎯 Creating milestones..."

gh api repos/"$REPO"/milestones --method POST \
  --field title="🎨 v0.1 - Fundação e Design System" \
  --field description="Scaffold, design tokens, componentes base, autenticação e layout do dashboard." \
  --field state="open" || true

gh api repos/"$REPO"/milestones --method POST \
  --field title="⚡ v0.2 - Dashboard e Performance" \
  --field description="Dashboard principal, gráficos, listagem de transações, metas e otimizações de Core Web Vitals." \
  --field state="open" || true

gh api repos/"$REPO"/milestones --method POST \
  --field title="🧪 v0.3 - Testes E2E e Lançamento" \
  --field description="Cobertura completa de testes E2E, acessibilidade, CSP e preparação para produção." \
  --field state="open" || true

echo "✅ Milestones created."
echo ""

# ── Milestone titles (gh CLI accepts title strings directly) ──────────────────
M1="🎨 v0.1 - Fundação e Design System"
M2="⚡ v0.2 - Dashboard e Performance"
M3="🧪 v0.3 - Testes E2E e Lançamento"

# ── Issues ────────────────────────────────────────────────────────────────────
echo "📋 Creating issues..."

# v0.1 — Fundação e Design System
gh issue create --repo "$REPO" \
  --title "🎨 Implementar design tokens (cores, tipografia, espaçamento)" \
  --body "Definir e documentar os design tokens do Coinflow Web no Tailwind config. Incluir paleta de cores para modo claro/escuro, escala tipográfica e sistema de espaçamento." \
  --label "ui/ux" \
  --milestone "$M1"

gh issue create --repo "$REPO" \
  --title "🎨 Criar componentes base do Design System (Button, Input, Card)" \
  --body "Padronizar e documentar os componentes base utilizados em toda a aplicação. Garantir acessibilidade (WCAG AA) e suporte a dark mode." \
  --label "ui/ux" \
  --milestone "$M1"

gh issue create --repo "$REPO" \
  --title "🎨 Implementar sidebar e top nav do Dashboard" \
  --body "Construir o layout principal do dashboard com sidebar responsiva, navegação por seções e indicador de rota ativa. Placeholders definidos no DashboardLayout." \
  --label "ui/ux" \
  --milestone "$M1"

gh issue create --repo "$REPO" \
  --title "🔒 Implementar middleware de autenticação (proteção de rotas)" \
  --body "Criar middleware Next.js que verifica o cookie cf_session e redireciona usuários não autenticados para /login. Proteger todas as rotas do grupo (dashboard)." \
  --label "security" \
  --milestone "$M1"

gh issue create --repo "$REPO" \
  --title "🎨 Implementar fluxo de registro de usuário" \
  --body "Conectar o RegisterForm ao authService.register(). Incluir validação de senha forte, feedback de erro e redirecionamento pós-registro." \
  --label "ui/ux" \
  --milestone "$M1"

# v0.2 — Dashboard e Performance
gh issue create --repo "$REPO" \
  --title "⚡ Otimizar LCP no Dashboard" \
  --body "Identificar e otimizar o elemento Largest Contentful Paint do dashboard. Metas: LCP < 2.5s em P75. Usar next/image, preload de fontes e streaming SSR." \
  --label "performance" \
  --milestone "$M2"

gh issue create --repo "$REPO" \
  --title "⚡ Implementar listagem de transações com paginação infinita" \
  --body "Criar TransactionList com react-query infinite scroll. Virtualizar a lista para evitar DOM excessivo. Skeleton loading para UX durante fetch." \
  --label "performance" \
  --milestone "$M2"

gh issue create --repo "$REPO" \
  --title "⚡ Adicionar cache e prefetch de dados com TanStack Query" \
  --body "Configurar staleTime, gcTime e prefetchQuery nas rotas do dashboard. Objetivo: zero loading spinner em navegação entre páginas já visitadas." \
  --label "performance" \
  --milestone "$M2"

gh issue create --repo "$REPO" \
  --title "🎨 Criar dashboard com resumo financeiro (saldo, receitas, despesas)" \
  --body "Página principal do dashboard com cards de resumo: saldo total, receitas e despesas do mês. Gráfico de evolução mensal com Recharts ou similar." \
  --label "ui/ux" \
  --milestone "$M2"

gh issue create --repo "$REPO" \
  --title "⚡ Implementar bundle analysis e reduzir JavaScript inicial" \
  --body "Configurar @next/bundle-analyzer. Identificar dependências pesadas e aplicar dynamic import / code splitting. Meta: JS inicial < 200 kB gzipped." \
  --label "performance" \
  --milestone "$M2"

gh issue create --repo "$REPO" \
  --title "🎨 Conectar TransactionForm ao endpoint de criação de transações" \
  --body "Wiring da Fase 2: substituir o console.debug no TransactionForm pelo hook useCreateTransaction que chama transactionService.create(). Adicionar toast de sucesso/erro." \
  --label "ui/ux" \
  --milestone "$M2"

# v0.3 — Testes E2E e Lançamento
gh issue create --repo "$REPO" \
  --title "🔒 Implementar Content Security Policy (CSP)" \
  --body "Adicionar middleware CSP com nonce para scripts inline. Política inicial: default-src 'self', script-src com nonce, style-src 'self'. Testar com report-uri antes de enforce." \
  --label "security" \
  --milestone "$M3"

gh issue create --repo "$REPO" \
  --title "🧪 Testar fluxo de conciliação bancária" \
  --body "E2E Playwright cobrindo: login → listagem de transações → criação → edição → exclusão. Incluir cenários de erro (rede offline, token expirado)." \
  --label "testing" \
  --milestone "$M3"

gh issue create --repo "$REPO" \
  --title "🧪 Adicionar testes de acessibilidade (axe-core)" \
  --body "Integrar @axe-core/playwright nos testes E2E. Garantir conformidade WCAG 2.1 AA nas páginas de login, dashboard e transações. Zero violações críticas." \
  --label "testing" \
  --milestone "$M3"

gh issue create --repo "$REPO" \
  --title "🧪 Aumentar cobertura de testes unitários para 80%" \
  --body "Adicionar testes unitários para hooks (useLogin, useLogout, useCreateTransaction) e utilitários (lib/api, lib/utils). Meta: 80% de coverage de branches." \
  --label "testing" \
  --milestone "$M3"

gh issue create --repo "$REPO" \
  --title "🔒 Auditoria de segurança pré-lançamento" \
  --body "Executar npm audit, revisar headers de segurança com securityheaders.com, verificar vazamento de dados sensíveis nos logs (removeConsole já ativo em prod) e revisar CORS." \
  --label "security" \
  --milestone "$M3"

gh issue create --repo "$REPO" \
  --title "⚡ Configurar monitoramento de Core Web Vitals em produção" \
  --body "Integrar Web Vitals reporting para Analytics. Configurar alertas para regressões de LCP, CLS e INP. Usar next/vitals ou Vercel Analytics." \
  --label "performance" \
  --milestone "$M3"

echo ""
echo "✅ GitHub board setup completo!"
echo "   Acesse: https://github.com/$REPO/issues"
