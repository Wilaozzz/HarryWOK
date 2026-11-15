// ========================================
// supabase/functions/_shared/audit.ts
// Registro de auditoría seudonimizada (RNF-10, P-7)
// ========================================

export interface AuditParams {
  supabase: any;
  actorId: string;
  event: string;
  entity: string;
  entityId: string;
  details?: Record<string, any>;
}

export const logAuditEvent = async ({
  supabase,
  actorId,
  event,
  entity,
  entityId,
  details = {},
}: AuditParams): Promise<void> => {
  try {
    // Generar seudonimización simple SHA-256 para actorId y entityId
    const encodeSha256 = async (str: string) => {
      const buffer = new TextEncoder().encode(str);
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const actorRef = await encodeSha256(actorId || 'anon');
    const entityRef = entity === 'user' ? await encodeSha256(entityId) : entityId;

    await supabase.from('audit_log').insert({
      actor_ref: actorRef,
      actor_ref_version: 1,
      event,
      entity,
      entity_id: entityRef,
      details,
      occurred_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
};

export const a = {
  log: logAuditEvent,
};
