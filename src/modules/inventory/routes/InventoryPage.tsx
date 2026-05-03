import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus } from 'lucide-react';
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
import type { StockBalanceRow, StockLocationRow, StockMovementListRow } from '../services/inventoryApi';
import {
  fetchNewStandardSnapshot,
  type NewStandardSnapshot,
} from '@modules/dashboard/services/dashboardApi';
import {
  applyStockMovement,
  countOpenStockBelowMinAlerts,
  insertStockLocation,
  listProductsForStock,
  listStockBalances,
  listStockLocations,
  listStockMovements,
  listStockTypes,
  updateStockLocation,
} from '../services/inventoryApi';

const locationSchema = z.object({
  code: z.string().min(1, 'Código obrigatório'),
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type LocationForm = z.infer<typeof locationSchema>;

const adjustSchema = z.object({
  product_id: z.string().min(1, 'Selecione um produto').uuid('Produto inválido'),
  stock_type_id: z.string().min(1, 'Selecione o tipo').uuid('Tipo inválido'),
  stock_location_id: z.string().min(1, 'Selecione a localização').uuid('Local inválido'),
  delta: z.coerce.number(),
  justification: z.string().min(3, 'Justificativa obrigatória'),
});

type AdjustForm = z.infer<typeof adjustSchema>;

export function InventoryPage() {
  const qc = useQueryClient();
  const [locOpen, setLocOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<StockLocationRow | null>(null);

  const pctQuery = useQuery<NewStandardSnapshot>({
    queryKey: ['dashboard', 'snapshot'],
    queryFn: fetchNewStandardSnapshot,
  });
  const alertsQuery = useQuery({
    queryKey: ['inventory', 'alerts_below_min'],
    queryFn: countOpenStockBelowMinAlerts,
  });
  const typesQuery = useQuery({ queryKey: ['inventory', 'stock_types'], queryFn: listStockTypes });
  const locQuery = useQuery({ queryKey: ['inventory', 'stock_locations'], queryFn: listStockLocations });
  const balQuery = useQuery({ queryKey: ['inventory', 'stock_balances'], queryFn: listStockBalances });
  const productsQuery = useQuery({ queryKey: ['inventory', 'products_options'], queryFn: listProductsForStock });
  const movementsQuery = useQuery({ queryKey: ['inventory', 'stock_movements'], queryFn: () => listStockMovements(40) });

  const locForm = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { code: '', name: '', description: '', is_active: true },
  });

  const adjustForm = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      product_id: '',
      stock_type_id: '',
      stock_location_id: '',
      delta: 0,
      justification: '',
    },
  });

  const openCreateLocation = () => {
    setEditingLoc(null);
    locForm.reset({ code: '', name: '', description: '', is_active: true });
    setLocOpen(true);
  };

  const openEditLocation = (row: StockLocationRow) => {
    setEditingLoc(row);
    locForm.reset({
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      is_active: row.is_active,
    });
    setLocOpen(true);
  };

  const saveLocMutation = useMutation({
    mutationFn: async (v: LocationForm) => {
      if (editingLoc) {
        return updateStockLocation(editingLoc.id, {
          code: v.code.trim(),
          name: v.name.trim(),
          description: v.description?.trim() || null,
          is_active: v.is_active,
        });
      }
      return insertStockLocation({
        code: v.code.trim(),
        name: v.name.trim(),
        description: v.description?.trim() || null,
        is_active: v.is_active,
      });
    },
    onSuccess: () => {
      toast.success(editingLoc ? 'Localização atualizada.' : 'Localização criada.');
      setLocOpen(false);
      void qc.invalidateQueries({ queryKey: ['inventory', 'stock_locations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustMutation = useMutation({
    mutationFn: (v: AdjustForm) =>
      applyStockMovement({
        productId: v.product_id,
        stockTypeId: v.stock_type_id,
        stockLocationId: v.stock_location_id,
        delta: v.delta,
        justification: v.justification.trim(),
        kind: 'adjustment',
      }),
    onSuccess: (newQty) => {
      toast.success(`Saldo atualizado. Novo saldo: ${newQty}.`);
      adjustForm.reset({
        product_id: '',
        stock_type_id: '',
        stock_location_id: '',
        delta: 0,
        justification: '',
      });
      void qc.invalidateQueries({ queryKey: ['inventory', 'stock_balances'] });
      void qc.invalidateQueries({ queryKey: ['inventory', 'stock_movements'] });
      void qc.invalidateQueries({ queryKey: ['inventory', 'alerts_below_min'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstTypeId = typesQuery.data?.[0]?.id ?? '';
  const firstLocId = locQuery.data?.find((l) => l.is_active)?.id ?? locQuery.data?.[0]?.id ?? '';

  const locColumns: ColumnDef<StockLocationRow>[] = [
    { accessorKey: 'code', header: 'Código' },
    { accessorKey: 'name', header: 'Nome' },
    {
      id: 'active',
      header: 'Ativo',
      cell: ({ row }) =>
        row.original.is_active ? <Badge variant="success">Sim</Badge> : <Badge variant="secondary">Não</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEditLocation(row.original)}>
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      ),
    },
  ];

  const movColumns: ColumnDef<StockMovementListRow>[] = [
    {
      id: 'when',
      header: 'Data',
      cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      id: 'product',
      header: 'Produto',
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[200px] text-muted-foreground">
          {row.original.products?.internal_code} — {row.original.products?.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'kind',
      header: 'Tipo',
      cell: ({ row }) => <span className="text-xs">{row.original.movement_kind}</span>,
    },
    {
      id: 'delta',
      header: 'Δ',
      cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.delta_qty}</span>,
    },
    {
      id: 'after',
      header: 'Saldo após',
      cell: ({ row }) => <span className="tabular-nums">{row.original.balance_after}</span>,
    },
    {
      id: 'why',
      header: 'Justificativa',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-[220px] text-xs text-muted-foreground">{row.original.justification}</span>
      ),
    },
    {
      id: 'who',
      header: 'Utilizador',
      cell: ({ row }) => <span className="text-xs">{row.original.creator?.full_name ?? '—'}</span>,
    },
  ];

  const balColumns: ColumnDef<StockBalanceRow>[] = [
    {
      id: 'product',
      header: 'Produto',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.products?.internal_code} — {row.original.products?.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: ({ row }) => <span>{row.original.stock_types?.code ?? '—'}</span>,
    },
    {
      id: 'loc',
      header: 'Local',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.stock_locations?.code ?? '—'}</span>,
    },
    {
      id: 'qty',
      header: 'Saldo',
      cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.quantity}</span>,
    },
    {
      id: 'min',
      header: 'Mín. cadastro',
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.products?.min_stock != null ? row.original.products.min_stock : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque gerencial</h1>
        <p className="text-sm text-muted-foreground">
          Localizações físicas, saldos por tipo de stock e movimentações com rastreio e justificativa obrigatória.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% operação no padrão novo</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {pctQuery.isLoading ? '…' : `${pctQuery.data?.pct ?? 0}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Produtos ativos com <span className="font-medium text-foreground">is_new_standard</span> ativo, alinhado ao
            Painel da Casa.
          </CardContent>
        </Card>
        <Card className={alertsQuery.data && alertsQuery.data > 0 ? 'border-amber-500/40 bg-amber-500/5' : undefined}>
          <CardHeader className="pb-2">
            <CardDescription>Alertas — estoque abaixo do mínimo (tipo VENDA)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {alertsQuery.isLoading ? '…' : alertsQuery.data ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Gerados automaticamente quando a soma do saldo gerencial <strong>VENDA</strong> fica abaixo de{' '}
            <code className="text-foreground">min_stock</code> do produto. Resolvidos quando o saldo volta ao nível
            adequado.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Localizações</CardTitle>
            <CardDescription>Códigos únicos (ex.: corredor, endereço fino).</CardDescription>
          </div>
          <Button type="button" size="sm" className="gap-1" onClick={openCreateLocation}>
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={locColumns} data={locQuery.data ?? []} isLoading={locQuery.isLoading} emptyMessage="Nenhuma localização." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saldos gerenciais</CardTitle>
          <CardDescription>Combinação produto × tipo de estoque × localização.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={balColumns} data={balQuery.data ?? []} isLoading={balQuery.isLoading} emptyMessage="Nenhum saldo registrado." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajuste de saldo</CardTitle>
          <CardDescription>
            Regista movimento com justificativa (RPC <code className="text-foreground">stock_apply_movement</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-xl gap-4"
            onSubmit={adjustForm.handleSubmit((v) => adjustMutation.mutate(v))}
          >
            <FormField id="adj-product" label="Produto" error={adjustForm.formState.errors.product_id?.message}>
              <select
                id="adj-product"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...adjustForm.register('product_id')}
              >
                <option value="">Selecione…</option>
                {(productsQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.internal_code} — {p.description}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="adj-type" label="Tipo de estoque" error={adjustForm.formState.errors.stock_type_id?.message}>
              <select
                id="adj-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...adjustForm.register('stock_type_id')}
              >
                <option value="">Selecione…</option>
                {(typesQuery.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="adj-loc" label="Localização" error={adjustForm.formState.errors.stock_location_id?.message}>
              <select
                id="adj-loc"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...adjustForm.register('stock_location_id')}
              >
                <option value="">Selecione…</option>
                {(locQuery.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="adj-delta" label="Variação (+ entrada / − saída)" error={adjustForm.formState.errors.delta?.message}>
              <Input id="adj-delta" type="number" step="any" {...adjustForm.register('delta')} />
            </FormField>
            <FormField id="adj-just" label="Justificativa" error={adjustForm.formState.errors.justification?.message}>
              <Textarea id="adj-just" rows={3} {...adjustForm.register('justification')} placeholder="Motivo do ajuste (auditoria)." />
            </FormField>
            <div className="flex gap-2">
              <Button type="submit" disabled={adjustMutation.isPending}>
                {adjustMutation.isPending ? 'A gravar…' : 'Aplicar ajuste'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  adjustForm.reset({
                    product_id: '',
                    stock_type_id: firstTypeId,
                    stock_location_id: firstLocId,
                    delta: 0,
                    justification: '',
                  })
                }
              >
                Pré-preencher tipo/local
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimentos</CardTitle>
          <CardDescription>Histórico de ajustes (justificativa e saldo após movimento).</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={movColumns}
            data={movementsQuery.data ?? []}
            isLoading={movementsQuery.isLoading}
            emptyMessage="Ainda não há movimentos registados."
          />
        </CardContent>
      </Card>

      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingLoc ? 'Editar localização' : 'Nova localização'}</DialogTitle>
            <DialogDescription>Código único visível em relatórios e no armazém.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={locForm.handleSubmit((v) => saveLocMutation.mutate(v))}
          >
            <FormField id="loc-code" label="Código" error={locForm.formState.errors.code?.message}>
              <Input id="loc-code" {...locForm.register('code')} disabled={Boolean(editingLoc)} />
            </FormField>
            <FormField id="loc-name" label="Nome" error={locForm.formState.errors.name?.message}>
              <Input id="loc-name" {...locForm.register('name')} />
            </FormField>
            <FormField id="loc-desc" label="Descrição" error={locForm.formState.errors.description?.message}>
              <Textarea id="loc-desc" rows={2} {...locForm.register('description')} />
            </FormField>
            <label className="flex items-center gap-2 text-sm" htmlFor="loc-active">
              <Controller
                control={locForm.control}
                name="is_active"
                render={({ field }) => (
                  <input
                    id="loc-active"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
              Ativa
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLocOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveLocMutation.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
