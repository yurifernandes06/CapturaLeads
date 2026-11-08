import type { Metadata } from "next";
import { requireUser } from "@/server/auth/dal";
import { getSetting } from "@/server/settings";
import { SlaForm } from "./sla-form";

export const metadata: Metadata = { title: "SLA" };

export default async function SlaSettingsPage() {
  const user = await requireUser();
  const config = await getSetting("sla");
  return <SlaForm config={config} readOnly={user.role !== "admin"} />;
}
