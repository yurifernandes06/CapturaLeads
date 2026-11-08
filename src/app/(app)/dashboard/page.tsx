import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return <PageHeader title={`Olá, ${user.name.split(" ")[0]}`} description="Seu painel de vendas." />;
}
