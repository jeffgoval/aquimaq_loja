import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, PackageOpen, Truck } from 'lucide-react';
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
import { listProfilesForResponsible, listSuppliers } from '@modules/products/services/productsApi';
import type { ReceiptItemDetail, ReceiptItemUpdate, ReceiptListRow } from '../services/receivingApi';
import {
  getReceipt,
  insertReceipt,
  insertReceiptItem,
  listApprovedSuggestionsForLink,
  listReceipts,
  receiptReleaseForSale,
  updateReceipt,
  updateReceiptItem,
} from '../services/receivingApi';

const receiptSchema = z.object({
  supplier_id: z.string().uuid(),
  purchase_suggestion_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.string().uuid().optional(),
  ),
  invoice_ref: z.string().optional(),
  arrived_at: z.string().min(1, 'Data obrigatória'),
  responsible_user_id: z.string().uuid(),
  notes: z.string().optional(),
});

type ReceiptForm = z.infer<typeof receiptSchema>;

const itemAddSchema = z.object({
  product_id: z.string().uuid(),
  expected_qty: z.coerce.number().min(0).optional(),
  received_qty: z.coerce.number().min(0),
  unit_cost_expected: z.coerce.number().min(0).optional(),
  unit_cost_received: z.coerce.number().min(0),
});

type ItemAddForm = z.infer<typeof itemAddSchema>;

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    aguardando_conferencia: 'Aguardando conferência',
    em_conferencia: 'Em conferência',
    com_divergencia: 'Com divergência',
    aguardando_localizacao: 'Aguardando localização',
    liberado_venda: 'Liberado p/ venda',
    cancelado: 'Cancelado',
  };
  return m[s] ?? s;
}

function statusVariant(s: string): 'default' | 'secondary' | 'warning' | 'danger' | 'success' {
  if (s === 'liberado_venda') return 'success';
  if (s === 'com_divergencia') return 'danger';
  if (s === 'cancelado') return 'secondary';
  if (s === 'aguardando_conferencia') return 'warning';
  return 'default';
}

const CHK_LABELS: { key: keyof ReceiptItemUpdate; label: string }[] = [
  { key: 'chk_product', label: 'Produto conferido' },
  { key: 'chk_qty', label: 'Quantidade conferida' },
  { key: 'chk_unit', label: 'Unidade conferida' },
  { key: 'chk_cost', label: 'Custo conferido' },
  { key: 'chk_batch_expiry', label: 'Validade/lote conferido' },
  { key: 'chk_damage', label: 'Avaria verificada' },
  { key: 'chk_divergence', label: 'Divergência registada' },
  { key: 'chk_location', label: 'Localização definida' },
];

