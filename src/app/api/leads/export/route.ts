import type { NextRequest } from "next/server";
import { parseLeadFilters } from "@/lib/lead-filters";
import { PRIORITY_META, SOURCE_LABEL, STAGE_META } from "@/lib/leads";
import { exportOwnerFilter } from "@/lib/permissions";
import { getCurrentUser } from "@/server/auth/dal";
import { exportLeads } from "@/server/leads/queries";

/** CSV com ";" e BOM UTF-8 — abre direto no Excel em pt-BR. */
function cell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  // Neutraliza fórmulas (CSV injection) e escapa aspas.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const parsed = parseLeadFilters(Object.fromEntries(request.nextUrl.searchParams));
  // Base inteira só para admin: vendedor exporta a própria carteira.
  const filters = { ...parsed, owner: exportOwnerFilter(user, parsed.owner) };
  const rows = await exportLeads(filters, user.id);
  console.info(`[export] ${user.email} (${user.role}) exportou ${rows.length} leads`);

  const header = [
    "Nome",
    "Telefone",
    "E-mail",
    "Empresa",
    "Etapa",
    "Prioridade",
    "Origem",
    "Responsável",
    "Valor (R$)",
    "Tags",
    "UTM source",
    "UTM campaign",
    "Criado em",
    "Primeira resposta",
  ];
  const lines = rows.map(({ lead, ownerName }) =>
    [
      lead.name,
      lead.phone,
      lead.email,
      lead.company,
      STAGE_META[lead.stage].label,
      PRIORITY_META[lead.priority].label,
      SOURCE_LABEL[lead.source],
      ownerName,
      (lead.value / 100).toFixed(2).replace(".", ","),
      lead.tags.join(", "),
      lead.utmSource,
      lead.utmCampaign,
      lead.createdAt.toISOString(),
      lead.firstResponseAt?.toISOString(),
    ]
      .map(cell)
      .join(";"),
  );

  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
