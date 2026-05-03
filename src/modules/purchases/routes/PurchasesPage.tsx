import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, GitCompareArrows, History, Plus, Sparkles } from 'lucide-react';
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
import { usePermission } from '@shared/components/auth/RoleGate';
import { listProductsForStock } from '@modules/inventory/services/inventoryApi';
import { listProfilesForResponsible, listSuppliers } from '@modules/products/services/productsApi';
import type {
  PurchaseQuoteListRow,
  PurchaseSuggestionListRow,
  QuotedCostHistoryRow,
} from '../services/purchasesApi';
import {
  countPurchaseSuggestionsByStatus,
  insertManualPurchaseSuggestion,
  insertPurchaseQuote,
  listPurchaseSuggestions,
  listQuotedCostHistory,
  listQuotesForSuggestion,
  purchaseSuggestionApprove,
  purchaseSuggestionRequestApproval,
  purchaseSyncSuggestionsFromMinStock,
  updatePurchaseQuote,
  updatePurchaseSuggestion,
} from '../services/purchasesApi';

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    sugerida: 'Sugerida',
    em_analise: 'Em análise',
    em_cotacao: 'Em cotação',
    aguardando_aprovacao: 'Aguardando aprovação',
    aprovada: 'Aprovada',
    cancelada: 'Cancelada',
    rascunho: 'Rascunho',
    enviada: 'Enviada',
    selecionada: 'Selecionada',
    descartada: 'Descartada',
  };
  return map[s] ?? s;
}

function statusBadgeVariant(s: string): 'default' | 'secondary' | 'warning' | 'danger' | 'success' {
  if (s === 'aprovada' || s === 'selecionada') return 'success';
  if (s === 'aguardando_aprovacao') return 'warning';
  if (s === 'cancelada' || s === 'descartada') return 'secondary';
  return 'default';
}

function priorityBadgeVariant(p: string): 'default' | 'secondary' | 'warning' | 'danger' {
  if (p === 'critica') return 'danger';
  if (p === 'alta') return 'warning';
  return 'secondary';
}

const manualSchema = z.object({
  product_id: z.string().uuid('Selecione um produto'),
  quantity_suggested: z.coerce.number().positive('Quantidade deve ser positiva'),
  responsible_user_id: z.string().uuid('Selecione o responsável'),
  notes: z.string().optional(),
});

const quoteSchema = z.object({
  supplier_id: z.string().uuid('Fornecedor obrigatório'),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0, 'Preço inválido'),
  lead_time_days: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(0).optional(),
  ),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});

type ManualForm = z.infer<typeof manualSchema>;
type QuoteForm = z.infer<typeof quoteSchema>;

