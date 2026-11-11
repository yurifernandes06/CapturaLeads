# Deploy e backup

Dois caminhos testados. Escolha um:

| | Vercel + Turso (recomendado) | VPS / Docker |
| --- | --- | --- |
| Custo inicial | grátis (Hobby + Turso free) | a partir de ~US$ 5/mês |
| Banco | Turso (libSQL gerenciado) | SQLite em disco ou Turso |
| SLA | `/api/cron/sla` chamado por agendador | tick interno (já vem ligado) |
| Rate limit | Upstash Redis (opcional, recomendado) | memória (uma instância) |

## Atalho: Vercel + Turso pelo Marketplace

Com o projeto vinculado (`vercel link`) e a integração **Turso** conectada a ele, um script faz o resto
(variáveis, segredos do cron no GitHub, tabelas e admin). Rode no seu terminal (Git Bash):

```bash
bash scripts/setup-vercel.sh voce@empresa.com "Seu Nome"   # pede a senha do admin sem mostrar
npx vercel@latest deploy --prod
```

O app aceita tanto `DATABASE_URL`/`DATABASE_AUTH_TOKEN` quanto `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.

## 1. Banco (Turso)

```bash
turso db create capturaleads
turso db show capturaleads --url        # → DATABASE_URL (libsql://…)
turso db tokens create capturaleads      # → DATABASE_AUTH_TOKEN
```

Com as duas variáveis no `.env` local, crie as tabelas e o primeiro admin:

```bash
npm run db:migrate
npm run admin:create -- voce@empresa.com "Seu Nome" "senha-forte"
```

> Não rode `npm run db:seed` em produção: ele cria usuários e leads de demonstração.

## 2. Variáveis de ambiente

> Em produção o app **não sobe** se faltar `CRON_SECRET`/`DATABASE_AUTH_TOKEN`, se `APP_URL` estiver em localhost,
> se algum segredo ainda for o valor de exemplo (`troque-...`) ou se a Vercel apontar para SQLite local.
> A mensagem de erro do boot lista exatamente o que corrigir.

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `APP_URL` | sim | URL pública, ex.: `https://leads.suaempresa.com` (usada nos webhooks) |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | sim | do passo 1 |
| `CRON_SECRET` | sim | `openssl rand -hex 32` |
| `SLA_INTERNAL_TICK` | não | padrão: desligado na Vercel, ligado em VPS |
| `PUBLIC_API_KEY` | se usar a API | `openssl rand -hex 24` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Vercel | rate limit compartilhado (login e formulário). Sem ele o boot avisa |
| `TURNSTILE_SITE_KEY` / `_SECRET_KEY` | recomendado | captcha do formulário público (Cloudflare Turnstile, grátis) |
| `WHATSAPP_PROVIDER` e variáveis do provedor | sim | ver README → Configuração do WhatsApp |
| `WHATSAPP_WEBHOOK_TOKEN` | Evolution | token na query do webhook |
| `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID` | Vercel | mídia do WhatsApp em store **privado** do Vercel Blob; sem isso grava em `data/media` (só VPS) |

## 3a. Vercel

1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Cadastre as variáveis do passo 2 (Production e Preview).
3. Para mídia do WhatsApp (fotos, áudios, documentos): em **Storage → Blob**, crie um store com acesso **Private** e conecte ao projeto — as credenciais entram sozinhas.
4. Opcional: adicione **Upstash Redis** pelo Marketplace da Vercel e copie as variáveis REST.
5. **Agendador do SLA** — escolha um:
   - **GitHub Actions (grátis):** em *Settings → Secrets and variables → Actions*, crie `APP_URL` e
     `CRON_SECRET`. O workflow `.github/workflows/sla-cron.yml` chama a rota a cada ~5 min.
   - **Vercel Cron (plano Pro):** crie `vercel.json` com
     `{"crons":[{"path":"/api/cron/sla","schedule":"*/5 * * * *"}]}`. A Vercel envia
     `Authorization: Bearer $CRON_SECRET` automaticamente.
   - **cron-job.org** ou similar: `GET $APP_URL/api/cron/sla` com o header `Authorization`.
6. Configure o webhook do WhatsApp com a URL mostrada em **Configurações → WhatsApp**.

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

## Monitoramento e backup

- **Health-check:** `GET /api/health` (público, sem segredos). Responde `503` se o banco cair ou se o SLA
  não for recalculado há mais de 15 min (agendador parado). Cadastre a URL num monitor grátis
  (UptimeRobot, Better Stack) para receber alerta.
- **Erros do servidor:** saem nos logs da Vercel como JSON de uma linha (`"level":"error"`). Com
  `ERROR_WEBHOOK_URL` definido, cada erro também gera um aviso por POST (ex.: Slack/Discord) só com o
  código (`digest`), a rota e o método — a mensagem completa fica no log, que pode conter dados pessoais.
- **Alertas de SLA no WhatsApp:** no máximo 30 por passada do cron; o sino do app avisa todos.
- **Backup:** o Turso já guarda histórico (point-in-time). Para uma cópia extra, rode `npm run db:backup`
  na sua máquina: gera um JSON com todas as tabelas em `backups/` (ignorado pelo git). Contém dados
  pessoais de leads: guarde em local seguro e apague cópias antigas.
- **Região:** deixe a função da Vercel na mesma região do banco Turso (Settings → Functions → Region),
  senão cada consulta paga a ida e volta entre continentes.
- **Cron 401:** se o GitHub Actions do SLA responder 401, os segredos divergiram: rode
  `ROTATE_CRON=1 bash scripts/setup-vercel.sh`.

