import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AUDIT_LABEL } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { listAuditLogs } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Auditoria" };

const LIMIT = 200;

export default async function AuditPage() {
  await requireAdmin();
  const logs = await listAuditLogs(LIMIT);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Ações sensíveis da equipe: exportações, trocas de responsável, exclusões e mudanças em usuários. Mostrando as{" "}
        {LIMIT} mais recentes.
      </p>
      <Card className="py-0">
        {logs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="pr-4">Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-4 whitespace-nowrap text-muted-foreground tabular">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{log.actorName}</TableCell>
                  <TableCell>
                    <Badge variant={log.action === "lead.delete" || log.action === "lead.export" ? "default" : "secondary"}>
                      {AUDIT_LABEL[log.action]}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">
                    {log.targetType === "lead" && log.action !== "lead.delete" && log.targetId ? (
                      <Link href={`/leads/${log.targetId}`} className="hover:text-foreground hover:underline">
                        {log.summary}
                      </Link>
                    ) : (
                      log.summary
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
