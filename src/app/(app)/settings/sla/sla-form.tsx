"use client";

import { FlameIcon, SnowflakeIcon, ThermometerIcon } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { formatDuration } from "@/lib/format";
import { addBusinessMinutes } from "@/lib/sla/business-time";
import type { SlaConfig } from "@/lib/sla/config";
import { upcomingHolidays } from "@/lib/sla/holidays";
import { cn } from "@/lib/utils";
import { saveSlaConfig } from "./actions";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Rio_Branco",
  "America/Noronha",
];

export function SlaForm({ config, readOnly }: { config: SlaConfig; readOnly: boolean }) {
  const [draft, setDraft] = useState(config);
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const res = await saveSlaConfig(prev, formData);
    if (res.ok) toast.success("SLA salvo e recalculado para todos os leads abertos.");
    return res;
  }, { ok: false });

  const set = (patch: Partial<SlaConfig>) => setDraft((d) => ({ ...d, ...patch }));
  const setBh = (patch: Partial<SlaConfig["businessHours"]>) =>
    setDraft((d) => ({ ...d, businessHours: { ...d.businessHours, ...patch } }));
  const setHol = (patch: Partial<SlaConfig["holidays"]>) =>
    setDraft((d) => ({ ...d, holidays: { ...d.holidays, ...patch } }));
  const setFr = (key: keyof SlaConfig["firstResponseMinutes"], v: number) =>
    setDraft((d) => ({ ...d, firstResponseMinutes: { ...d.firstResponseMinutes, [key]: v } }));

  return (
    <form action={action} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <fieldset disabled={readOnly || pending} className="grid gap-6">
        {readOnly ? (
          <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Só administradores alteram o SLA. Estas são as regras em vigor.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Prazo de primeira resposta</CardTitle>
            <CardDescription>Tempo útil para o time fazer o primeiro contato, conforme a temperatura do lead.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <MinutesField
              id="frHigh"
              label={<><FlameIcon className="size-4 text-danger" /> Quente</>}
              value={draft.firstResponseMinutes.high}
              onChange={(v) => setFr("high", v)}
            />
            <MinutesField
              id="frMedium"
              label={<><ThermometerIcon className="size-4 text-warning" /> Morno</>}
              value={draft.firstResponseMinutes.medium}
              onChange={(v) => setFr("medium", v)}
            />
            <MinutesField
              id="frLow"
              label={<><SnowflakeIcon className="size-4 text-info" /> Frio</>}
              value={draft.firstResponseMinutes.low}
              onChange={(v) => setFr("low", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acompanhamento</CardTitle>
            <CardDescription>Depois do primeiro contato, o SLA cuida das respostas e dos leads esquecidos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <MinutesField
              id="replyMinutes"
              label="Responder mensagem nova"
              value={draft.replyMinutes}
              onChange={(v) => set({ replyMinutes: v })}
            />
            <NumberField
              id="followUpHours"
              label="Follow-up (horas úteis sem contato)"
              suffix="h"
              value={draft.followUpHours}
              onChange={(v) => set({ followUpHours: v })}
            />
            <NumberField
              id="atRiskPercent"
              label="Alerta de risco a partir de"
              suffix="%"
              value={draft.atRiskPercent}
              onChange={(v) => set({ atRiskPercent: v })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horário comercial</CardTitle>
            <CardDescription>Fora do expediente o relógio do SLA para. Ninguém é cobrado às 3h da manhã.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <label className="flex items-center gap-3 text-sm font-medium">
              <Switch
                name="bhEnabled"
                value="on"
                checked={draft.businessHours.enabled}
                onCheckedChange={(enabled) => setBh({ enabled })}
              />
              Contar só horário comercial
            </label>
            <div className={cn("grid gap-5", !draft.businessHours.enabled && "pointer-events-none opacity-50")}>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias úteis">
                {DAYS.map((label, day) => {
                  const on = draft.businessHours.days.includes(day);
                  return (
                    <label
                      key={day}
                      className={cn(
                        "grid h-9 w-12 cursor-pointer place-items-center rounded-lg border text-sm font-medium transition-colors select-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="days"
                        value={day}
                        checked={on}
                        className="sr-only"
                        onChange={() =>
                          setBh({
                            days: on
                              ? draft.businessHours.days.filter((d) => d !== day)
                              : [...draft.businessHours.days, day].sort(),
                          })
                        }
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="start">Início</Label>
                  <Input
                    id="start"
                    name="start"
                    type="time"
                    value={draft.businessHours.start}
                    onChange={(e) => setBh({ start: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Fim</Label>
                  <Input
                    id="end"
                    name="end"
                    type="time"
                    value={draft.businessHours.end}
                    onChange={(e) => setBh({ end: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Fuso horário</Label>
                  <NativeSelect
                    id="timezone"
                    name="timezone"
                    value={draft.timezone}
                    onChange={(e) => set({ timezone: e.target.value })}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace("America/", "").replace("_", " ")}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <HolidaysCard holidays={draft.holidays} onChange={setHol} timezone={draft.timezone} />

        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 text-sm">
              <Switch
                name="whatsappAlerts"
                value="on"
                checked={draft.whatsappAlerts}
                onCheckedChange={(whatsappAlerts) => set({ whatsappAlerts })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Avisar o vendedor no WhatsApp quando o SLA estourar</span>
                <span className="block text-muted-foreground">
                  Usa o número cadastrado em Usuários. O aviso no sino do sistema é sempre enviado.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        {state.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {!readOnly ? (
          <div>
            <Button type="submit" size="lg">
              Salvar regras de SLA
            </Button>
          </div>
        ) : null}
      </fieldset>

      <Simulator config={draft} />
    </form>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type="number"
          min={1}
          required
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="pr-12 tabular"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function HolidaysCard({
  holidays,
  onChange,
  timezone,
}: {
  holidays: SlaConfig["holidays"];
  onChange: (patch: Partial<SlaConfig["holidays"]>) => void;
  timezone: string;
}) {
  const [text, setText] = useState(holidays.custom.join("\n"));
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date()));
  const next = upcomingHolidays(today, holidays, 4);
  const fmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feriados</CardTitle>
        <CardDescription>Em feriado o relógio para, como no fim de semana.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid content-start gap-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch
              name="holidaysNational"
              value="on"
              checked={holidays.national}
              onCheckedChange={(national) => onChange({ national })}
            />
            Feriados nacionais (inclui Sexta-feira Santa)
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch
              name="holidaysOptional"
              value="on"
              checked={holidays.optional}
              onCheckedChange={(optional) => onChange({ optional })}
            />
            Carnaval e Corpus Christi
          </label>
          <div className="grid gap-2">
            <Label htmlFor="holidaysCustom">Feriados da empresa ou da cidade</Label>
            <Textarea
              id="holidaysCustom"
              name="holidaysCustom"
              rows={4}
              value={text}
              placeholder={"01-25 Aniversário de São Paulo\n2026-12-24 Véspera de Natal"}
              onChange={(e) => {
                setText(e.target.value);
                onChange({ custom: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) });
              }}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Um por linha. <code>MM-DD</code> repete todo ano; <code>AAAA-MM-DD</code> vale só naquele ano.
            </p>
          </div>
        </div>
        <div className="grid content-start gap-2">
          <p className="text-sm font-medium">Próximos</p>
          {next.length ? (
            <ul className="grid gap-1.5 text-sm">
              {next.map((h) => (
                <li key={h.date} className="flex items-baseline justify-between gap-3 rounded-md bg-muted/50 px-2.5 py-1.5">
                  <span className="truncate">{h.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular">{fmt.format(new Date(`${h.date}T12:00:00Z`))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum feriado ativo.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const MinutesField = (props: Omit<Parameters<typeof NumberField>[0], "suffix">) => <NumberField {...props} suffix="min" />;

/** Mostra, ao vivo, quando venceria o prazo de um lead que chegasse agora. */
function Simulator({ config }: { config: SlaConfig }) {
  const [now] = useState(() => new Date());
  const valid =
    config.businessHours.days.length > 0 &&
    config.businessHours.start < config.businessHours.end &&
    Object.values(config.firstResponseMinutes).every((v) => Number.isFinite(v) && v > 0);

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: config.timezone,
  });
  const rows = [
    { label: "Quente", minutes: config.firstResponseMinutes.high },
    { label: "Morno", minutes: config.firstResponseMinutes.medium },
    { label: "Frio", minutes: config.firstResponseMinutes.low },
  ];

  return (
    <Card className="xl:sticky xl:top-20">
      <CardHeader>
        <CardTitle>Simulador</CardTitle>
        <CardDescription>Se um lead chegasse agora ({fmt.format(now)}), o prazo de 1ª resposta venceria em:</CardDescription>
      </CardHeader>
      <CardContent>
        {valid ? (
          <ul className="grid gap-2 text-sm">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                <span>
                  {r.label} <span className="text-muted-foreground">· {formatDuration(r.minutes)} úteis</span>
                </span>
                <span className="font-medium tabular">{fmt.format(addBusinessMinutes(now, r.minutes, config))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Complete os campos para simular.</p>
        )}
      </CardContent>
    </Card>
  );
}
