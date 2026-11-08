"use server";

import { revalidatePath } from "next/cache";
import { assertUser } from "@/server/auth/dal";
import { markAllRead } from "@/server/notifications";

export async function markAllNotificationsRead() {
  const user = await assertUser();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}
