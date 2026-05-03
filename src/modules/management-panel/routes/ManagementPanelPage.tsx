import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { CloudOff, FileSpreadsheet, LineChart, PieChart, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  Badge,
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
import { listResultCenters } from '@modules/products/services/productsApi';
import {
  commitSalesImport,
  createImportBatch,
  fetchDreBasic,
  fetchMarginBreakdown,
  insertImportRows,
  listManagementMarginAlerts,
  syncMarginAlerts,
  type DreLineRow,
  type ImportRowInsert,
  type MarginAlertListRow,
  type MarginBreakdownRow,
} from '../services/managementPanelApi';

type ImportRowDraft = Omit<ImportRowInsert, 'batch_id'>;

type TabKey = 'import' | 'margins' | 'dre' | 'alerts' | 'api';

const CSV_FIELDS_DOC = [
  'sale_code',
  'sale_date (YYYY-MM-DD ou DD/MM/AAAA)',
  'product_code (erp_code ou internal_code)',
  'quantity',
  'unit_price',
  'Opcionais: seller_name, customer_code, channel, payment_type, is_cancelled, unit_cost, discount, line_total',
].join(' · ');

function monthStartIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseSaleDate(raw: string): string {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dd = m[1]!.padStart(2, '0');
    const mm = m[2]!.padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) throw new Error(`Data inválida: ${raw}`);
  return d.toISOString().slice(0, 10);
}

function parseBool(raw: string | undefined): boolean {
  if (!raw) return false;
  const x = raw.trim().toLowerCase();
  return x === '1' || x === 'true' || x === 'sim' || x === 's' || x === 'yes';
}

