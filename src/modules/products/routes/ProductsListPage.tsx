import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Upload, Pencil } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ds/primitives';
import { DataTable } from '@shared/components/tables/DataTable';
import { listProducts, type ProductListRow } from '../services/productsApi';

function StatCard({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}

export function ProductsListPage() {
  const q = useQuery({ queryKey: ['products', 'list'], queryFn: listProducts });

  const stats = useMemo(() => {
    const rows = q.data ?? [];
    const total = rows.length;
    const complete = rows.filter((r) => r.registration_status === 'complete').length;
    const incomplete = total - complete;
    const newStd = rows.filter((r) => r.is_new_standard).length;
    const noPrice = rows.filter((r) => r.pendencies?.includes('sem preço gerencial')).length;
    const noLoc = rows.filter((r) => r.pendencies?.includes('sem localização')).length;
    const noSupplier = rows.filter((r) => r.pendencies?.includes('sem fornecedor principal')).length;
    const noReview = rows.filter((r) => !r.last_reviewed_at).length;
    return { total, complete, incomplete, newStd, noPrice, noLoc, noSupplier, noReview };
  }, [q.data]);

  const columns: ColumnDef<ProductListRow>[] = [
    { accessorKey: 'internal_code', header: 'Código' },
    { accessorKey: 'description', header: 'Produto' },
    {
      id: 'category',
      header: 'Categoria',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.category?.name ?? '—'}</span>,
    },
    {
      id: 'brand',
      header: 'Marca',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.brand?.name ?? '—'}</span>,
    },
    {
      id: 'rc',
      header: 'Centro resultado',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.result_center?.name ?? '—'}</span>,
    },
    {
      id: 'supplier',
      header: 'Fornecedor',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.primary_supplier?.name ?? '—'}</span>,
    },
    {
      id: 'cost',
      header: 'Custo',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.management_cost != null ? row.original.management_cost : '—'}</span>
      ),
    },
    {
      id: 'price',
      header: 'Preço',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.management_price != null ? row.original.management_price : '—'}</span>
      ),
    },
    {
      id: 'margin',
      header: 'Margem mín. %',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.margin_minimum_pct != null ? row.original.margin_minimum_pct : '—'}</span>
      ),
    },
    {
      id: 'min_stock',
      header: 'Est. mín.',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.min_stock != null ? row.original.min_stock : '—'}</span>
      ),
    },
    {
      id: 'loc',
      header: 'Localização',
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-1 max-w-[140px]">
          {row.original.default_location?.trim() ? row.original.default_location : '—'}
        </span>
      ),
    },
    {
      id: 'score',
      header: 'Score',
      cell: ({ row }) => {
        const s = row.original.registration_score;
        const variant = s >= 100 ? 'success' : s >= 70 ? 'secondary' : 'danger';
        return <Badge variant={variant}>{s}%</Badge>;
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.registration_status === 'complete' ? (
          <Badge variant="success">Completo</Badge>
        ) : (
          <Badge variant="secondary">Incompleto</Badge>
        ),
    },
    {
      id: 'responsible',
      header: 'Responsável',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.responsible?.full_name ?? '—'}</span>,
    },
    {
      id: 'review',
      header: 'Última revisão',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.last_reviewed_at ? new Date(row.original.last_reviewed_at).toLocaleDateString('pt-BR') : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button type="button" size="icon" variant="ghost" asChild aria-label="Editar">
          <Link to={`/products/${row.original.id}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cadastro mestre</h1>
          <p className="text-sm text-muted-foreground">Produtos gerenciais, score de cadastro (PRD §11) e pendências.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/products/import">
              <Upload className="h-4 w-4" />
              Importar CSV
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/products/new">
              <Plus className="h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total de produtos" value={stats.total} />
        <StatCard title="Produtos completos" value={stats.complete} />
        <StatCard title="Produtos incompletos" value={stats.incomplete} />
        <StatCard title="No padrão novo" value={stats.newStd} />
        <StatCard title="Sem preço" value={stats.noPrice} />
        <StatCard title="Sem localização" value={stats.noLoc} />
        <StatCard title="Sem fornecedor" value={stats.noSupplier} />
        <StatCard title="Sem revisão (data)" value={stats.noReview} hint="Campo última revisão vazio" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>Ordenação por descrição. Score e pendências atualizados ao gravar.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={q.data ?? []} isLoading={q.isLoading} getRowId={(r) => r.id} />
        </CardContent>
      </Card>
    </div>
  );
}