export function ReceivingPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const listQuery = useQuery({ queryKey: ['receiving', 'list'], queryFn: () => listReceipts() });
  const detailQuery = useQuery({
    queryKey: ['receiving', 'receipt', selectedId],
    queryFn: () => (selectedId ? getReceipt(selectedId) : Promise.resolve(null)),
    enabled: Boolean(selectedId),
  });

  const suppliersQuery = useQuery({ queryKey: ['receiving', 'suppliers'], queryFn: listSuppliers });
  const profilesQuery = useQuery({ queryKey: ['receiving', 'profiles'], queryFn: listProfilesForResponsible });
  const suggestionsQuery = useQuery({
    queryKey: ['receiving', 'approved_suggestions'],
    queryFn: listApprovedSuggestionsForLink,
  });
  const productsQuery = useQuery({ queryKey: ['receiving', 'products'], queryFn: listProductsForStock });
  const locationsQuery = useQuery({ queryKey: ['receiving', 'locations'], queryFn: listStockLocations });

  const receiptForm = useForm<ReceiptForm>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      supplier_id: '',
      purchase_suggestion_id: '',
      invoice_ref: '',
      arrived_at: new Date().toISOString().slice(0, 16),
      responsible_user_id: '',
      notes: '',
    },
  });

  const addItemForm = useForm<ItemAddForm>({
    resolver: zodResolver(itemAddSchema),
    defaultValues: {
      product_id: '',
      expected_qty: undefined,
      received_qty: 0,
      unit_cost_expected: undefined,
      unit_cost_received: 0,
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['receiving'] });

  const createMutation = useMutation({
    mutationFn: insertReceipt,
    onSuccess: (row) => {
      toast.success('Recebimento criado.');
      setCreateOpen(false);
      receiptForm.reset({
        supplier_id: '',
        purchase_suggestion_id: '',
        invoice_ref: '',
        arrived_at: new Date().toISOString().slice(0, 16),
        responsible_user_id: '',
        notes: '',
      });
      setSelectedId(row.id);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchReceiptMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateReceipt>[1] }) => updateReceipt(id, patch),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const patchItemMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ReceiptItemUpdate }) => updateReceiptItem(id, patch),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const addItemMutation = useMutation({
    mutationFn: insertReceiptItem,
    onSuccess: () => {
      toast.success('Item adicionado.');
      setAddItemOpen(false);
      addItemForm.reset();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const releaseMutation = useMutation({
    mutationFn: receiptReleaseForSale,
    onSuccess: () => {
      toast.success('Stock VENDA atualizado; recebimento liberado para venda gerencial.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: ColumnDef<ReceiptListRow>[] = useMemo(
    () => [
      { header: 'Fornecedor', accessorFn: (r) => r.supplier?.name ?? '—' },
      {
        header: 'NF ref.',
        accessorFn: (r) => r.invoice_ref?.trim() || '—',
      },
      {
        header: 'Chegada',
        accessorKey: 'arrived_at',
        cell: ({ row }) =>
          new Date(row.original.arrived_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
      {
        header: 'Estado',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{statusLabel(row.original.status)}</Badge>
        ),
      },
      {
        header: 'Resp.',
        accessorFn: (r) => r.responsible?.full_name ?? '—',
      },
    ],
    [],
  );

  const r = detailQuery.data;

  const openAddItem = () => {
    addItemForm.reset({
      product_id: '',
      expected_qty: undefined,
      received_qty: 0,
      unit_cost_expected: undefined,
      unit_cost_received: 0,
    });
    setAddItemOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recebimento</h1>
          <p className="text-sm text-muted-foreground">
            Checklist de conferência, tratamento de divergências e custos divergentes com geração de tarefas; após liberação,
            o saldo reflecte-se no tipo de stock de venda.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Truck className="mr-2 h-4 w-4" />
          Novo recebimento
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5" />
              Recebimentos
            </CardTitle>
            <CardDescription>Selecione um registo para conferir.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={listQuery.data ?? []}
              isLoading={listQuery.isLoading}
              getRowId={(row) => row.id}
              onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
              rowClassName={(row) => (row.id === selectedId ? 'bg-muted/60' : undefined)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Conferência
            </CardTitle>
            <CardDescription>
              {r ? `NF ${r.invoice_ref?.trim() || '—'} · ${statusLabel(r.status)}` : 'Selecione um recebimento.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!r ? (
              <p className="text-sm text-muted-foreground">Nada selecionado.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.chk_supplier}
                      onChange={(e) =>
                        patchReceiptMutation.mutate({ id: r.id, patch: { chk_supplier: e.target.checked } })
                      }
                    />
                    Fornecedor conferido
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.chk_invoice}
                      onChange={(e) =>
                        patchReceiptMutation.mutate({ id: r.id, patch: { chk_invoice: e.target.checked } })
                      }
                    />
                    NF conferida
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Estado do processo</span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={r.status}
                    disabled={r.status === 'liberado_venda' || r.status === 'cancelado'}
                    onChange={(e) => patchReceiptMutation.mutate({ id: r.id, patch: { status: e.target.value } })}
                  >
                    {[
                      'aguardando_conferencia',
                      'em_conferencia',
                      'com_divergencia',
                      'aguardando_localizacao',
                      'liberado_venda',
                      'cancelado',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                {r.notes != null ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Notas:</span> {r.notes}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={openAddItem}
                    disabled={r.status === 'liberado_venda' || r.status === 'cancelado'}
                  >
                    Adicionar item
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      releaseMutation.isPending || r.status === 'liberado_venda' || r.status === 'cancelado'
                    }
                    onClick={() => {
                      if (
                        confirm(
                          'Confirmar liberação? O saldo gerencial VENDA será aumentado nas localizações indicadas.',
                        )
                      ) {
                        releaseMutation.mutate(r.id);
                      }
                    }}
                  >
                    Liberar para venda gerencial
                  </Button>
                </div>

                <div className="flex flex-col gap-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold">Itens e checklist de linha</h3>
                  {(r.receipt_items ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem itens. Adicione produtos recebidos.</p>
                  ) : (
                    (r.receipt_items ?? []).map((it) => (
                      <ReceiptItemCard
                        key={it.id}
                        item={it}
                        locations={locationsQuery.data ?? []}
                        onPatch={(patch) => patchItemMutation.mutate({ id: it.id, patch })}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo recebimento</DialogTitle>
            <DialogDescription>Fornecedor, referência de NF, data de chegada e responsável.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={receiptForm.handleSubmit((v) =>
              createMutation.mutate({
                supplier_id: v.supplier_id,
                purchase_suggestion_id: v.purchase_suggestion_id ?? null,
                invoice_ref: v.invoice_ref?.trim() || null,
                arrived_at: new Date(v.arrived_at).toISOString(),
                responsible_user_id: v.responsible_user_id,
                status: 'aguardando_conferencia',
                notes: v.notes?.trim() || null,
                chk_supplier: false,
                chk_invoice: false,
              }),
            )}
          >
            <FormField id="recv-supplier" label="Fornecedor" error={receiptForm.formState.errors.supplier_id?.message}>
              <Controller
                control={receiptForm.control}
                name="supplier_id"
                render={({ field }) => (
                  <select
                    id="recv-supplier"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">—</option>
                    {(suppliersQuery.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>
            <FormField
              id="recv-suggestion"
              label="Compra gerencial (opcional)"
              error={receiptForm.formState.errors.purchase_suggestion_id?.message}
            >
              <Controller
                control={receiptForm.control}
                name="purchase_suggestion_id"
                render={({ field }) => (
                  <select
                    id="recv-suggestion"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <option value="">—</option>
                    {(suggestionsQuery.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>
            <FormField id="recv-nf" label="Referência NF" error={receiptForm.formState.errors.invoice_ref?.message}>
              <Input id="recv-nf" {...receiptForm.register('invoice_ref')} />
            </FormField>
            <FormField id="recv-arrived" label="Data de chegada" error={receiptForm.formState.errors.arrived_at?.message}>
              <Input id="recv-arrived" type="datetime-local" {...receiptForm.register('arrived_at')} />
            </FormField>
            <FormField
              id="recv-resp"
              label="Responsável"
              error={receiptForm.formState.errors.responsible_user_id?.message}
            >
              <Controller
                control={receiptForm.control}
                name="responsible_user_id"
                render={({ field }) => (
                  <select
                    id="recv-resp"
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
            <FormField id="recv-notes" label="Notas" error={receiptForm.formState.errors.notes?.message}>
              <Textarea id="recv-notes" rows={2} {...receiptForm.register('notes')} />
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

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar item</DialogTitle>
            <DialogDescription>Quantidades e custos conforme nota / pedido.</DialogDescription>
          </DialogHeader>
          {r ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={addItemForm.handleSubmit((v) =>
                addItemMutation.mutate({
                  receipt_id: r.id,
                  product_id: v.product_id,
                  expected_qty: v.expected_qty ?? null,
                  received_qty: v.received_qty,
                  unit_cost_expected: v.unit_cost_expected ?? null,
                  unit_cost_received: v.unit_cost_received,
                }),
              )}
            >
              <FormField id="recv-item-product" label="Produto" error={addItemForm.formState.errors.product_id?.message}>
                <Controller
                  control={addItemForm.control}
                  name="product_id"
                  render={({ field }) => (
                    <select
                      id="recv-item-product"
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
              <FormField
                id="recv-item-exp"
                label="Qtd esperada (opcional)"
                error={addItemForm.formState.errors.expected_qty?.message}
              >
                <Input id="recv-item-exp" type="number" step="any" {...addItemForm.register('expected_qty')} />
              </FormField>
              <FormField id="recv-item-rec" label="Qtd recebida" error={addItemForm.formState.errors.received_qty?.message}>
                <Input id="recv-item-rec" type="number" step="any" {...addItemForm.register('received_qty')} />
              </FormField>
              <FormField
                id="recv-item-cexp"
                label="Custo esperado (opcional)"
                error={addItemForm.formState.errors.unit_cost_expected?.message}
              >
                <Input id="recv-item-cexp" type="number" step="0.01" {...addItemForm.register('unit_cost_expected')} />
              </FormField>
              <FormField
                id="recv-item-crec"
                label="Custo recebido (unit.)"
                error={addItemForm.formState.errors.unit_cost_received?.message}
              >
                <Input id="recv-item-crec" type="number" step="0.01" {...addItemForm.register('unit_cost_received')} />
              </FormField>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>
                  Fechar
                </Button>
                <Button type="submit" disabled={addItemMutation.isPending}>
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptItemCard({
  item,
  locations,
  onPatch,
}: {
  item: ReceiptItemDetail;
  locations: { id: string; code: string; name: string }[];
  onPatch: (patch: ReceiptItemUpdate) => void;
}) {
  const p = item.product;
  return (
    <div className="rounded-md border border-border bg-surface p-3 text-sm">
      <div className="mb-2 font-medium">
        {p?.internal_code} — <span className="text-muted-foreground">{p?.description}</span>
      </div>
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Qtd recebida
          <Input
            className="mt-1"
            type="number"
            step="any"
            defaultValue={item.received_qty}
            key={`rq-${item.id}-${item.received_qty}`}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v !== item.received_qty) onPatch({ received_qty: v });
            }}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Custo unit. recebido
          <Input
            className="mt-1"
            type="number"
            step="0.01"
            defaultValue={item.unit_cost_received}
            key={`uc-${item.id}-${item.unit_cost_received}`}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v !== item.unit_cost_received) onPatch({ unit_cost_received: v });
            }}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Lote
          <Input
            className="mt-1"
            defaultValue={item.batch_code ?? ''}
            key={`bc-${item.id}-${item.batch_code ?? ''}`}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== (item.batch_code ?? '')) onPatch({ batch_code: v });
            }}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Validade
          <Input
            className="mt-1"
            type="date"
            defaultValue={item.expiry_date ?? ''}
            key={`ex-${item.id}-${item.expiry_date ?? ''}`}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== (item.expiry_date ?? '')) onPatch({ expiry_date: v });
            }}
          />
        </label>
      </div>
      <label className="mb-2 block text-xs text-muted-foreground">
        Avaria / observações
        <Textarea
          className="mt-1"
          rows={2}
          defaultValue={item.damage_notes ?? ''}
          key={`dm-${item.id}`}
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (item.damage_notes ?? '')) onPatch({ damage_notes: v });
          }}
        />
      </label>
      <label className="mb-2 block text-xs text-muted-foreground">
        Divergência (gera tarefa)
        <Textarea
          className="mt-1"
          rows={2}
          defaultValue={item.divergence_notes ?? ''}
          key={`dv-${item.id}`}
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (item.divergence_notes ?? '')) onPatch({ divergence_notes: v });
          }}
        />
      </label>
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={item.divergence_resolved}
          onChange={(e) => onPatch({ divergence_resolved: e.target.checked })}
        />
        Divergência resolvida (permite liberação)
      </label>
      <label className="mb-2 block text-xs text-muted-foreground">
        Localização stock (VENDA)
        <select
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={item.stock_location_id ?? ''}
          onChange={(e) => onPatch({ stock_location_id: e.target.value || null })}
        >
          <option value="">—</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.code} — {loc.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 border-t border-border pt-2 sm:grid-cols-2">
        {CHK_LABELS.map(({ key, label }) => {
          const row = item as Record<string, unknown>;
          return (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={Boolean(row[key as string])}
                onChange={(e) => onPatch({ [key]: e.target.checked } as ReceiptItemUpdate)}
              />
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
