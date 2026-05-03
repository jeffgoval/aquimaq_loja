import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { ClipboardList, Download, RefreshCw, Shield, SlidersHorizontal, UserCog } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@ds/primitives';
import { DataTable } from '@shared/components/tables/DataTable';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { useCrmAccess } from '../hooks/useCrmAccess';
import { ROLES, type Role } from '@shared/types/database';
import {
  deleteUserPermissionOverride,
  listAuditLogs,
  listFeatureCatalog,
  listFeatureRoleMatrix,
  listPermissionCatalog,
  listProfilesBrief,
  listRolePermissionsMatrix,
  listUserPermissionOverrides,
  upsertFeatureRoleFlag,
  upsertRolePermission,
  upsertUserPermissionOverride,
  type AuditLogRow,
  type UserPermissionOverrideRow,
} from '../services/settingsAdminApi';

type TabKey = 'audit' | 'matrix' | 'flags' | 'overrides';

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const { canExportAuditCsv } = useCrmAccess();
  const [tab, setTab] = useState<TabKey>('audit');

  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedAudit, setAppliedAudit] = useState({ entityType: '', action: '', from: '', to: '' });

  const auditQ = useQuery({
    queryKey: ['settings-audit', appliedAudit],
    queryFn: () =>
      listAuditLogs({
        entityType: appliedAudit.entityType || undefined,
        action: appliedAudit.action || undefined,
        from: appliedAudit.from || undefined,
        to: appliedAudit.to || undefined,
        limit: 800,
      }),
    enabled: tab === 'audit',
  });

  const catalogQ = useQuery({
    queryKey: ['crm-permission-catalog'],
    queryFn: listPermissionCatalog,
    enabled: isAdmin && (tab === 'matrix' || tab === 'overrides'),
  });

  const matrixQ = useQuery({
    queryKey: ['crm-role-matrix'],
    queryFn: listRolePermissionsMatrix,
    enabled: isAdmin && tab === 'matrix',
  });

  const featCatQ = useQuery({
    queryKey: ['crm-feature-catalog'],
    queryFn: listFeatureCatalog,
    enabled: isAdmin && tab === 'flags',
  });

  const featMatrixQ = useQuery({
    queryKey: ['crm-feature-matrix'],
    queryFn: listFeatureRoleMatrix,
    enabled: isAdmin && tab === 'flags',
  });

  const overridesQ = useQuery({
    queryKey: ['crm-overrides-list'],
    queryFn: listUserPermissionOverrides,
    enabled: isAdmin && tab === 'overrides',
  });

  const profilesQ = useQuery({
    queryKey: ['crm-profiles-brief'],
    queryFn: listProfilesBrief,
    enabled: isAdmin && tab === 'overrides',
  });

  const permMut = useMutation({
    mutationFn: upsertRolePermission,
    onSuccess: () => {
      toast.success('Permissão actualizada.');
      void qc.invalidateQueries({ queryKey: ['crm-role-matrix'] });
      void qc.invalidateQueries({ queryKey: ['crm-role-permissions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flagMut = useMutation({
    mutationFn: upsertFeatureRoleFlag,
    onSuccess: () => {
      toast.success('Flag actualizada.');
      void qc.invalidateQueries({ queryKey: ['crm-feature-matrix'] });
      void qc.invalidateQueries({ queryKey: ['crm-feature-flags'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overrideMut = useMutation({
    mutationFn: upsertUserPermissionOverride,
    onSuccess: () => {
      toast.success('Excepção gravada.');
      void qc.invalidateQueries({ queryKey: ['crm-overrides-list'] });
      void qc.invalidateQueries({ queryKey: ['crm-user-overrides'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delOverrideMut = useMutation({
    mutationFn: deleteUserPermissionOverride,
    onSuccess: () => {
      toast.success('Excepção removida.');
      void qc.invalidateQueries({ queryKey: ['crm-overrides-list'] });
      void qc.invalidateQueries({ queryKey: ['crm-user-overrides'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const matrixGrid = useMemo(() => {
    const cat = catalogQ.data ?? [];
    const mat = matrixQ.data ?? [];
    return cat.map((c) => {
      const cells: Record<Role, boolean> = {} as Record<Role, boolean>;
      for (const r of ROLES) {
        const hit = mat.find((m) => m.permission_key === c.key && m.role === r);
        cells[r] = hit?.allowed ?? false;
      }
      return { key: c.key, label: c.label, cells };
    });
  }, [catalogQ.data, matrixQ.data]);

  const flagGrid = useMemo(() => {
    const cat = featCatQ.data ?? [];
    const mat = featMatrixQ.data ?? [];
    return cat.map((c) => {
      const cells: Record<Role, boolean> = {} as Record<Role, boolean>;
      for (const r of ROLES) {
        const hit = mat.find((m) => m.flag_key === c.flag_key && m.role === r);
        cells[r] = hit?.enabled ?? false;
      }
      return { key: c.flag_key, label: c.label, cells };
    });
  }, [featCatQ.data, featMatrixQ.data]);

  const auditCols: ColumnDef<AuditLogRow>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Quando',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString('pt-BR'),
      },
      { accessorKey: 'entity_type', header: 'Entidade' },
      { accessorKey: 'entity_id', header: 'ID' },
      { accessorKey: 'action', header: 'Acção' },
      { accessorKey: 'changed_by', header: 'Utilizador' },
    ],
    [],
  );

  const overrideCols: ColumnDef<UserPermissionOverrideRow>[] = useMemo(
    () => [
      {
        accessorKey: 'user_id',
        header: 'Utilizador',
        cell: ({ row }) => {
          const p = profilesQ.data?.find((x) => x.id === row.original.user_id);
          return p ? `${p.full_name} (${p.role})` : row.original.user_id.slice(0, 8);
        },
      },
      { accessorKey: 'permission_key', header: 'Permissão' },
      {
        accessorKey: 'allowed',
        header: 'Permitido',
        cell: ({ row }) => (row.original.allowed ? 'Sim' : 'Não'),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button type="button" variant="outline" size="sm" onClick={() => delOverrideMut.mutate(row.original.id)}>
            Remover
          </Button>
        ),
      },
    ],
    [profilesQ.data, delOverrideMut],
  );

  const [newUserId, setNewUserId] = useState('');
  const [newPermKey, setNewPermKey] = useState('');
  const [newAllowed, setNewAllowed] = useState(true);

  const exportAuditCsv = () => {
    const rows = auditQ.data ?? [];
    const flat = rows.map((r) => ({
      created_at: r.created_at,
      entity_type: r.entity_type,
      entity_id: r.entity_id ?? '',
      action: r.action,
      changed_by: r.changed_by ?? '',
      old_row: r.old_row != null ? JSON.stringify(r.old_row) : '',
      new_row: r.new_row != null ? JSON.stringify(r.new_row) : '',
    }));
    const csv = Papa.unparse(flat, { header: true });
    downloadTextFile(`auditoria_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success('Exportação concluída.');
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Auditoria com filtros e exportação; matriz de permissões e feature flags (administrador); excepções por utilizador
          (administrador).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'audit' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setTab('audit')}>
          <ClipboardList className="h-4 w-4" />
          Auditoria
        </Button>
        {isAdmin && (
          <>
            <Button variant={tab === 'matrix' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setTab('matrix')}>
              <Shield className="h-4 w-4" />
              Matriz de permissões
            </Button>
            <Button variant={tab === 'flags' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setTab('flags')}>
              <SlidersHorizontal className="h-4 w-4" />
              Feature flags
            </Button>
            <Button variant={tab === 'overrides' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setTab('overrides')}>
              <UserCog className="h-4 w-4" />
              Excepções por utilizador
            </Button>
          </>
        )}
      </div>

      {tab === 'audit' && (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Auditoria</CardTitle>
              <CardDescription>Registos de alterações (filtros aplicados no servidor, limite 800 linhas).</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setAppliedAudit({
                    entityType: entityType.trim(),
                    action: action.trim(),
                    from: from.trim(),
                    to: to.trim(),
                  });
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Aplicar filtros
              </Button>
              {canExportAuditCsv && (
                <Button variant="outline" size="sm" className="gap-2" onClick={exportAuditCsv} disabled={!auditQ.data?.length}>
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="aud-et">Tipo de entidade</Label>
                <Input id="aud-et" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="ex.: products" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aud-ac">Acção</Label>
                <Input id="aud-ac" value={action} onChange={(e) => setAction(e.target.value)} placeholder="ex.: UPDATE" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aud-from">Desde (data)</Label>
                <Input id="aud-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aud-to">Até (data)</Label>
                <Input id="aud-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            {!canExportAuditCsv && (
              <p className="text-xs text-muted-foreground">
                A exportação CSV depende da feature flag <code className="text-foreground">feat.export_audit_csv</code> para o seu
                role.
              </p>
            )}
            <DataTable columns={auditCols} data={auditQ.data ?? []} isLoading={auditQ.isLoading} emptyMessage="Nenhum registo." />
          </CardContent>
        </Card>
      )}

      {isAdmin && tab === 'matrix' && (
        <Card>
          <CardHeader>
            <CardTitle>Matriz de permissões</CardTitle>
            <CardDescription>
              Linhas: permissões de navegação. Colunas: perfis. Desmarcar remove o acesso imediato, independentemente do perfil
              predefinido.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-medium">Permissão</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-1 py-2 text-center font-medium">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixGrid.map((row) => (
                  <tr key={row.key} className="border-b border-border/80">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{row.label}</div>
                      <div className="text-[11px] text-muted-foreground">{row.key}</div>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={row.cells[r]}
                          disabled={permMut.isPending}
                          onChange={(e) =>
                            permMut.mutate({
                              role: r,
                              permission_key: row.key,
                              allowed: e.target.checked,
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(catalogQ.isLoading || matrixQ.isLoading) && <p className="mt-2 text-sm text-muted-foreground">A carregar…</p>}
          </CardContent>
        </Card>
      )}

      {isAdmin && tab === 'flags' && (
        <Card>
          <CardHeader>
            <CardTitle>Feature flags por role</CardTitle>
            <CardDescription>Controla funcionalidades opcionais (menu, exportações, módulos experimentais).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-medium">Flag</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-1 py-2 text-center font-medium">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flagGrid.map((row) => (
                  <tr key={row.key} className="border-b border-border/80">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{row.label}</div>
                      <div className="text-[11px] text-muted-foreground">{row.key}</div>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={row.cells[r]}
                          disabled={flagMut.isPending}
                          onChange={(e) =>
                            flagMut.mutate({
                              flag_key: row.key,
                              role: r,
                              enabled: e.target.checked,
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(featCatQ.isLoading || featMatrixQ.isLoading) && <p className="mt-2 text-sm text-muted-foreground">A carregar…</p>}
          </CardContent>
        </Card>
      )}

      {isAdmin && tab === 'overrides' && (
        <Card>
          <CardHeader>
            <CardTitle>Excepções por utilizador</CardTitle>
            <CardDescription>Substituem a matriz por utilizador (útil para casos pontuais).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <Label>Utilizador</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                >
                  <option value="">—</option>
                  {(profilesQ.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Chave de permissão</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newPermKey}
                  onChange={(e) => setNewPermKey(e.target.value)}
                >
                  <option value="">—</option>
                  {(catalogQ.data ?? []).map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newAllowed} onChange={(e) => setNewAllowed(e.target.checked)} />
                Permitido
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={!newUserId || !newPermKey || overrideMut.isPending}
                  onClick={() =>
                    overrideMut.mutate({
                      user_id: newUserId,
                      permission_key: newPermKey,
                      allowed: newAllowed,
                    })
                  }
                >
                  Gravar excepção
                </Button>
              </div>
            </div>
            <DataTable
              columns={overrideCols}
              data={overridesQ.data ?? []}
              isLoading={overridesQ.isLoading}
              emptyMessage="Nenhuma excepção."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
