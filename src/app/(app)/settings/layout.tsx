import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader
        eyebrow="Sistema" title="Configurações" description="Ajuste o sistema ao processo do seu time." />
      <Suspense fallback={<div className="mb-8 h-[42px] w-80 rounded-xl border bg-black/40" />}>
        <SettingsTabs />
      </Suspense>
      {children}
    </>
  );
}
