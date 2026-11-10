#!/usr/bin/env bash
# Configura o projeto na Vercel (variáveis + segredos do cron) e prepara o banco Turso de produção.
# Rode no SEU terminal (Git Bash), na raiz do projeto, depois de:
#   1) `vercel link` para o projeto joao-vitor-bussines
#   2) a integração Turso conectada ao projeto (cria TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)
# Uso: bash scripts/setup-vercel.sh [email-do-admin] ["Nome do Admin"]
# Os segredos são gerados aqui e nunca impressos.
set -euo pipefail

APP_URL="${APP_URL:-https://joao-vitor-bussines.vercel.app}"
ADMIN_EMAIL="${1:-}"
ADMIN_NAME="${2:-João Vitor}"
V="npx -y vercel@latest"

has_env() { $V env ls production 2>/dev/null | grep -qE "^\s*$1\s"; }
set_env() { # nome valor — só cria se ainda não existir (não troca segredos já em uso)
  if has_env "$1"; then echo "• $1 já existe"; return; fi
  for e in production preview; do printf '%s' "$2" | $V env add "$1" "$e" >/dev/null; done
  echo "✓ $1"
}

echo "== Variáveis na Vercel =="
set_env APP_URL "$APP_URL"
set_env SLA_INTERNAL_TICK "false"
set_env WHATSAPP_PROVIDER "mock"
set_env PUBLIC_API_KEY "$(openssl rand -hex 24)"
set_env WHATSAPP_WEBHOOK_TOKEN "$(openssl rand -hex 24)"
if has_env CRON_SECRET; then
  echo "• CRON_SECRET já existe (o secret do GitHub precisa ter o mesmo valor)"
else
  CRON="$(openssl rand -hex 32)"
  set_env CRON_SECRET "$CRON"
  printf '%s' "$CRON" | gh secret set CRON_SECRET >/dev/null && echo "✓ GitHub secret CRON_SECRET"
  unset CRON
fi
printf '%s' "$APP_URL" | gh secret set APP_URL >/dev/null && echo "✓ GitHub secret APP_URL"

echo "== Banco de produção (Turso) =="
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
$V env pull "$TMP" --environment=production --yes >/dev/null
set -a; . "$TMP"; set +a
: "${TURSO_DATABASE_URL:?TURSO_DATABASE_URL não encontrado — a integração Turso está conectada ao projeto?}"
# Exporta explicitamente: o .env local (banco de dev) não pode ganhar daqui.
export DATABASE_URL="$TURSO_DATABASE_URL" DATABASE_AUTH_TOKEN="${TURSO_AUTH_TOKEN:-}"
npx drizzle-kit push
echo "✓ tabelas criadas/atualizadas"

if [ -n "$ADMIN_EMAIL" ]; then
  read -r -s -p "Senha do admin $ADMIN_EMAIL (mín. 8 caracteres): " PASS; echo
  npx tsx scripts/create-admin.ts "$ADMIN_EMAIL" "$ADMIN_NAME" "$PASS"
  unset PASS
fi

echo "Pronto. Agora: npx vercel@latest deploy --prod"
