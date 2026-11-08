import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listNotifications(userId: string, limit = 15) {
  const [items, [unread]] = await Promise.all([
    db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit),
    db
      .select({ n: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt))),
  ]);
  return { items, unread: unread?.n ?? 0 };
}

export async function markAllRead(userId: string) {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
}
