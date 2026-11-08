@AGENTS.md

# CapturaLeads — guia para agentes

## Comandos
- `npm run dev` / `npm run build` / `npm run typecheck` / `npm run lint` / `npm test`
- Banco: `npm run db:push` (sincroniza schema, sem migrations), `npm run db:seed`

## Convenções
- Next.js 16 com `cacheComponents: true`: leitura de cookies/DB deve ficar atrás de `<Suspense>`
  (ou `loading.tsx`). Não use `new Date()` antes de um acesso dinâmico em Server Components.
- Middleware se chama `src/proxy.ts` (Next 16). Ele faz só checagem otimista; a autorização real
  fica na DAL (`src/server/auth/dal.ts`), chamada em toda página, action e route handler.
- shadcn/ui usa o estilo `base-nova` (Base UI): composição via prop `render`, não `asChild`.
- Código de servidor fica em `src/server/**` com `import "server-only"`.
- Regras de negócio puras (SLA, telefone) ficam isoladas e testadas com Vitest (`*.test.ts`).
- Datas no banco: `integer` em ms (`timestamp_ms`). Fuso de negócio vem das configurações de SLA.
- UI e mensagens em pt-BR. Commits em Conventional Commits referenciando a issue.
