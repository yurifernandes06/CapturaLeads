# CapturaLeads

CRM enxuto de captura e gestão de leads para times de vendas que vivem no WhatsApp.
Os leads entram pelo WhatsApp, por formulários públicos ou pela API. O motor de SLA
avisa quando um lead está esperando demais, e o vendedor atende tudo de uma tela só.

## Stack

| Camada | Tecnologia |
| --- | --- |
| App | Next.js 16 (App Router, Server Actions, Cache Components), React 19, TypeScript strict |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), lucide-react, next-themes |
| Dados | Drizzle ORM + libSQL (SQLite local, Turso em produção) |
| Validação | Zod |
| Testes | Vitest |

## Rodando localmente

```bash
cp .env.example .env
npm install
npm run setup    # cria o banco (data/dev.db) e popula dados de demonstração
npm run dev
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |
| `npm run db:push` | Sincroniza o schema com o banco |
| `npm run db:studio` | Abre o Drizzle Studio |
| `npm run db:seed` | Dados de demonstração |
