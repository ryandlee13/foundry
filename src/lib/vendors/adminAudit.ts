export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetTable: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Append-only browser-local audit log for admin moderation actions. Mirrors docs/DATABASE.md's admin_audit_logs (system-written, append-only, admin-readable only). */
const AUDIT_LOG_KEY = "foundry.admin.auditLog";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getAll(): AdminAuditLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? (JSON.parse(raw) as AdminAuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: AdminAuditLogEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entries));
}

export function getAuditLog(): AdminAuditLogEntry[] {
  return [...getAll()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function logAdminAction(input: {
  adminId: string;
  action: string;
  targetTable: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): AdminAuditLogEntry {
  const entry: AdminAuditLogEntry = {
    id: crypto.randomUUID(),
    adminId: input.adminId,
    action: input.action,
    targetTable: input.targetTable,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  saveAll([...getAll(), entry]);
  return entry;
}
