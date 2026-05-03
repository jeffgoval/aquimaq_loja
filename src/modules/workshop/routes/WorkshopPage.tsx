import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Camera, Package, Wrench } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@ds/primitives';
import { DataTable } from '@shared/components/tables/DataTable';
import { FormField } from '@shared/components/forms/FormField';
import { listProductsForStock, listStockLocations } from '@modules/inventory/services/inventoryApi';
import { listProfilesForResponsible } from '@modules/products/services/productsApi';
import { supabase } from '@app/config/supabase';
import type { WorkOrderListRow } from '../services/workshopApi';
import {
  WORKSHOP_PHOTOS_BUCKET,
  createSignedPhotoUrl,
  deleteWorkOrderPhoto,
  getWorkOrder,
  insertWorkOrder,
  insertWorkOrderItem,
  insertWorkOrderPhoto,
  insertWorkOrderWarranty,
  listWorkOrderStatusHistory,
  listWorkOrders,
  updateWorkOrder,
  workshopConsumePartStock,
  workshopSyncStalledOsAlerts,
} from '../services/workshopApi';

const STATUSES = [
  'aberta',
  'em_diagnostico',
  'aguardando_orcamento',
  'aguardando_aprovacao',
  'aguardando_peca',
  'em_execucao',
  'finalizada',
  'entregue',
  'garantia',
  'cancelada',
] as const;

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    aberta: 'Aberta',
    em_diagnostico: 'Em diagnóstico',
    aguardando_orcamento: 'Aguardando orçamento',
    aguardando_aprovacao: 'Aguardando aprovação',
    aguardando_peca: 'Aguardando peça',
    em_execucao: 'Em execução',
    finalizada: 'Finalizada',
    entregue: 'Entregue',
    garantia: 'Garantia',
    cancelada: 'Cancelada',
  };
  return m[s] ?? s;
}

function statusVariant(s: string): 'default' | 'secondary' | 'warning' | 'danger' | 'success' {
  if (s === 'finalizada' || s === 'entregue') return 'success';
  if (s === 'cancelada') return 'secondary';
  if (s === 'aguardando_peca' || s === 'aguardando_aprovacao') return 'warning';
  return 'default';
}

const woSchema = z.object({
  equipment_label: z.string().min(2, 'Equipamento obrigatório'),
  responsible_user_id: z.string().uuid(),
  customer_name: z.string().optional(),
  defect_description: z.string().optional(),
  priority: z.enum(['critica', 'alta', 'media', 'baixa']),
});

type WoForm = z.infer<typeof woSchema>;

const partSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  stock_location_id: z.string().uuid(),
  notes: z.string().optional(),
});

type PartForm = z.infer<typeof partSchema>;

const warrantySchema = z
  .object({
    warranty_end_date: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) =>
      Boolean((d.warranty_end_date ?? '').trim()) || Boolean((d.notes ?? '').trim().length >= 3),
    { message: 'Data de fim ou observações (mín. 3 caracteres)', path: ['notes'] },
  );

type WarrantyForm = z.infer<typeof warrantySchema>;

