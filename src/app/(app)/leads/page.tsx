import { DownloadIcon, InboxIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { PriorityBadge, StageBadge, WhatsAppIcon } from "@/components/leads/badges";
import { SlaIndicator } from "@/components/leads/sla-indicator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatRelative } from "@/lib/format";
import { filtersToSearch, parseLeadFilters } from "@/lib/lead-filters";
import { SOURCE_LABEL } from "@/lib/leads";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { listLeads, listOwners, listTags } from "@/server/leads/queries";
import { sweepIfStale } from "@/server/sla/service";
import { LeadFiltersBar } from "./lead-filters";
import { NewLeadDialog } from "./new-lead-dialog";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage(props: PageProps<"/leads">) {
  const user = await requireUser();
  const filters = parseLeadFilters(await props.searchParams);
  await sweepIfStale();
  const [{ rows, total, page, pageCount }, owners, tags] = await Promise.all([
    getSetting("sla").then((sla) => listLeads(filters, user.id, sla.timezone)),
    listOwners(),
    listTags(),
  ]);
  const now = requestNow();
  const activeOwners = owners.filter((o) => o.active).map(({ id, name }) => ({ id, name }));

  return (
    <>
      <PageHeader
        eyebrow="Carteira"
        title="Leads"
        description={`${total} ${total === 1 ? "lead encontrado" : "leads encontrados"}`}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/api/leads/export${filtersToSearch({ ...filters, page: undefined })}`} />}
            >
              <DownloadIcon /> {user.role === "admin" ? "Exportar CSV" : "Exportar meus leads"}
            </Button>
            <NewLeadDialog owners={activeOwners} currentUserId={user.id} />
          </>
        }
      />

      <LeadFiltersBar filters={filters} owners={owners.map(({ id, name }) => ({ id, name }))} tags={tags} />

      <Card className="mt-4 gap-0 overflow-hidden py-0">
        {rows.length === 0 ? (
          <div className="grid place-items-center gap-2 px-6 py-20 text-center">
            <InboxIcon className="size-10 text-muted-foreground/50" />
            <p className="font-medium">Nenhum lead por aqui</p>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre um lead novo.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-black/30 hover:bg-black/30">
                <TableHead className="pl-4">Lead</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden sm:table-cell">Etapa</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="hidden lg:table-cell">Origem</TableHead>
                <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Valor</TableHead>
                <TableHead className="pr-4 text-right">Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ lead, ownerName }) => (
                <TableRow key={lead.id} className="group relative">
                  <TableCell className="max-w-64 pl-4">
                    <Link href={`/leads/${lead.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={lead.priority} showLabel={false} />
                        <span className="truncate font-medium group-hover:text-primary-text">{lead.name}</span>
                      </div>
                      {lead.company ? <div className="truncate pl-5.5 text-xs text-muted-foreground">{lead.company}</div> : null}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {lead.phone ? (
                      <a
                        href={whatsappLink(lead.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-whatsapp"
                      >
                        <WhatsAppIcon className="size-3.5" />
                        {formatPhone(lead.phone)}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{lead.email ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StageBadge stage={lead.stage} />
                  </TableCell>
                  <TableCell>
                    <SlaIndicator
                      compact
                      status={lead.slaStatus}
                      kind={lead.slaKind}
                      dueAt={lead.slaDueAt?.toISOString() ?? null}
                    />
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {SOURCE_LABEL[lead.source]}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    {ownerName ?? <span className="text-muted-foreground">Sem responsável</span>}
                  </TableCell>
                  <TableCell className="tabular hidden text-right text-sm sm:table-cell">
                    {lead.value ? formatCurrency(lead.value) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-sm whitespace-nowrap text-muted-foreground">
                    {formatRelative(lead.createdAt, now)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {pageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm text-muted-foreground" aria-label="Paginação">
          <span>
            Página {page} de {pageCount}
          </span>
          <div className="flex gap-2">
            <PageLink href={page > 1 ? `/leads${filtersToSearch({ ...filters, page: page - 1 })}` : null}>Anterior</PageLink>
            <PageLink href={page < pageCount ? `/leads${filtersToSearch({ ...filters, page: page + 1 })}` : null}>
              Próxima
            </PageLink>
          </div>
        </nav>
      ) : null}
    </>
  );
}

function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (!href) return <span className={cn(className, "pointer-events-none opacity-50")}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
