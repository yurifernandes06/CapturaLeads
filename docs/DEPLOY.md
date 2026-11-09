# Deploy e backup

Dois caminhos testados. Escolha um:

| | Vercel + Turso (recomendado) | VPS / Docker |
| --- | --- | --- |
| Custo inicial | grátis (Hobby + Turso free) | a partir de ~US$ 5/mês |
| Banco | Turso (libSQL gerenciado) | SQLite em disco ou Turso |
| SLA | `/api/cron/sla` chamado por agendador | tick interno (já vem ligado) |
| Rate limit | Upstash Redis (opcional, recomendado) | memória (uma instância) |

## 1. Banco (Turso)

```bash
turso db create capturaleads
turso db show capturaleads --url        # → DATABASE_URL (libsql://…)
turso db tokens create capturaleads      # → DATABASE_AUTH_TOKEN
```

Com as duas variáveis no `.env` local, crie as tabelas e o primeiro admin:

```bash
npm run db:push
npm run admin:create -- voce@empresa.com "Seu Nome" "senha-forte"
```

> Não rode `npm run db:seed` em produção: ele cria usuários e leads de demonstração.

## 2. Variáveis de ambiente

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `APP_URL` | sim | URL pública, ex.: `https://leads.suaempresa.com` (usada nos webhooks) |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | sim | do passo 1 |
| `CRON_SECRET` | sim | `openssl rand -hex 32` |
| `SLA_INTERNAL_TICK` | sim | `false` na Vercel, `true` em VPS |
| `PUBLIC_API_KEY` | se usar a API | `openssl rand -hex 24` |
| `WHATSAPP_PROVIDER` e variáveis do provedor | sim | ver README → Configuração do WhatsApp |
| `WHATSAPP_WEBHOOK_TOKEN` | Evolution | token na query do webhook |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | não | rate limit compartilhado entre instâncias |

## 3a. Vercel

1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Cadastre as variáveis do passo 2 (Production e Preview).
3. Opcional: adicione **Upstash Redis** pelo Marketplace da Vercel e copie as variáveis REST.
4. **Agendador do SLA** — escolha um:
   - **GitHub Actions (grátis):** em *Settings → Secrets and variables → Actions*, crie `APP_URL` e
     `CRON_SECRET`. O workflow `.github/workflows/sla-cron.yml` chama a rota a cada ~5 min.
   - **Vercel Cron (plano Pro):** crie `vercel.json` com
     `{"crons":[{"path":"/api/cron/sla","schedule":"*/5 * * * *"}]}`. A Vercel envia
     `Authorization: Bearer $CRON_SECRET` automaticamente.
   - **cron-job.org** ou similar: `GET $APP_URL/api/cron/sla` com o header `Authorization`.
5. Configure o webhook do WhatsApp com a URL mostrada em **Configurações → WhatsApp**.

Verifique o agendador:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://leads.suaempresa.com/api/cron/sla
# {"ok":true,"updated":…,"breached":…,"ms":…}
```

## 3b. VPS / Docker

```bash
npm ci && npm run build
SLA_INTERNAL_TICK=true npm start      # porta 3000; use PM2/systemd para manter no ar
```

Coloque um proxy reverso com HTTPS (Caddy ou Nginx) na frente. O tick interno recalcula o SLA a
cada minuto; não precisa de agendador externo. Com SQLite local, aponte `DATABASE_URL` para um
caminho persistente (ex.: `file:/var/lib/capturaleads/app.db`).

## 4. Backup

**Turso:** tem restauração point-in-time nativa (janela depende do plano). Para uma cópia própria:

```bash
turso db shell capturaleads .dump > backup-$(date +%F).sql
```

**SQLite em VPS:** use o backup online do SQLite (seguro com o app rodando) em um cron diário:

```bash
# /etc/cron.d/capturaleads-backup — todo dia às 3h, mantém 14 dias
0 3 * * * app sqlite3 /var/lib/capturaleads/app.db ".backup /var/backups/capturaleads/app-$(date +\%F).db" && find /var/backups/capturaleads -name 'app-*.db' -mtime +14 -delete
```

Mande os arquivos para fora da máquina (S3, Backblaze B2, rclone). Teste a restauração de vez em
quando: copie o backup para `data/dev.db` e suba o app localmente.

## Checklist pós-deploy

- [ ] Login com o admin criado pelo `admin:create`
- [ ] `GET /api/cron/sla` responde `ok: true` com o header
- [ ] Formulário `/f/<slug>` cria lead e aparece no dashboard
- [ ] Mensagem de teste no WhatsApp cria/atualiza o lead
- [ ] Backup rodou pelo menos uma vez e foi restaurado em teste
