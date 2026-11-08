import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader title="Configurações" description="Ajuste o sistema ao processo do seu time." />
      <Suspense fallback={<div className="mb-6 h-[37px] border-b" />}>
        <SettingsTabs />
      </Suspense>
      {children}
    </>
  );
}
