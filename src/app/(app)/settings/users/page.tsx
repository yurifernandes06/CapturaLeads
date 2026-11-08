import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { requireAdmin } from "@/server/auth/dal";
import { CreateUserDialog, UserRowActions } from "./user-forms";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await db.select().from(schema.users).orderBy(asc(schema.users.name));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? "usuário" : "usuários"}. Vendedores ativos entram na distribuição automática de
          leads.
        </p>
        <CreateUserDialog />
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
              <TableHead className="hidden md:table-cell">Desde</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="pl-4">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? "Admin" : "Vendedor"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {u.phone ? formatPhone(u.phone) : "—"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  {u.active ? (
                    <Badge variant="outline" className="border-success/30 text-success">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  {u.id === me.id ? null : (
                    <UserRowActions user={{ id: u.id, name: u.name, role: u.role, active: u.active }} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
