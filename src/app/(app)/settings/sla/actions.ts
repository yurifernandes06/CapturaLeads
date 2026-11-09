"use server";

import { revalidatePath } from "next/cache";
import { errorMessage, type ActionResult } from "@/lib/action-result";
import { slaConfigSchema } from "@/lib/sla/config";
import { assertUser } from "@/server/auth/dal";
import { setSetting } from "@/server/settings";
import { sweepSla } from "@/server/sla/service";

const int = (v: FormDataEntryValue | null) => Number.parseInt(String(v ?? ""), 10);

export async function saveSlaConfig(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await assertUser("admin");
    const config = slaConfigSchema.parse({
      timezone: String(formData.get("timezone") ?? ""),
      businessHours: {
        enabled: formData.get("bhEnabled") === "on",
        days: formData.getAll("days").map((d) => int(d)),
        start: String(formData.get("start") ?? ""),
        end: String(formData.get("end") ?? ""),
      },
      holidays: {
        national: formData.get("holidaysNational") === "on",
        optional: formData.get("holidaysOptional") === "on",
        custom: String(formData.get("holidaysCustom") ?? "")
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
      },
      firstResponseMinutes: {
        high: int(formData.get("frHigh")),
        medium: int(formData.get("frMedium")),
        low: int(formData.get("frLow")),
      },
      replyMinutes: int(formData.get("replyMinutes")),
      followUpHours: int(formData.get("followUpHours")),
      atRiskPercent: int(formData.get("atRiskPercent")),
      whatsappAlerts: formData.get("whatsappAlerts") === "on",
    });
    await setSetting("sla", config);
    // Prazos mudaram: recalcula todos os leads abertos na hora.
    await sweepSla();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
