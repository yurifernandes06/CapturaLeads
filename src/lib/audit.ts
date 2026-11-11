/** Ações sensíveis registradas no log de auditoria (somente leitura para admins). */
export const AUDIT_ACTIONS = [
  "lead.export",
  "lead.reassign",
  "lead.delete",
  "lead.anonymize",
  "user.create",
  "user.activate",
  "user.deactivate",
  "user.role",
  "user.password_reset",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_LABEL: Record<AuditAction, string> = {
  "lead.export": "Exportou leads",
  "lead.reassign": "Trocou responsável",
  "lead.delete": "Excluiu lead",
  "lead.anonymize": "Anonimizou lead",
  "user.create": "Criou usuário",
  "user.activate": "Reativou usuário",
  "user.deactivate": "Desativou usuário",
  "user.role": "Mudou papel",
  "user.password_reset": "Redefiniu senha",
};
