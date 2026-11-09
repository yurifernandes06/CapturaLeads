import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveRefresh } from "@/components/app/live-refresh";
import { PageHeader } from "@/components/app/page-header";
import { WhatsAppIcon } from "@/components/leads/badges";
import { MessageMedia, mediaFromMeta } from "@/components/leads/message-media";
import { SlaIndicator } from "@/components/leads/sla-indicator";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative, initials } from "@/lib/format";
import { INBOX_FILTERS, INBOX_FILTER_LABEL, isAwaitingReply, parseInboxFilter } from "@/lib/inbox";
import { STAGE_META } from "@/lib/leads";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { requestNow } from "@/server/clock";
import { listConversations, listMessages } from "@/server/inbox";
import { getLead } from "@/server/leads/queries";
import { getSetting } from "@/server/settings";
import { whatsapp } from "@/server/whatsapp";
import { WhatsAppComposer } from "../leads/[id]/whatsapp-composer";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage(props: PageProps<"/inbox">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const filter = parseInboxFilter(sp.filter);
  const selectedId = typeof sp.c === "string" ? sp.c : null;
  const now = requestNow();

  const [conversations, selected, messages, templates] = await Promise.all([
    listConversations({ filter, userId: user.id }),
    selectedId ? getLead(selectedId) : null,
    selectedId ? listMessages(selectedId) : [],
    getSetting("whatsappTemplates"),
  ]);

  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const next = { filter, c: selectedId, ...patch };
    if (next.filter && next.filter !== "all") params.set("filter", next.filter);
    if (next.c) params.set("c", next.c);
    const qs = params.toString();
    return qs ? `/inbox?${qs}` : "/inbox";
  };

  return (
    <div className="grid gap-6">
      <LiveRefresh />
      <PageHeader title="Inbox" description="Conversas de WhatsApp com os leads, da mais recente para a mais antiga." />

      <div className="grid h-[calc(100svh-13rem)] min-h-[28rem] overflow-hidden rounded-xl border bg-card lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Lista de conversas (no celular some quando há conversa aberta) */}
        <section aria-label="Conversas" className={cn("flex min-h-0 flex-col border-r", selected && "max-lg:hidden")}>
          <nav className="flex gap-1 border-b p-2" aria-label="Filtro">
            {INBOX_FILTERS.map((f) => (
              <Link
                key={f}
                href={href({ filter: f })}
                aria-current={f === filter ? "page" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  f === filter && "bg-secondary text-foreground",
                )}
              >
                {INBOX_FILTER_LABEL[f]}
              </Link>
            ))}
          </nav>
          {conversations.length ? (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {conversations.map(({ lead, lastAt, lastMessage, lastDirection, ownerName }) => {
                const awaiting = isAwaitingReply(lead);
                return (
                  <li key={lead.id}>
                    <Link
                      href={href({ c: lead.id })}
                      aria-current={lead.id === selectedId ? "true" : undefined}
                      className={cn(
                        "flex gap-3 border-b px-3 py-3 transition-colors hover:bg-muted/50",
                        lead.id === selectedId && "bg-muted",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-whatsapp/12 text-xs font-semibold text-whatsapp">
                        {initials(lead.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cn("truncate text-sm", awaiting ? "font-semibold" : "font-medium")}>{lead.name}</p>
                          <time className="shrink-0 text-xs text-muted-foreground" dateTime={lastAt?.toISOString()}>
                            {lastAt ? formatRelative(lastAt, now) : ""}
                          </time>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={cn("min-w-0 flex-1 truncate text-xs", awaiting ? "text-foreground" : "text-muted-foreground")}>
                            {lastDirection === "whatsapp_out" ? "Você: " : ""}
                            {lastMessage ?? "—"}
                          </p>
                          {awaiting ? (
                            <span className="size-2 shrink-0 rounded-full bg-whatsapp" aria-label="Aguardando resposta" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {STAGE_META[lead.stage].label} · {ownerName ?? "sem responsável"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {filter === "awaiting" ? "Ninguém esperando resposta. 🎉" : "Nenhuma conversa ainda."}
            </p>
          )}
        </section>

        {/* Chat */}
        <section aria-label="Conversa" className={cn("flex min-h-0 flex-col", !selected && "max-lg:hidden")}>
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b px-3 py-2.5">
                <Link href={href({ c: null })} className="text-muted-foreground hover:text-foreground lg:hidden" aria-label="Voltar para conversas">
                  <ArrowLeftIcon className="size-5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.lead.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selected.lead.phone ? formatPhone(selected.lead.phone) : "sem telefone"} · {STAGE_META[selected.lead.stage].label}
                  </p>
                </div>
                <SlaIndicator
                  compact
                  status={selected.lead.slaStatus}
                  kind={selected.lead.slaKind}
                  dueAt={selected.lead.slaDueAt?.toISOString() ?? null}
                />
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/leads/${selected.lead.id}`} />}>
                  <ExternalLinkIcon /> <span className="max-sm:hidden">Abrir lead</span>
                </Button>
              </header>

              {/* column-reverse: começa rolado no fim, sem JS */}
              <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto bg-muted/30 px-3 py-4">
                <ol className="grid gap-2">
                  {messages.length ? (
                    messages.map((m) => {
                      const out = m.type === "whatsapp_out";
                      const media = mediaFromMeta(m.meta);
                      // Com anexo, a legenda substitui o rótulo ("📷 Imagem: …").
                      const text = media ? media.caption : m.body;
                      return (
                        <li key={m.id} className={cn("flex", out ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-xs",
                              out ? "rounded-tr-sm bg-whatsapp/15" : "rounded-tl-sm bg-card",
                            )}
                          >
                            {media ? <MessageMedia media={media} className={text ? "mb-1.5" : undefined} /> : null}
                            {text ? <p className="break-words whitespace-pre-wrap">{text}</p> : null}
                            <p className="mt-1 text-right text-[11px] text-muted-foreground">
                              {out && m.userName ? `${m.userName.split(" ")[0]} · ` : ""}
                              <time dateTime={m.createdAt.toISOString()} title={formatDateTime(m.createdAt)}>
                                {formatRelative(m.createdAt, now)}
                              </time>
                            </p>
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</li>
                  )}
                </ol>
              </div>

              <div className="border-t p-3">
                <WhatsAppComposer
                  leadId={selected.lead.id}
                  hasPhone={Boolean(selected.lead.phone)}
                  templates={templates}
                  vars={{ nome: selected.lead.name, empresa: selected.lead.company, vendedor: selected.ownerName ?? user.name }}
                  providerLabel={whatsapp().label}
                />
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6 text-center">
              <div className="grid justify-items-center gap-2 text-muted-foreground">
                <span className="grid size-12 place-items-center rounded-full bg-whatsapp/12 text-whatsapp">
                  <WhatsAppIcon className="size-6" />
                </span>
                <p className="text-sm">Escolha uma conversa para ver as mensagens.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