export function WorkshopPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [partOpen, setPartOpen] = useState(false);
  const [warrantyOpen, setWarrantyOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const listQuery = useQuery({ queryKey: ['workshop', 'list'], queryFn: () => listWorkOrders() });
  const detailQuery = useQuery({
    queryKey: ['workshop', 'detail', selectedId],
    queryFn: () => (selectedId ? getWorkOrder(selectedId) : Promise.resolve(null)),
    enabled: Boolean(selectedId),
  });
  const historyQuery = useQuery({
    queryKey: ['workshop', 'history', selectedId],
    queryFn: () => (selectedId ? listWorkOrderStatusHistory(selectedId) : Promise.resolve([])),
    enabled: Boolean(selectedId),
  });

  const profilesQuery = useQuery({ queryKey: ['workshop', 'profiles'], queryFn: listProfilesForResponsible });
  const productsQuery = useQuery({ queryKey: ['workshop', 'products'], queryFn: listProductsForStock });
  const locationsQuery = useQuery({ queryKey: ['workshop', 'locations'], queryFn: listStockLocations });

  const wo = detailQuery.data;

  const photoListKey = useMemo(
    () => (wo?.work_order_photos ?? []).map((p) => p.id).join(','),
    [wo?.work_order_photos],
  );

  useEffect(() => {
    const photos = wo?.work_order_photos ?? [];
    if (photos.length === 0) {
      setPhotoUrls({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const p of photos) {
        try {
          next[p.id] = await createSignedPhotoUrl(p.storage_path);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setPhotoUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [wo?.id, photoListKey]);

  const woForm = useForm<WoForm>({
    resolver: zodResolver(woSchema),
    defaultValues: {
      equipment_label: '',
      responsible_user_id: '',
      customer_name: '',
      defect_description: '',
      priority: 'media',
    },
  });

  const partForm = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: { product_id: '', quantity: 1, stock_location_id: '', notes: '' },
  });

  const warrantyForm = useForm<WarrantyForm>({
    resolver: zodResolver(warrantySchema),
    defaultValues: { warranty_end_date: '', notes: '' },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['workshop'] });

  const createMutation = useMutation({
    mutationFn: insertWorkOrder,
    onSuccess: (row) => {
      toast.success(`OS ${row.internal_code} criada.`);
      setCreateOpen(false);
      woForm.reset();
      setSelectedId(row.id);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateWorkOrder>[1] }) =>
      updateWorkOrder(id, patch),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addPartMutation = useMutation({
    mutationFn: insertWorkOrderItem,
    onSuccess: () => {
      toast.success('Peça vinculada à OS.');
      setPartOpen(false);
      partForm.reset();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const warrantyMutation = useMutation({
    mutationFn: insertWorkOrderWarranty,
    onSuccess: () => {
      toast.success('Garantia registada.');
      setWarrantyOpen(false);
      warrantyForm.reset();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => workshopSyncStalledOsAlerts(5),
    onSuccess: (n) => {
      toast.success(n > 0 ? `${n} alerta(s) de OS parada criado(s) ou atualizado(s).` : 'Nenhum alerta novo.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const consumeMutation = useMutation({
    mutationFn: ({ id, j }: { id: string; j: string }) => workshopConsumePartStock(id, j),
    onSuccess: () => {
      toast.success('Peça baixada do stock OFICINA.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ woId, file, caption }: { woId: string; file: File; caption: string | null }) => {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${woId}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(WORKSHOP_PHOTOS_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      await insertWorkOrderPhoto({
        work_order_id: woId,
        storage_path: path,
        caption: caption?.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success('Foto enviada.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) => deleteWorkOrderPhoto(id, path),
    onSuccess: () => {
      toast.success('Foto removida.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: ColumnDef<WorkOrderListRow>[] = useMemo(
    () => [
      { header: 'Código', accessorKey: 'internal_code' },
      {
        header: 'Equipamento',
        accessorKey: 'equipment_label',
        cell: ({ row }) => <span className="line-clamp-2 max-w-[200px]">{row.original.equipment_label}</span>,
      },
      {
        header: 'Estado',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{statusLabel(row.original.status)}</Badge>
        ),
      },
      { header: 'Prioridade', accessorKey: 'priority' },
      { header: 'Resp.', accessorFn: (r) => r.responsible?.full_name ?? '—' },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Oficina</h1>
          <p className="text-sm text-muted-foreground">
            OS gerencial, peças (stock OFICINA), workflow, alertas de parada e garantia com fotos no Storage (PRD §15).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Verificar OS paradas
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ordens de serviço</CardTitle>
            <CardDescription>Selecione para editar, peças e fotos.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={listQuery.data ?? []}
              isLoading={listQuery.isLoading}
              getRowId={(r) => r.id}
              onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
              rowClassName={(row) => (row.id === selectedId ? 'bg-muted/60' : undefined)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhe da OS</CardTitle>
            <CardDescription>
              {wo ? `${wo.internal_code} · ${statusLabel(wo.status)}` : 'Selecione uma OS.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!wo ? (
              <p className="text-sm text-muted-foreground">Nada selecionado.</p>
            ) : (
              <>
                <div className="grid gap-2 text-sm">
                  <label className="text-xs text-muted-foreground">
                    Estado
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={wo.status}
                      onChange={(e) => patchMutation.mutate({ id: wo.id, patch: { status: e.target.value } })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Equipamento
                    <Input
                      className="mt-1"
                      defaultValue={wo.equipment_label}
                      key={`eq-${wo.id}-${wo.equipment_label}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== wo.equipment_label) patchMutation.mutate({ id: wo.id, patch: { equipment_label: v } });
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Cliente / referência
                    <Input
                      className="mt-1"
                      defaultValue={wo.customer_name ?? ''}
                      key={`cu-${wo.id}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (wo.customer_name ?? '')) patchMutation.mutate({ id: wo.id, patch: { customer_name: v } });
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Defeito
                    <Textarea
                      className="mt-1"
                      rows={2}
                      defaultValue={wo.defect_description ?? ''}
                      key={`df-${wo.id}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (wo.defect_description ?? ''))
                          patchMutation.mutate({ id: wo.id, patch: { defect_description: v } });
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Diagnóstico
                    <Textarea
                      className="mt-1"
                      rows={2}
                      defaultValue={wo.diagnosis ?? ''}
                      key={`dg-${wo.id}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim() || null;
                        if (v !== (wo.diagnosis ?? '')) patchMutation.mutate({ id: wo.id, patch: { diagnosis: v } });
                      }}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Técnico
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={wo.technician_id ?? ''}
                      onChange={(e) =>
                        patchMutation.mutate({
                          id: wo.id,
                          patch: { technician_id: e.target.value ? e.target.value : null },
                        })
                      }
                    >
                      <option value="">—</option>
                      {(profilesQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="border-t border-border pt-3">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    Peças (consomem stock OFICINA)
                  </h3>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setPartOpen(true)}>
                      Adicionar peça
                    </Button>
                  </div>
                  <ul className="flex flex-col gap-2 text-sm">
                    {(wo.work_order_items ?? []).map((it) => (
                      <li
                        key={it.id}
                        className="flex flex-col gap-1 rounded border border-border bg-surface-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          {it.product?.internal_code} — {it.product?.description}
                          <span className="block text-xs text-muted-foreground">
                            Qtd {Number(it.quantity)} · OFICINA na localização escolhida
                            {it.stock_consumed ? (
                              <Badge className="ml-2" variant="success">
                                Consumido
                              </Badge>
                            ) : null}
                          </span>
                        </span>
                        {!it.stock_consumed ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={consumeMutation.isPending}
                            onClick={() => {
                              const j = window.prompt('Justificativa para baixa no stock OFICINA (obrigatório):');
                              if (j && j.trim()) consumeMutation.mutate({ id: it.id, j: j.trim() });
                            }}
                          >
                            Consumir stock
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border pt-3">
                  <h3 className="mb-2 text-sm font-semibold">Histórico de estados</h3>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {(historyQuery.data ?? []).map((h) => (
                      <li key={h.id}>
                        {new Date(h.changed_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{' '}
                        · {h.from_status ? statusLabel(h.from_status) : '—'} → {statusLabel(h.to_status)}
                        {h.changer?.full_name ? ` · ${h.changer.full_name}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Camera className="h-4 w-4" />
                      Fotos (bucket {WORKSHOP_PHOTOS_BUCKET})
                    </h3>
                    <label className="cursor-pointer text-xs text-primary">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          const cap = window.prompt('Legenda (opcional):') ?? '';
                          uploadMutation.mutate({ woId: wo.id, file: f, caption: cap || null });
                        }}
                      />
                      <span className="underline">Enviar foto</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(wo.work_order_photos ?? []).map((p) => (
                      <div key={p.id} className="relative w-28 shrink-0">
                        {photoUrls[p.id] ? (
                          <img src={photoUrls[p.id]} alt={p.caption ?? ''} className="h-24 w-full rounded object-cover" />
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded bg-muted text-[10px]">…</div>
                        )}
                        {p.caption ? <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{p.caption}</p> : null}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="mt-1 w-full text-[10px]"
                          onClick={() => {
                            if (confirm('Remover esta foto?')) deletePhotoMutation.mutate({ id: p.id, path: p.storage_path });
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <Button type="button" size="sm" variant="outline" onClick={() => setWarrantyOpen(true)}>
                    Registar garantia
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova OS gerencial</DialogTitle>
            <DialogDescription>Equipamento, responsável e prioridade.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={woForm.handleSubmit((v) =>
              createMutation.mutate({
                equipment_label: v.equipment_label.trim(),
                responsible_user_id: v.responsible_user_id,
                customer_name: v.customer_name?.trim() || null,
                defect_description: v.defect_description?.trim() || null,
                priority: v.priority,
                status: 'aberta',
              }),
            )}
          >
            <FormField id="ws-eq" label="Equipamento" error={woForm.formState.errors.equipment_label?.message}>
              <Input id="ws-eq" {...woForm.register('equipment_label')} />
            </FormField>
            <FormField id="ws-resp" label="Responsável" error={woForm.formState.errors.responsible_user_id?.message}>
              <Controller
                control={woForm.control}
                name="responsible_user_id"
                render={({ field }) => (
                  <select
                    id="ws-resp"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">—</option>
                    {(profilesQuery.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>
            <FormField id="ws-cust" label="Cliente / referência" error={woForm.formState.errors.customer_name?.message}>
              <Input id="ws-cust" {...woForm.register('customer_name')} />
            </FormField>
            <FormField id="ws-def" label="Defeito" error={woForm.formState.errors.defect_description?.message}>
              <Textarea id="ws-def" rows={2} {...woForm.register('defect_description')} />
            </FormField>
            <FormField id="ws-prio" label="Prioridade" error={woForm.formState.errors.priority?.message}>
              <Controller
                control={woForm.control}
                name="priority"
                render={({ field }) => (
                  <select
                    id="ws-prio"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {(['critica', 'alta', 'media', 'baixa'] as const).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={partOpen} onOpenChange={setPartOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar peça</DialogTitle>
            <DialogDescription>O consumo baixa o saldo tipo OFICINA na localização indicada.</DialogDescription>
          </DialogHeader>
          {wo ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={partForm.handleSubmit((v) =>
                addPartMutation.mutate({
                  work_order_id: wo.id,
                  product_id: v.product_id,
                  quantity: v.quantity,
                  stock_location_id: v.stock_location_id,
                  notes: v.notes?.trim() || null,
                }),
              )}
            >
              <FormField id="ws-part-p" label="Produto" error={partForm.formState.errors.product_id?.message}>
                <Controller
                  control={partForm.control}
                  name="product_id"
                  render={({ field }) => (
                    <select
                      id="ws-part-p"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">—</option>
                      {(productsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.internal_code} — {p.description}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </FormField>
              <FormField id="ws-part-q" label="Quantidade" error={partForm.formState.errors.quantity?.message}>
                <Input id="ws-part-q" type="number" step="any" {...partForm.register('quantity')} />
              </FormField>
              <FormField id="ws-part-loc" label="Localização (stock OFICINA)" error={partForm.formState.errors.stock_location_id?.message}>
                <Controller
                  control={partForm.control}
                  name="stock_location_id"
                  render={({ field }) => (
                    <select
                      id="ws-part-loc"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">—</option>
                      {(locationsQuery.data ?? []).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} — {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </FormField>
              <FormField id="ws-part-n" label="Notas" error={partForm.formState.errors.notes?.message}>
                <Input id="ws-part-n" {...partForm.register('notes')} />
              </FormField>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPartOpen(false)}>
                  Fechar
                </Button>
                <Button type="submit" disabled={addPartMutation.isPending}>
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={warrantyOpen} onOpenChange={setWarrantyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Garantia</DialogTitle>
            <DialogDescription>Prazo e/ou observação (PRD: garantia com prazo ou observação).</DialogDescription>
          </DialogHeader>
          {wo ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={warrantyForm.handleSubmit((v) =>
                warrantyMutation.mutate({
                  work_order_id: wo.id,
                  warranty_end_date: v.warranty_end_date?.trim() || null,
                  notes: v.notes?.trim() ?? '',
                }),
              )}
            >
              <FormField id="ws-war-d" label="Fim da garantia (data)" error={warrantyForm.formState.errors.warranty_end_date?.message}>
                <Input id="ws-war-d" type="date" {...warrantyForm.register('warranty_end_date')} />
              </FormField>
              <FormField id="ws-war-n" label="Observações" error={warrantyForm.formState.errors.notes?.message}>
                <Textarea id="ws-war-n" rows={3} {...warrantyForm.register('notes')} />
              </FormField>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWarrantyOpen(false)}>
                  Fechar
                </Button>
                <Button type="submit" disabled={warrantyMutation.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
