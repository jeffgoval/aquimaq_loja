import { useQuery } from '@tanstack/react-query';
import { listAuditForEntity, type StructureTableName } from '../services/structureApi';
import { Badge } from '@ds/primitives';

interface AuditTimelineProps {
  entityType: StructureTableName;
  entityId: string | null;
  enabled: boolean;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function actionLabel(action: string): string {
  if (action === 'insert') return 'Criação';
  if (action === 'update') return 'Alteração';
  if (action === 'delete') return 'Exclusão';
  return action;
}

/**
 * Linha do tempo de auditoria (trigger no DB + leitura RLS admin/gestor).
 */
export function AuditTimeline({ entityType, entityId, enabled }: AuditTimelineProps) {
  const q = useQuery({
    queryKey: ['audit_logs', entityType, entityId],
    queryFn: () => listAuditForEntity(entityType, entityId!),
    enabled: enabled && Boolean(entityId),
  });

  if (!enabled || !entityId) return null;

  if (q.isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando auditoria…</p>;
  }

  if (q.isError) {
    return (
      <p className="text-xs text-muted-foreground">
        Auditoria indisponível (confirme migration Fase 1 e permissões).
      </p>
    );
  }

  const rows = q.data ?? [];
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum evento de auditoria ainda.</p>;
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auditoria</p>
      <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-border bg-surface-muted/40 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {actionLabel(row.action)}
              </Badge>
              <span className="text-muted-foreground">{formatWhen(row.created_at)}</span>
            </div>
            {row.changed_by ? (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">por {row.changed_by}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
