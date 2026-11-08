/**
 * Popula o banco com dados de demonstração. Idempotente: pode rodar várias vezes.
 */
import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Priority, Source, Stage } from "@/lib/leads";

const DEMO_PASSWORD = "capturaleads";

const USERS = [
  { name: "Admin", email: "admin@capturaleads.dev", role: "admin" as const, phone: null },
  { name: "João Vendas", email: "joao@capturaleads.dev", role: "sales" as const, phone: "5511990000001" },
  { name: "Marina Costa", email: "marina@capturaleads.dev", role: "sales" as const, phone: "5511990000002" },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of USERS) {
    await db
      .insert(schema.users)
      .values({ ...u, passwordHash })
      .onConflictDoNothing({ target: schema.users.email });
  }
  return db.select().from(schema.users);
}

// PRNG determinístico: o seed gera sempre os mesmos dados.
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;

const FIRST = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Marcos", "Natália", "Otávio", "Paula", "Rafael", "Sofia", "Thiago", "Vanessa", "Yuri"];
const LAST = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Carvalho", "Ferreira", "Almeida", "Ribeiro"];
const COMPANIES = [null, null, "Padaria Pão Nosso", "Clínica Sorriso", "Studio Fit", "Auto Peças Rápido", "Escola Aprender", "Imobiliária Lar", "Pet Shop Amigo", "Loja Bella Moda"];
const MESSAGES = [
  "Oi! Vi o anúncio e queria saber os valores.",
  "Vocês atendem na minha região?",
  "Quero um orçamento para 10 pessoas.",
  "Tem plano anual com desconto?",
  "Preciso começar ainda este mês, é possível?",
  "Gostaria de agendar uma demonstração.",
];
const TAGS = ["plano-anual", "evento-sp", "black-friday", "indicacao-cliente", "retorno"];
const SOURCES_W: Source[] = ["whatsapp", "whatsapp", "whatsapp", "form", "form", "instagram", "google", "referral", "manual"];
const STAGES_W: Stage[] = ["new", "new", "new", "contacted", "contacted", "qualified", "proposal", "won", "lost"];
const PRIORITIES_W: Priority[] = ["high", "medium", "medium", "low"];

async function seedLeads(users: (typeof schema.users.$inferSelect)[]) {
  const [{ n }] = (await db.select({ n: count() }).from(schema.leads)) as [{ n: number }];
  if (n > 0) return 0;

  const sales = users.filter((u) => u.role === "sales");
  const now = Date.now();
  const MIN = 60_000;

  for (let i = 0; i < 48; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const stage = i < 6 ? "new" : pick(STAGES_W);
    const source = pick(SOURCES_W);
    // Leads mais recentes concentrados nas últimas horas para o SLA ter o que mostrar.
    const ageMin = i < 6 ? 3 + i * 9 : Math.floor(rand() * 14 * 24 * 60);
    const createdAt = new Date(now - ageMin * MIN);
    const message = pick(MESSAGES);
    const owner = i % 7 === 0 ? null : pick(sales);
    const responded = stage !== "new";
    const firstResponseAt = responded ? new Date(createdAt.getTime() + (2 + Math.floor(rand() * 40)) * MIN) : null;
    const closed = stage === "won" || stage === "lost";

    const [lead] = await db
      .insert(schema.leads)
      .values({
        name,
        phone: `55119${String(80000000 + i * 1371).padStart(8, "0")}`,
        email: rand() > 0.4 ? `${name.split(" ")[0]!.toLowerCase()}${i}@email.com` : null,
        company: pick(COMPANIES),
        stage,
        priority: pick(PRIORITIES_W),
        source,
        ownerId: owner?.id ?? null,
        value: rand() > 0.3 ? Math.round(500 + rand() * 9500) * 100 : 0,
        tags: rand() > 0.6 ? [pick(TAGS)] : [],
        message,
        lostReason: stage === "lost" ? pick(["Preço", "Sem resposta", "Comprou do concorrente"]) : null,
        utmSource: source === "form" ? "google" : null,
        utmCampaign: source === "form" ? pick(["black-friday", "institucional"]) : null,
        firstResponseAt,
        lastInboundAt: source === "whatsapp" ? createdAt : null,
        lastOutboundAt: firstResponseAt,
        lastActivityAt: firstResponseAt,
        closedAt: closed ? new Date(createdAt.getTime() + Math.floor(rand() * 3 * 24 * 60) * MIN) : null,
        createdAt,
      })
      .returning();

    const acts: (typeof schema.activities.$inferInsert)[] = [
      { leadId: lead!.id, type: "created", body: message, meta: { source }, createdAt },
    ];
    if (source === "whatsapp") acts.push({ leadId: lead!.id, type: "whatsapp_in", body: message, createdAt });
    if (firstResponseAt && owner) {
      acts.push({
        leadId: lead!.id,
        userId: owner.id,
        type: "whatsapp_out",
        body: `Olá, ${name.split(" ")[0]}! Aqui é ${owner.name.split(" ")[0]}, obrigado pelo contato. Posso te ajudar?`,
        createdAt: firstResponseAt,
      });
      if (stage !== "contacted") {
        acts.push({
          leadId: lead!.id,
          userId: owner.id,
          type: "stage_change",
          meta: { from: "contacted", to: stage },
          createdAt: new Date(firstResponseAt.getTime() + 30 * MIN),
        });
      }
    }
    await db.insert(schema.activities).values(acts);
  }
  return 48;
}

async function seedForms() {
  await db
    .insert(schema.forms)
    .values({
      slug: "orcamento",
      name: "Orçamento (site)",
      title: "Receba seu orçamento pelo WhatsApp",
      description: "Deixe seu contato e um especialista fala com você em poucos minutos, no horário comercial.",
      priority: "high",
      tags: ["site"],
      welcomeMessage: "Oi, {{primeiro_nome}}! Recebemos seu pedido de orçamento. Sou {{vendedor}} e já vou te atender 🙂",
    })
    .onConflictDoNothing({ target: schema.forms.slug });
}

async function main() {
  const users = await seedUsers();
  console.log(`✓ ${users.length} usuários (senha: ${DEMO_PASSWORD})`);
  for (const u of USERS) console.log(`  - ${u.email} (${u.role})`);
  const leads = await seedLeads(users);
  console.log(leads ? `✓ ${leads} leads de demonstração` : "• leads já existentes, pulando");
  await seedForms();
  console.log("✓ formulário de exemplo em /f/orcamento");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
