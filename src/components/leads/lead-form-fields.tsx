import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PRIORITIES, PRIORITY_META, SOURCES, SOURCE_LABEL } from "@/lib/leads";

export type LeadFormDefaults = {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  priority?: string;
  source?: string;
  value?: string;
  tags?: string;
};

/** Campos compartilhados entre criação e edição de lead. */
export function LeadFormFields({ defaults = {} }: { defaults?: LeadFormDefaults }) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="lead-name">Nome</Label>
        <Input id="lead-name" name="name" defaultValue={defaults.name} autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-phone">WhatsApp / telefone</Label>
          <Input id="lead-phone" name="phone" inputMode="tel" placeholder="(11) 98765-4321" defaultValue={defaults.phone} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-email">E-mail</Label>
          <Input id="lead-email" name="email" type="email" defaultValue={defaults.email} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-company">Empresa</Label>
          <Input id="lead-company" name="company" defaultValue={defaults.company} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-value">Valor estimado (R$)</Label>
          <Input id="lead-value" name="value" inputMode="decimal" placeholder="0,00" defaultValue={defaults.value} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-priority">Prioridade</Label>
          <NativeSelect id="lead-priority" name="priority" defaultValue={defaults.priority ?? "medium"}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-source">Origem</Label>
          <NativeSelect id="lead-source" name="source" defaultValue={defaults.source ?? "manual"}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lead-tags">Tags</Label>
        <Input id="lead-tags" name="tags" placeholder="ex.: plano-anual, evento-sp" defaultValue={defaults.tags} />
        <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
      </div>
    </>
  );
}