function parseNum(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export function ManagementPanelPage() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [tab, setTab] = useState<TabKey>('import');
  const [periodStart, setPeriodStart] = useState(monthStartIso);
  const [periodEnd, setPeriodEnd] = useState(todayIso);
  const [dimension, setDimension] = useState<'result_center' | 'product' | 'seller'>('result_center');
  const [dreCenterId, setDreCenterId] = useState<string>('');

  const centersQ = useQuery({ queryKey: ['result-centers'], queryFn: listResultCenters });

  const marginQ = useQuery({
    queryKey: ['management-margin', periodStart, periodEnd, dimension],
    queryFn: () => fetchMarginBreakdown(periodStart, periodEnd, dimension),
    enabled: tab === 'margins',
  });

  const dreQ = useQuery({
    queryKey: ['management-dre', periodStart, periodEnd, dreCenterId || null],
    queryFn: () => fetchDreBasic(periodStart, periodEnd, dreCenterId ? dreCenterId : null),
    enabled: tab === 'dre',
  });

  const alertsQ = useQuery({
    queryKey: ['management-margin-alerts'],
    queryFn: () => listManagementMarginAlerts(),
    enabled: tab === 'alerts',
  });

  const syncMut = useMutation({
    mutationFn: () => syncMarginAlerts(periodStart, periodEnd),
    onSuccess: (n) => {
      toast.success(`${n} alerta(s) gerados ou já existentes.`);
      void qc.invalidateQueries({ queryKey: ['management-margin-alerts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      if (parsed.errors.length) throw new Error(parsed.errors[0]?.message ?? 'CSV inválido');
      const rows = parsed.data ?? [];
      const required = ['sale_code', 'sale_date', 'product_code', 'quantity', 'unit_price'] as const;
      const drafts: ImportRowDraft[] = [];
      let rowNo = 0;
      for (const r of rows) {
        rowNo += 1;
        for (const k of required) {
          if (!r[k]?.trim()) throw new Error(`Linha ${rowNo}: falta "${k}".`);
        }
        const saleCode = r.sale_code!.trim();
        const saleDateRaw = r.sale_date!;
        const productCode = r.product_code!.trim();
        const qty = parseNum(r.quantity);
        const price = parseNum(r.unit_price);
        if (qty == null || qty <= 0) throw new Error(`Linha ${rowNo}: quantity inválido.`);
        if (price == null) throw new Error(`Linha ${rowNo}: unit_price inválido.`);
        drafts.push({
          row_no: rowNo,
          sale_code: saleCode,
          sale_date: parseSaleDate(saleDateRaw),
          seller_name: r.seller_name?.trim() || null,
          customer_code: r.customer_code?.trim() || null,
          channel: r.channel?.trim() || null,
          payment_type: r.payment_type?.trim() || null,
          is_cancelled: parseBool(r.is_cancelled),
          product_code: productCode,
          quantity: qty,
          unit_price: price,
          unit_cost: parseNum(r.unit_cost),
          discount: parseNum(r.discount),
          line_total: parseNum(r.line_total),
        });
      }
      const batch = await createImportBatch({
        sourceFilename: file.name,
        rowCount: drafts.length,
        createdBy: user.id,
      });
      const withBatch: ImportRowInsert[] = drafts.map((x) => ({ ...x, batch_id: batch.id }));
      await insertImportRows(withBatch);
      return commitSalesImport(batch.id);
    },
    onSuccess: () => {
      toast.success('Importação concluída e integrada ao ERP de vendas.');
      void qc.invalidateQueries({ queryKey: ['management-margin'] });
      void qc.invalidateQueries({ queryKey: ['management-dre'] });
      void qc.invalidateQueries({ queryKey: ['management-margin-alerts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const marginCols: ColumnDef<MarginBreakdownRow>[] = useMemo(
    () => [
      { accessorKey: 'dimension_label', header: 'Dimensão' },
      {
        accessorKey: 'revenue',
        header: 'Receita',
        cell: ({ row }) => fmtBRL(row.original.revenue),
      },
      {
        accessorKey: 'margin_value',
        header: 'Margem $',
        cell: ({ row }) => fmtBRL(row.original.margin_value),
      },
      { accessorKey: 'qty', header: 'Qtd' },
      { accessorKey: 'line_count', header: 'Linhas' },
    ],
    [],
  );

  const dreCols: ColumnDef<DreLineRow>[] = useMemo(
    () => [
      { accessorKey: 'label', header: 'Linha' },
      {
        accessorKey: 'amount',
        header: 'Valor',
        cell: ({ row }) => fmtBRL(row.original.amount),
      },
    ],
    [],
  );

  const alertCols: ColumnDef<MarginAlertListRow>[] = useMemo(
    () => [
      { accessorKey: 'title', header: 'Título' },
      { accessorKey: 'reason', header: 'Motivo' },
      {
        accessorKey: 'priority',
        header: 'Prioridade',
        cell: ({ row }) => <Badge variant="warning">{row.original.priority}</Badge>,
      },
      {
        accessorKey: 'created_at',
        header: 'Criado',
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString('pt-BR'),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Painel gerencial económico</h1>
        <p className="text-sm text-muted-foreground">
          Importação CSV de vendas, margens por centro/produto/vendedor, DRE simplificado e alertas de margem mínima.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { k: 'import' as const, label: 'Importar CSV', icon: FileSpreadsheet },
            { k: 'margins' as const, label: 'Margens', icon: PieChart },
            { k: 'dre' as const, label: 'DRE', icon: LineChart },
            { k: 'alerts' as const, label: 'Alertas margem', icon: ShieldAlert },
            { k: 'api' as const, label: 'API ERP', icon: CloudOff },
          ] as const
        ).map((x) => (
          <Button
            key={x.k}
            type="button"
            size="sm"
            variant={tab === x.k ? 'default' : 'outline'}
            className="gap-1"
            onClick={() => setTab(x.k)}
          >
            <x.icon className="h-4 w-4" />
            {x.label}
          </Button>
        ))}
      </div>

      {tab === 'import' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importar vendas (CSV)</CardTitle>
            <CardDescription>
              Cabeçalhos esperados: <span className="font-mono text-xs">{CSV_FIELDS_DOC}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="csv-sales">Ficheiro CSV</Label>
              <Input
                id="csv-sales"
                type="file"
                accept=".csv,text/csv"
                disabled={importMut.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importMut.mutate(f);
                  e.target.value = '';
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O commit grava em <code className="text-foreground">erp_sales</code> /{' '}
              <code className="text-foreground">erp_sale_items</code>, substitui linhas das vendas incluídas no
              ficheiro e gera alertas de margem para o intervalo de datas importado.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'margins' || tab === 'dre' || tab === 'alerts' ? (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Período</CardTitle>
              <CardDescription>Análises e alertas usam as datas abaixo.</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Até</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              {tab === 'alerts' ? (
                <Button type="button" variant="secondary" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Recalcular alertas
                </Button>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {tab === 'margins' ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Margem agregada</CardTitle>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={dimension}
              onChange={(e) => setDimension(e.target.value as typeof dimension)}
            >
              <option value="result_center">Por centro de resultado</option>
              <option value="product">Por produto</option>
              <option value="seller">Por vendedor</option>
            </select>
          </CardHeader>
          <CardContent>
            {marginQ.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : marginQ.isError ? (
              <p className="text-sm text-destructive">{marginQ.error instanceof Error ? marginQ.error.message : 'Erro'}</p>
            ) : (
              <DataTable columns={marginCols} data={marginQ.data ?? []} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 'dre' ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">DRE gerencial (básico)</CardTitle>
              <CardDescription>Receita de itens, CMV, margem bruta e descontos de cabeçalho.</CardDescription>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Centro (opcional)</Label>
              <select
                className="h-9 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
                value={dreCenterId}
                onChange={(e) => setDreCenterId(e.target.value)}
              >
                <option value="">Todos os centros</option>
                {(centersQ.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {dreQ.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : dreQ.isError ? (
              <p className="text-sm text-destructive">{dreQ.error instanceof Error ? dreQ.error.message : 'Erro'}</p>
            ) : (
              <DataTable columns={dreCols} data={dreQ.data ?? []} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 'alerts' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas de margem (painel)</CardTitle>
            <CardDescription>Gerados automaticamente após importação ou pelo botão &quot;Recalcular&quot;.</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsQ.isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : alertsQ.isError ? (
              <p className="text-sm text-destructive">
                {alertsQ.error instanceof Error ? alertsQ.error.message : 'Erro'}
              </p>
            ) : (
              <DataTable columns={alertCols} data={alertsQ.data ?? []} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 'api' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integração API do ERP</CardTitle>
            <CardDescription>Sincronização directa (REST/GraphQL) por credenciais — roadmap Fase 9+.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Por agora use o separador <strong>Importar CSV</strong> com export do ERP. Aqui ficará autenticação,
              mapeamento de campos e agendamento de pulls.
            </p>
            <Button type="button" variant="secondary" disabled>
              Ligar API (em breve)
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
