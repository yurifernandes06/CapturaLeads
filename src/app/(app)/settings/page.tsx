import { redirect } from "next/navigation";
import { SETTINGS_TABS } from "./tabs";

export default function SettingsIndex() {
  redirect(SETTINGS_TABS[0]!.href);
}
