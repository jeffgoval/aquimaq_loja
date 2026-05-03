import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Papa from 'papaparse';
import { toast } from 'sonner';
import {
  Banknote,
  FileSpreadsheet,
  Landmark,
  LineChart,
  RefreshCw,
  Scale,
  StickyNote,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
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
import type { Database } from '@shared/types/database';
import {
  createImportBatch,
  fetchApDelinquency,
  fetchArDelinquency,
  insertCashProjections,
  insertNotes,
  listCashProjections,
  listDre,
  listNotes,
  listPayables,
  listReceivables,
  listTaxes,
  upsertDre,
  upsertPayables,
  upsertReceivables,
  upsertTaxes,
  type CashProjectionRow,
  type DreRow,
  type NoteRow,
  type PayableRow,
  type ReceivableRow,
  type TaxRow,
} from '../services/financialPanelApi';

type ImportCategory = Database['public']['Tables']['financial_import_batches']['Row']['category'];
type TabKey = 'summary' | 'ar' | 'ap' | 'cash' | 'dre' | 'taxes' | 'notes' | 'import';

function parseIsoDate(raw: string): string {
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

/** Mês contábil: YYYY-MM ou YYYY-MM-DD → primeiro dia do mês (YYYY-MM-01). */
function parsePeriodMonth(raw: string): string {
  const t = raw.trim();
  const iso = /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : /^\d{4}-\d{2}$/.test(t) ? `${t}-01` : parseIsoDate(t);
  return `${iso.slice(0, 7)}-01`;
}

function parseNum(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function fmtDateOnly(iso: string): string {
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR');
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function DataMeta({ source, refD, cap }: { source: string; refD: string; cap: string }) {
  return (
    <div className="text-[11px] leading-snug text-muted-foreground border-l-2 border-border pl-2">
      <div>Fonte: {source}</div>
      <div>
        Ref.: {fmtDateOnly(refD)} · Registo no CRM: {fmtDateTime(cap)}
      </div>
    </div>
  );
}

function traceColumn<T extends { data_source: string; reference_date: string; captured_at: string }>(): ColumnDef<T> {
  return {
    id: 'trace_prd_18_3',
    header: 'Rastreio (PRD §18.3)',
    cell: ({ row }) => (
      <DataMeta source={row.original.data_source} refD={row.original.reference_date} cap={row.original.captured_at} />
    ),
  };
}

const IMPORT_DOCS: Record<ImportCategory, string> = {
  ar: 'Colunas: customer_name, document_number, issue_date, due_date, amount_original, amount_open · Opcionais: currency, data_source, reference_date',
  ap: 'Colunas: supplier_name, document_number, issue_date, due_date, amount_original, amount_open · Opcionais: currency, data_source, reference_date',
  cashflow:
    'Colunas: projection_date, description, inflow, outflow · Opcionais: data_source, reference_date (datas YYYY-MM-DD ou DD/MM/AAAA). Cada importação acrescenta linhas.',
  dre: 'Colunas: period_month (YYYY-MM), section, account_code, account_name, amount · Opcionais: data_source, reference_date',
  taxes: 'Colunas: period_month, tax_code, tax_name, amount · Opcionais: data_source, reference_date',
  notes: 'Colunas: period_month, title · Opcional: body, data_source, reference_date',
};

export function FinancialPanelPage() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [tab, setTab] = useState<TabKey>('summary');
  const [importCategory, setImportCategory] = useState<ImportCategory>('ar');
  const [batchSourceLabel, setBatchSourceLabel] = useState('import_csv');

  const arQ = useQuery({ queryKey: ['financial-ar'], queryFn: () => listReceivables(), enabled: tab === 'ar' || tab === 'summary' });
  const apQ = useQuery({ queryKey: ['financial-ap'], queryFn: () => listPayables(), enabled: tab === 'ap' || tab === 'summary' });
  const cashQ = useQuery({
    queryKey: ['financial-cash'],
    queryFn: () => listCashProjections(),
    enabled: tab === 'cash' || tab === 'summary',
  });
  const dreQ = useQuery({ queryKey: ['financial-dre'], queryFn: () => listDre(), enabled: tab === 'dre' });
  const taxQ = useQuery({ queryKey: ['financial-tax'], queryFn: () => listTaxes(), enabled: tab === 'taxes' });
  const notesQ = useQuery({ queryKey: ['financial-notes'], queryFn: () => listNotes(), enabled: tab === 'notes' });

  const arDelQ = useQuery({
    queryKey: ['financial-ar-delinq'],
    queryFn: fetchArDelinquency,
    enabled: tab === 'summary',
  });
  const apDelQ = useQuery({
    queryKey: ['financial-ap-delinq'],
    queryFn: fetchApDelinquency,
    enabled: tab === 'summary',
  });

  const cashRunning = useMemo(() => {
    const rows = [...(cashQ.data ?? [])].sort(
      (a, b) => new Date(a.projection_date).getTime() - new Date(b.projection_date).getTime(),
    );
    let sum = 0;
    return rows.map((r) => {
      sum += (r.inflow ?? 0) - (r.outflow ?? 0);
      return { ...r, running: sum };
    });
  }, [cashQ.data]);

  const minRunning = useMemo(() => {
    if (!cashRunning.length) return null;
    return cashRunning.reduce((m, r) => Math.min(m, r.running), cashRunning[0]!.running);
  }, [cashRunning]);

  const invalidateFinancial = () => {
    void qc.invalidateQueries({ queryKey: ['financial-ar'] });
    void qc.invalidateQueries({ queryKey: ['financial-ap'] });
    void qc.invalidateQueries({ queryKey: ['financial-cash'] });
    void qc.invalidateQueries({ queryKey: ['financial-dre'] });
    void qc.invalidateQueries({ queryKey: ['financial-tax'] });
    void qc.invalidateQueries({ queryKey: ['financial-notes'] });
    void qc.invalidateQueries({ queryKey: ['financial-ar-delinq'] });
    void qc.invalidateQueries({ queryKey: ['financial-ap-delinq'] });
  };

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      const label = batchSourceLabel.trim() || 'import_csv';
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      if (parsed.errors.length) throw new Error(parsed.errors[0]?.message ?? 'CSV inválido');
      const rows = parsed.data ?? [];

      const batch = await createImportBatch({
        category: importCategory,
        source_filename: file.name,
        data_source_label: label,
        row_count: rows.length,
        created_by: user.id,
        status: 'committed',
      });

      const rowSource = (r: Record<string, string>) => (r.data_source?.trim() ? r.data_source!.trim() : label);
      const rowRef = (r: Record<string, string>, fallback: string) =>
        r.reference_date?.trim() ? parseIsoDate(r.reference_date) : fallback;

      if (importCategory === 'ar') {
        const out: Database['public']['Tables']['financial_receivables']['Insert'][] = [];
        let rowNo = 0;
        for (const r of rows) {
          rowNo += 1;
          for (const k of ['customer_name', 'document_number', 'issue_date', 'due_date', 'amount_original', 'amount_open'] as const) {
            if (!r[k]?.trim()) throw new Error(`Linha ${rowNo}: falta "${k}".`);
          }
          const orig = parseNum(r.amount_original);
          const open = parseNum(r.amount_open);
          if (orig == null) throw new Error(`Linha ${rowNo}: amount_original inválido.`);
          if (open == null) throw new Error(`Linha ${rowNo}: amount_open inválido.`);
          const issue = parseIsoDate(r.issue_date!);
          const due = parseIsoDate(r.due_date!);
          out.push({
            batch_id: batch.id,
            customer_name: r.customer_name!.trim(),
            document_number: r.document_number!.trim(),
            issue_date: issue,
            due_date: due,
            amount_original: orig,
            amount_open: open,
            currency: r.currency?.trim() || 'BRL',
            data_source: rowSource(r),
            reference_date: rowRef(r, due),
          });
        }
        await upsertReceivables(out);
        return;
      }

      if (importCategory === 'ap') {
        const out: Database['public']['Tables']['financial_payables']['Insert'][] = [];
        let rowNo = 0;
        for (const r of rows) {
          rowNo += 1;
          for (const k of ['supplier_name', 'document_number', 'issue_date', 'due_date', 'amount_original', 'amount_open'] as const) {
            if (!r[k]?.trim()) throw new Error(`Linha ${rowNo}: falta "${k}".`);
          }
          const orig = parseNum(r.amount_original);
          const open = parseNum(r.amount_open);
          if (orig == null) throw new Error(`Linha ${rowNo}: amount_original inválido.`);
          if (open == null) throw new Error(`Linha ${rowNo}: amount_open inválido.`);
          const issue = parseIsoDate(r.issue_date!);
          const due = parseIsoDate(r.due_date!);
          out.push({
            batch_id: batch.id,
            supplier_name: r.supplier_name!.trim(),
            document_number: r.document_number!.trim(),
            issue_date: issue,
            due_date: due,
            amount_original: orig,
            amount_open: open,
            currency: r.currency?.trim() || 'BRL',
            data_source: rowSource(r),
            reference_date: rowRef(r, due),
          });
        }
        await upsertPayables(out);
        return;
      }

      if (importCategory === 'cashflow') {
        const out: Database['public']['Tables']['financial_cash_projections']['Insert'][] = [];
        let rowNo = 0;
        for (const r of rows) {
          rowNo += 1;
          if (!r.projection_date?.trim() || !r.description?.trim()) throw new Error(`Linha ${rowNo}: projection_date e description são obrigatórios.`);
          const inf = parseNum(r.inflow) ?? 0;
          const outf = parseNum(r.outflow) ?? 0;
          const pd = parseIsoDate(r.projection_date);
          out.push({
            batch_id: batch.id,
            projection_date: pd,
            description: r.description.trim(),
            inflow: inf,
            outflow: outf,
            data_source: rowSource(r),
            reference_date: rowRef(r, pd),
          });
        }
        await insertCashProjections(out);
        return;
      }

      if (importCategory === 'dre') {
        const out: Database['public']['Tables']['financial_dre_contabil']['Insert'][] = [];
        let rowNo = 0;
        for (const r of rows) {
          rowNo += 1;
          for (const k of ['period_month', 'section', 'account_code', 'account_name', 'amount'] as const) {
            if (!r[k]?.trim()) throw new Error(`Linha ${rowNo}: falta "${k}".`);
          }
          const amt = parseNum(r.amount);
          if (amt == null) throw new Error(`Linha ${rowNo}: amount inválido.`);
          const pm = parsePeriodMonth(r.period_month!);
          const ref = rowRef(r, pm);
          out.push({
            batch_id: batch.id,
            period_month: pm,
            section: r.section!.trim(),
            account_code: r.account_code!.trim(),
            account_name: r.account_name!.trim(),
            amount: amt,
            data_source: rowSource(r),
            reference_date: ref,
          });
        }
        await upsertDre(out);
        return;
      }

      if (importCategory === 'taxes') {
        const out: Database['public']['Tables']['financial_tax_entries']['Insert'][] = [];
        let rowNo = 0;
        for (const r of rows) {
          rowNo += 1;
          for (const k of ['period_month', 'tax_code', 'tax_name', 'amount'] as const) {
            if (!r[k]?.trim()) throw new Error(`Linha ${rowNo}: falta "${k}".`);
          }
          const amt = parseNum(r.amount);
          if (amt == null) throw new Error(`Linha ${rowNo}: amount inválido.`);
          const pm = parsePeriodMonth(r.period_month!);
          out.push({
            batch_id: batch.id,
            period_month: pm,
            tax_code: r.tax_code!.trim(),
            tax_name: r.tax_name!.trim(),
            amount: amt,
            data_source: rowSource(r),
            reference_date: rowRef(r, pm),
          });
        }
        await upsertTaxes(out);
        return;
      }

      if (importCategory === 'notes') {
        const out: Database['public']['Tables']['financial_accounting_notes']['Insert'][] = [];
        let rowNo = 0;
        for (const r of rows) {
          rowNo += 1;
          if (!r.period_month?.trim() || !r.title?.trim()) throw new Error(`Linha ${rowNo}: period_month e title são obrigatórios.`);
          const pm = parsePeriodMonth(r.period_month);
          out.push({
            batch_id: batch.id,
            period_month: pm,
            title: r.title.trim(),
            body: r.body?.trim() || null,
            data_source: rowSource(r),
            reference_date: rowRef(r, pm),
          });
        }
        await insertNotes(out);
      }
    },
    onSuccess: () => {
      toast.success('Importação gravada.');
      invalidateFinancial();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const arCols: ColumnDef<ReceivableRow>[] = useMemo(
    () => [
      { accessorKey: 'customer_name', header: 'Cliente' },
      { accessorKey: 'document_number', header: 'Documento' },
      { accessorKey: 'due_date', header: 'Venc.', cell: ({ row }) => fmtDateOnly(row.original.due_date) },
      {
        accessorKey: 'amount_open',
        header: 'Em aberto',
        cell: ({ row }) => fmtBRL(row.original.amount_open),
      },
      traceColumn<ReceivableRow>(),
    ],
    [],
  );

  const apCols: ColumnDef<PayableRow>[] = useMemo(
    () => [
      { accessorKey: 'supplier_name', header: 'Fornecedor' },
      { accessorKey: 'document_number', header: 'Documento' },
      { accessorKey: 'due_date', header: 'Venc.', cell: ({ row }) => fmtDateOnly(row.original.due_date) },
      {
        accessorKey: 'amount_open',
        header: 'Em aberto',
        cell: ({ row }) => fmtBRL(row.original.amount_open),
      },
      traceColumn<PayableRow>(),
    ],
    [],
  );

  type CashEnriched = CashProjectionRow & { running: number };
  const cashCols: ColumnDef<CashEnriched>[] = useMemo(
    () => [
      { accessorKey: 'projection_date', header: 'Data', cell: ({ row }) => fmtDateOnly(row.original.projection_date) },
      { accessorKey: 'description', header: 'Descrição' },
      {
        accessorKey: 'inflow',
        header: 'Entrada',
        cell: ({ row }) => fmtBRL(row.original.inflow),
      },
      {
        accessorKey: 'outflow',
        header: 'Saída',
        cell: ({ row }) => fmtBRL(row.original.outflow),
      },
      {
        id: 'net',
        header: 'Líq. período',
        cell: ({ row }) => fmtBRL(row.original.inflow - row.original.outflow),
      },
      {
        accessorKey: 'running',
        header: 'Saldo acumulado',
        cell: ({ row }) => fmtBRL(row.original.running),
      },
      traceColumn<CashEnriched>(),
    ],
    [],
  );

  const dreCols: ColumnDef<DreRow>[] = useMemo(
    () => [
      { accessorKey: 'period_month', header: 'Mês', cell: ({ row }) => fmtDateOnly(row.original.period_month) },
      { accessorKey: 'section', header: 'Secção' },
      { accessorKey: 'account_code', header: 'Conta' },
      { accessorKey: 'account_name', header: 'Nome' },
      { accessorKey: 'amount', header: 'Valor', cell: ({ row }) => fmtBRL(row.original.amount) },
      traceColumn<DreRow>(),
    ],
    [],
  );

  const taxCols: ColumnDef<TaxRow>[] = useMemo(
    () => [
      { accessorKey: 'period_month', header: 'Mês', cell: ({ row }) => fmtDateOnly(row.original.period_month) },
      { accessorKey: 'tax_code', header: 'Código' },
      { accessorKey: 'tax_name', header: 'Imposto' },
      { accessorKey: 'amount', header: 'Valor', cell: ({ row }) => fmtBRL(row.original.amount) },
      traceColumn<TaxRow>(),
    ],
    [],
  );

  const noteCols: ColumnDef<NoteRow>[] = useMemo(
    () => [
      { accessorKey: 'period_month', header: 'Mês', cell: ({ row }) => fmtDateOnly(row.original.period_month) },
      { accessorKey: 'title', header: 'Título' },
      {
        accessorKey: 'body',
        header: 'Texto',
        cell: ({ row }) => <span className="line-clamp-2 text-muted-foreground">{row.original.body ?? '—'}</span>,
      },
      traceColumn<NoteRow>(),
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Painel financeiro e contábil</h1>
        <p className="text-sm text-muted-foreground">
          Fase 10 — contas a receber/pagar, inadimplência, fluxo de caixa projetado, DRE contábil, impostos e notas. Cada linha
          mostra fonte e datas conforme PRD §18.3.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { k: 'summary' as const, label: 'Resumo', icon: Landmark },
            { k: 'ar' as const, label: 'AR', icon: TrendingUp },
            { k: 'ap' as const, label: 'AP', icon: TrendingDown },
            { k: 'cash' as const, label: 'Fluxo', icon: Banknote },
            { k: 'dre' as const, label: 'DRE contábil', icon: LineChart },
            { k: 'taxes' as const, label: 'Impostos', icon: Scale },
            { k: 'notes' as const, label: 'Notas', icon: StickyNote },
            { k: 'import' as const, label: 'Importar CSV', icon: FileSpreadsheet },
          ] as const
        ).map(({ k, label, icon: Icon }) => (
          <Button key={k} variant={tab === k ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setTab(k)}>
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Inadimplência AR</CardTitle>
              <CardDescription>Contas a receber em aberto e vencidas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {arDelQ.isLoading ? (
                <p className="text-muted-foreground">A carregar…</p>
              ) : arDelQ.data ? (
                <>
                  <p>Total em aberto: {fmtBRL(Number(arDelQ.data.total_open))}</p>
                  <p>Vencido em aberto: {fmtBRL(Number(arDelQ.data.overdue_open))}</p>
                  <p className="text-muted-foreground">
                    Linhas abertas: {arDelQ.data.lines_open} · Vencidas: {arDelQ.data.overdue_lines}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Sem dados.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Inadimplência AP</CardTitle>
              <CardDescription>Contas a pagar em aberto e vencidas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {apDelQ.isLoading ? (
                <p className="text-muted-foreground">A carregar…</p>
              ) : apDelQ.data ? (
                <>
                  <p>Total em aberto: {fmtBRL(Number(apDelQ.data.total_open))}</p>
                  <p>Vencido em aberto: {fmtBRL(Number(apDelQ.data.overdue_open))}</p>
                  <p className="text-muted-foreground">
                    Linhas abertas: {apDelQ.data.lines_open} · Vencidas: {apDelQ.data.overdue_lines}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Sem dados.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fluxo projetado</CardTitle>
              <CardDescription>Saldo acumulado (entradas − saídas), ordenado por data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {cashQ.isLoading ? (
                <p className="text-muted-foreground">A carregar…</p>
              ) : minRunning != null ? (
                <>
                  <p>
                    Saldo acumulado mínimo:{' '}
                    <span className={minRunning < 0 ? 'font-medium text-destructive' : ''}>{fmtBRL(minRunning)}</span>
                  </p>
                  {minRunning < 0 ? (
                    <Badge variant="danger">Projeção com saldo negativo</Badge>
                  ) : (
                    <Badge variant="secondary">Sem saldo acumulado negativo nas linhas carregadas</Badge>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Sem linhas de fluxo importadas.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'ar' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Contas a receber</CardTitle>
              <CardDescription>Fonte, data de referência e registo no CRM em cada linha (§18.3)</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void arQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={arCols} data={arQ.data ?? []} isLoading={arQ.isLoading} emptyMessage="Nenhuma linha AR." />
          </CardContent>
        </Card>
      )}

      {tab === 'ap' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Contas a pagar</CardTitle>
              <CardDescription>Proveniência e datas conforme PRD §18.3</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void apQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={apCols} data={apQ.data ?? []} isLoading={apQ.isLoading} emptyMessage="Nenhuma linha AP." />
          </CardContent>
        </Card>
      )}

      {tab === 'cash' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Fluxo de caixa projetado</CardTitle>
              <CardDescription>Coluna &quot;Saldo acumulado&quot; soma líquidos por ordem de data</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void cashQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={cashCols}
              data={cashRunning}
              isLoading={cashQ.isLoading}
              emptyMessage="Nenhuma projeção de fluxo."
            />
          </CardContent>
        </Card>
      )}

      {tab === 'dre' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>DRE contábil (importado)</CardTitle>
              <CardDescription>Linhas agregadas por mês, secção e conta</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void dreQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={dreCols} data={dreQ.data ?? []} isLoading={dreQ.isLoading} emptyMessage="Nenhuma linha DRE." />
          </CardContent>
        </Card>
      )}

      {tab === 'taxes' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Impostos</CardTitle>
              <CardDescription>Lançamentos por período e código fiscal</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void taxQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={taxCols} data={taxQ.data ?? []} isLoading={taxQ.isLoading} emptyMessage="Nenhum imposto importado." />
          </CardContent>
        </Card>
      )}

      {tab === 'notes' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Notas e memorandos contábeis</CardTitle>
              <CardDescription>Texto livre associado ao mês de referência</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void notesQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={noteCols} data={notesQ.data ?? []} isLoading={notesQ.isLoading} emptyMessage="Nenhuma nota." />
          </CardContent>
        </Card>
      )}

      {tab === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle>Importação CSV</CardTitle>
            <CardDescription>
              Escolha a categoria, defina o rótulo de fonte do lote (aplicado a todas as linhas sem coluna data_source) e envie o
              ficheiro. {IMPORT_DOCS[importCategory]}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-w-xl flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="fin-cat">Categoria</Label>
              <select
                id="fin-cat"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={importCategory}
                onChange={(e) => setImportCategory(e.target.value as ImportCategory)}
              >
                <option value="ar">Contas a receber (AR)</option>
                <option value="ap">Contas a pagar (AP)</option>
                <option value="cashflow">Fluxo de caixa projetado</option>
                <option value="dre">DRE contábil</option>
                <option value="taxes">Impostos</option>
                <option value="notes">Notas contábeis</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-src">Rótulo de fonte do lote (data_source padrão)</Label>
              <Input id="fin-src" value={batchSourceLabel} onChange={(e) => setBatchSourceLabel(e.target.value)} placeholder="ex.: ERP_X / contabilidade_maio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-file">Ficheiro CSV</Label>
              <Input
                id="fin-file"
                type="file"
                accept=".csv,text/csv"
                disabled={importMut.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) importMut.mutate(f);
                }}
              />
            </div>
            {importMut.isPending && <p className="text-sm text-muted-foreground">A importar…</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