export function PurchasesPage() {
  const qc = useQueryClient();
  const canApprove = usePermission(['admin', 'gestor']);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [approveQuoteId, setApproveQuoteId] = useState<string>('');

  const suggestionsQuery = useQuery({
    queryKey: ['purchases', 'suggestions'],
    queryFn: () => listPurchaseSuggestions(),
  });
  const awaitingQuery = useQuery({
    queryKey: ['purchases', 'count_awaiting'],
    queryFn: () => countPurchaseSuggestionsByStatus('aguardando_aprovacao'),
  });
  const historyQuery = useQuery({
    queryKey: ['purchases', 'quoted_cost_history'],
    queryFn: () => listQuotedCostHistory(80),
  });
  const quotesQuery = useQuery({
    queryKey: ['purchases', 'quotes', selectedId],
    queryFn: () => (selectedId ? listQuotesForSuggestion(selectedId) : Promise.resolve([])),
    enabled: Boolean(selectedId),
  });

  const productsQuery = useQuery({ queryKey: ['purchases', 'products_options'], queryFn: listProductsForStock });
  const suppliersQuery = useQuery({ queryKey: ['purchases', 'suppliers'], queryFn: listSuppliers });
  const profilesQuery = useQuery({ queryKey: ['purchases', 'profiles'], queryFn: listProfilesForResponsible });

  const selected = useMemo(
    () => suggestionsQuery.data?.find((r) => r.id === selectedId) ?? null,
    [suggestionsQuery.data, selectedId],
  );

  const manualForm = useForm<ManualForm>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      product_id: '',
      quantity_suggested: 1,
      responsible_user_id: '',
      notes: '',
    },
  });

  const quoteForm = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      supplier_id: '',
      quantity: 1,
      unit_price: 0,
      lead_time_days: undefined,
      payment_terms: '',
      notes: '',
    },
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['purchases'] });
  };

  const syncMutation = useMutation({
    mutationFn: purchaseSyncSuggestionsFromMinStock,
    onSuccess: (n) => {
      toast.success(n > 0 ? `${n} sugestão(ões) criada(s) a partir do mínimo.` : 'Nenhuma sugestão nova (já existem abertas ou saldos ok).');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manualMutation = useMutation({
    mutationFn: insertManualPurchaseSuggestion,
    onSuccess: () => {
      toast.success('Sugestão manual criada.');
      setManualOpen(false);
      manualForm.reset();
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quoteMutation = useMutation({
    mutationFn: insertPurchaseQuote,
    onSuccess: async (row) => {
      toast.success('Cotação registada.');
      setQuoteOpen(false);
      quoteForm.reset();
      const sug = suggestionsQuery.data?.find((s) => s.id === row.suggestion_id);
      if (sug && (sug.status === 'sugerida' || sug.status === 'em_analise')) {
        try {
          await updatePurchaseSuggestion(sug.id, { status: 'em_cotacao' });
        } catch {
          /* best-effort */
        }
      }
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestApprovalMutation = useMutation({
    mutationFn: purchaseSuggestionRequestApproval,
    onSuccess: () => {
      toast.success('Pedido de aprovação enviado.');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: ({ sid, qid }: { sid: string; qid: string }) => purchaseSuggestionApprove(sid, qid),
    onSuccess: () => {
      toast.success('Compra aprovada; custo cotado registado no histórico.');
      setApproveQuoteId('');
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markQuoteEnviada = useMutation({
    mutationFn: (id: string) => updatePurchaseQuote(id, { status: 'enviada' }),
    onSuccess: () => {
      toast.success('Cotação marcada como enviada.');
      void qc.invalidateQueries({ queryKey: ['purchases', 'quotes', selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelSuggestionMutation = useMutation({
    mutationFn: (id: string) => updatePurchaseSuggestion(id, { status: 'cancelada' }),
    onSuccess: () => {
      toast.success('Sugestão cancelada.');
      setSelectedId(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suggestionColumns: ColumnDef<PurchaseSuggestionListRow>[] = useMemo(
    () => [
      {
        accessorKey: 'product.internal_code',
        header: 'Código',
        cell: ({ row }) => row.original.product?.internal_code ?? '—',
      },
      {
        accessorKey: 'product.description',
        header: 'Produto',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[220px]">{row.original.product?.description ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'quantity_suggested',
        header: 'Qtd sugerida',
        cell: ({ row }) => Number(row.original.quantity_suggested).toLocaleString('pt-BR'),
      },
      {
        accessorKey: 'priority',
        header: 'Prioridade',
        cell: ({ row }) => (
          <Badge variant={priorityBadgeVariant(row.original.priority)}>{row.original.priority}</Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>{statusLabel(row.original.status)}</Badge>
        ),
      },
      {
        accessorKey: 'origin',
        header: 'Origem',
        cell: ({ row }) => (row.original.origin === 'below_min' ? 'Mínimo' : 'Manual'),
      },
      {
        accessorKey: 'created_at',
        header: 'Criada',
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      },
    ],
    [],
  );

  const quoteColumns: ColumnDef<PurchaseQuoteListRow>[] = useMemo(
    () => [
      {
        header: 'Fornecedor',
        accessorFn: (r) => r.supplier?.name ?? '—',
      },
      {
        header: 'Qtd',
        accessorKey: 'quantity',
        cell: ({ row }) => Number(row.original.quantity).toLocaleString('pt-BR'),
      },
      {
        header: 'Preço unit.',
        accessorKey: 'unit_price',
        cell: ({ row }) => fmtBRL(Number(row.original.unit_price)),
      },
      {
        header: 'Total',
        id: 'total',
        cell: ({ row }) => fmtBRL(Number(row.original.quantity) * Number(row.original.unit_price)),
      },
      {
        header: 'Prazo (d)',
        accessorKey: 'lead_time_days',
        cell: ({ row }) => row.original.lead_time_days ?? '—',
      },
      {
        header: 'Estado',
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant="secondary">{statusLabel(row.original.status)}</Badge>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'rascunho' ? (
            <Button type="button" variant="outline" size="sm" onClick={() => markQuoteEnviada.mutate(row.original.id)}>
              Marcar enviada
            </Button>
          ) : null,
      },
    ],
    [markQuoteEnviada],
  );

  const historyColumns: ColumnDef<QuotedCostHistoryRow>[] = useMemo(
    () => [
      {
        header: 'Data',
        accessorKey: 'recorded_at',
        cell: ({ row }) =>
          new Date(row.original.recorded_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
      {
        header: 'Produto',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.product?.internal_code} —{' '}
            <span className="text-muted-foreground">{row.original.product?.description}</span>
          </span>
        ),
      },
      {
        header: 'Fornecedor',
        accessorFn: (r) => r.supplier?.name ?? '—',
      },
      {
        header: 'Preço cotado',
        accessorKey: 'unit_price',
        cell: ({ row }) => fmtBRL(Number(row.original.unit_price)),
      },
      {
        header: 'Qtd',
        accessorKey: 'quantity',
        cell: ({ row }) => (row.original.quantity != null ? Number(row.original.quantity).toLocaleString('pt-BR') : '—'),
      },
      {
        header: 'Registado por',
        accessorFn: (r) => r.recorder?.full_name ?? '—',
      },
    ],
    [],
  );

  const minUnitPrice = useMemo(() => {
    const rows = quotesQuery.data ?? [];
    if (rows.length === 0) return null;
    return Math.min(...rows.map((q) => Number(q.unit_price)));
  }, [quotesQuery.data]);

  const openManual = () => {
    manualForm.reset({
      product_id: '',
      quantity_suggested: 1,
      responsible_user_id: '',
      notes: '',
    });
    setManualOpen(true);
  };

  const openQuote = () => {
    if (!selected) return;
    quoteForm.reset({
      supplier_id: '',
      quantity: Number(selected.quantity_suggested),
      unit_price: 0,
      lead_time_days: undefined,
      payment_terms: '',
      notes: '',
    });
    setQuoteOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Sugestões a partir do stock mínimo, cotações por fornecedor, fluxo de aprovação e histórico de custos cotados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Sugerir a partir do mínimo
          </Button>
          <Button type="button" onClick={openManual}>
            <Plus className="mr-2 h-4 w-4" />
            Nova sugestão manual
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aguardando aprovação</CardTitle>
            <CardDescription>Decisão de gestor sobre cotação vencedora</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{awaitingQuery.data ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparação</CardTitle>
            <CardDescription>Na sugestão selecionada, destaque do menor preço unitário</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitCompareArrows className="h-5 w-5 shrink-0" />
            {selectedId ? (
              minUnitPrice != null ? (
                <span>
                  Menor cotação: <strong className="text-foreground">{fmtBRL(minUnitPrice)}</strong>
                </span>
              ) : (
                <span>Sem cotações ainda.</span>
              )
            ) : (
              <span>Selecione uma sugestão na tabela.</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fluxo</CardTitle>
            <CardDescription>Sugerida → cotações → pedir aprovação → aprovada + histórico</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            A aprovação grava o custo cotado no histórico; não substitui pedido oficial no ERP.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle>Sugestões de compra</CardTitle>
            <CardDescription>Clique numa linha para ver cotações e ações.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={suggestionColumns}
              data={suggestionsQuery.data ?? []}
              isLoading={suggestionsQuery.isLoading}
              getRowId={(r) => r.id}
              onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
              rowClassName={(row) => (row.id === selectedId ? 'bg-muted/60' : '')}
            />
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Detalhe e cotações</CardTitle>
              <CardDescription>
                {selected
                  ? `${selected.product?.internal_code ?? ''} · ${statusLabel(selected.status)}`
                  : 'Selecione uma sugestão.'}
              </CardDescription>
            </div>
            {selected ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={openQuote} disabled={selected.status === 'aprovada' || selected.status === 'cancelada'}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Cotação
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={
                    requestApprovalMutation.isPending ||
                    selected.status === 'aguardando_aprovacao' ||
                    selected.status === 'aprovada' ||
                    selected.status === 'cancelada' ||
                    (quotesQuery.data?.length ?? 0) === 0
                  }
                  onClick={() => requestApprovalMutation.mutate(selected.id)}
                >
                  Pedir aprovação
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={selected.status === 'aprovada' || selected.status === 'cancelada'}
                  onClick={() => {
                    if (confirm('Cancelar esta sugestão?')) cancelSuggestionMutation.mutate(selected.id);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {selected ? (
              <>
                <div className="grid gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Qtd sugerida:</span>{' '}
                    <strong>{Number(selected.quantity_suggested).toLocaleString('pt-BR')}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Snapshot saldo VENDA:</span>{' '}
                    {Number(selected.gerencial_qty_snapshot).toLocaleString('pt-BR')}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Responsável:</span>{' '}
                    {selected.responsible?.full_name ?? '—'}
                  </p>
                  {selected.notes ? (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Notas:</span> {selected.notes}
                    </p>
                  ) : null}
                </div>
                <DataTable
                  columns={quoteColumns}
                  data={quotesQuery.data ?? []}
                  isLoading={quotesQuery.isLoading}
                  getRowId={(r) => r.id}
                  rowClassName={(row) =>
                    minUnitPrice != null && Number(row.unit_price) === minUnitPrice ? 'bg-emerald-500/10' : ''
                  }
                />
                {canApprove && selected.status === 'aguardando_aprovacao' ? (
                  <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <p className="text-sm font-medium">Aprovar compra gerencial</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                        <label className="text-xs text-muted-foreground" htmlFor="win-quote">
                          Cotação vencedora
                        </label>
                        <select
                          id="win-quote"
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={approveQuoteId}
                          onChange={(e) => setApproveQuoteId(e.target.value)}
                        >
                          <option value="">—</option>
                          {(quotesQuery.data ?? [])
                            .filter((q) => q.status === 'rascunho' || q.status === 'enviada')
                            .map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.supplier?.name} — {fmtBRL(Number(q.unit_price))}
                              </option>
                            ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        disabled={!approveQuoteId || approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ sid: selected.id, qid: approveQuoteId })}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sugestão selecionada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de custo cotado
          </CardTitle>
          <CardDescription>Registos criados na aprovação (referência gerencial).</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={historyColumns}
            data={historyQuery.data ?? []}
            isLoading={historyQuery.isLoading}
            getRowId={(r) => r.id}
          />
        </CardContent>
      </Card>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova sugestão manual</DialogTitle>
            <DialogDescription>Produto, quantidade e responsável pela compra gerencial.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={manualForm.handleSubmit((v) =>
              manualMutation.mutate({
                product_id: v.product_id,
                quantity_suggested: v.quantity_suggested,
                responsible_user_id: v.responsible_user_id,
                notes: v.notes?.trim() || null,
              }),
            )}
          >
            <FormField id="purch-manual-product" label="Produto" error={manualForm.formState.errors.product_id?.message}>
              <Controller
                control={manualForm.control}
                name="product_id"
                render={({ field }) => (
                  <select
                    id="purch-manual-product"
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
              id="purch-manual-qty"
              label="Quantidade sugerida"
              error={manualForm.formState.errors.quantity_suggested?.message}
            >
              <Input id="purch-manual-qty" type="number" step="any" {...manualForm.register('quantity_suggested')} />
            </FormField>
            <FormField
              id="purch-manual-resp"
              label="Responsável"
              error={manualForm.formState.errors.responsible_user_id?.message}
            >
              <Controller
                control={manualForm.control}
                name="responsible_user_id"
                render={({ field }) => (
                  <select
                    id="purch-manual-resp"
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
            <FormField id="purch-manual-notes" label="Notas" error={manualForm.formState.errors.notes?.message}>
              <Textarea id="purch-manual-notes" rows={2} {...manualForm.register('notes')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={manualMutation.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova cotação</DialogTitle>
            <DialogDescription>Um registo por fornecedor por sugestão.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={quoteForm.handleSubmit((v) =>
                quoteMutation.mutate({
                  suggestion_id: selected.id,
                  supplier_id: v.supplier_id,
                  quantity: v.quantity,
                  unit_price: v.unit_price,
                  lead_time_days: v.lead_time_days,
                  payment_terms: v.payment_terms?.trim() || null,
                  notes: v.notes?.trim() || null,
                  status: 'rascunho',
                }),
              )}
            >
              <FormField id="purch-quote-supplier" label="Fornecedor" error={quoteForm.formState.errors.supplier_id?.message}>
                <Controller
                  control={quoteForm.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <select
                      id="purch-quote-supplier"
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
              <FormField id="purch-quote-qty" label="Quantidade" error={quoteForm.formState.errors.quantity?.message}>
                <Input id="purch-quote-qty" type="number" step="any" {...quoteForm.register('quantity')} />
              </FormField>
              <FormField id="purch-quote-price" label="Preço unitário (R$)" error={quoteForm.formState.errors.unit_price?.message}>
                <Input id="purch-quote-price" type="number" step="0.01" {...quoteForm.register('unit_price')} />
              </FormField>
              <FormField
                id="purch-quote-lead"
                label="Prazo de entrega (dias)"
                error={quoteForm.formState.errors.lead_time_days?.message}
              >
                <Input id="purch-quote-lead" type="number" {...quoteForm.register('lead_time_days')} />
              </FormField>
              <FormField
                id="purch-quote-pay"
                label="Condições de pagamento"
                error={quoteForm.formState.errors.payment_terms?.message}
              >
                <Input id="purch-quote-pay" {...quoteForm.register('payment_terms')} />
              </FormField>
              <FormField id="purch-quote-notes" label="Notas" error={quoteForm.formState.errors.notes?.message}>
                <Textarea id="purch-quote-notes" rows={2} {...quoteForm.register('notes')} />
              </FormField>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setQuoteOpen(false)}>
                  Fechar
                </Button>
                <Button type="submit" disabled={quoteMutation.isPending}>
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
