import { PageHeader } from "@/components/app/page-header";
import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader title="Configurações" description="Ajuste o sistema ao processo do seu time." />
      <SettingsTabs />
      {children}
    </>
  );
}
