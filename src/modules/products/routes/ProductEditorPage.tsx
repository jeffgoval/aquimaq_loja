import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
  Textarea,
} from '@ds/primitives';
import { FormField } from '@shared/components/forms/FormField';
import { toast } from 'sonner';
import { productFormSchema, type ProductFormInput } from '../schemas/productFormSchema';
import {
  getProduct,
  insertProduct,
  updateProduct,
  listCategories,
  listSubcategories,
  listBrands,
  listSuppliers,
  listUnits,
  listResultCenters,
  listProfilesForResponsible,
  searchErpProducts,
  listProductCostHistory,
  listProductPriceHistory,
  listProductScoreHistory,
  listAlternateSupplierIds,
  replaceAlternateSuppliers,
  type ProductListRow,
} from '../services/productsApi';

function toInput(row: ProductListRow): ProductFormInput {
  return {
    internal_code: row.internal_code,
    erp_code: row.erp_code ?? '',
    erp_product_id: row.erp_product_id ?? '',
    factory_code: row.factory_code ?? '',
    barcode: row.barcode ?? '',
    description: row.description,
    category_id: row.category_id ?? '',
    subcategory_id: row.subcategory_id ?? '',
    brand_id: row.brand_id ?? '',
    primary_supplier_id: row.primary_supplier_id ?? '',
    unit_purchase_id: row.unit_purchase_id ?? '',
    unit_sale_id: row.unit_sale_id ?? '',
    unit_conversion_factor: row.unit_conversion_factor,
    management_cost: row.management_cost ?? null,
    management_price: row.management_price ?? null,
    margin_minimum_pct: row.margin_minimum_pct ?? null,
    margin_target_pct: row.margin_target_pct ?? null,
    max_discount_pct: row.max_discount_pct ?? null,
    min_stock: row.min_stock ?? null,
    max_stock: row.max_stock ?? null,
    default_location: row.default_location ?? '',
    result_center_id: row.result_center_id ?? '',
    abc_class: (row.abc_class as 'A' | 'B' | 'C' | null) ?? null,
    is_new_standard: row.is_new_standard,
    responsible_user_id: row.responsible_user_id ?? '',
    last_reviewed_at: row.last_reviewed_at ? row.last_reviewed_at.slice(0, 16) : '',
    notes: row.notes ?? '',
    is_active: row.is_active,
  };
}

const defaultCreate = (): ProductFormInput => ({
  internal_code: '',
  erp_code: '',
  erp_product_id: '',
  factory_code: '',
  barcode: '',
  description: '',
  category_id: '',
  subcategory_id: '',
  brand_id: '',
  primary_supplier_id: '',
  unit_purchase_id: '',
  unit_sale_id: '',
  unit_conversion_factor: 1,
  management_cost: null,
  management_price: null,
  margin_minimum_pct: null,
  margin_target_pct: null,
  max_discount_pct: null,
  min_stock: null,
  max_stock: null,
  default_location: '',
  result_center_id: '',
  abc_class: null,
  is_new_standard: false,
  responsible_user_id: '',
  last_reviewed_at: '',
  notes: '',
  is_active: true,
});

export function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isCreate = !id;

  const productQuery = useQuery({
    queryKey: ['products', 'one', id],
    queryFn: () => getProduct(id!),
    enabled: Boolean(id),
  });

  const catalogLookups = useQuery({
    queryKey: ['products', 'catalog-lookups'],
    queryFn: async () => {
      const [categories, brands, suppliers, units, centers, profiles] = await Promise.all([
        listCategories(),
        listBrands(),
        listSuppliers(),
        listUnits(),
        listResultCenters(),
        listProfilesForResponsible(),
      ]);
      return { categories, brands, suppliers, units, centers, profiles };
    },
  });

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultCreate(),
  });

  const categoryId = form.watch('category_id');
  const subcategoriesQuery = useQuery({
    queryKey: ['products', 'subcategories', categoryId],
    queryFn: () => listSubcategories(categoryId || null),
    enabled: Boolean(categoryId),
  });

  const [erpQ, setErpQ] = useState('');
  const [erpBrowse, setErpBrowse] = useState(false);
  const erpSearch = useQuery({
    queryKey: ['products', 'erp-search', erpQ, erpBrowse],
    queryFn: () => searchErpProducts(erpBrowse ? '' : erpQ),
    enabled: Boolean(catalogLookups.isSuccess && (erpBrowse || erpQ.trim().length >= 2)),
  });

  const alternatesQuery = useQuery({
    queryKey: ['products', 'alternates', id],
    queryFn: () => listAlternateSupplierIds(id!),
    enabled: Boolean(id),
  });

  const [alternateSelection, setAlternateSelection] = useState<string[]>([]);
  useEffect(() => {
    if (alternatesQuery.data) setAlternateSelection(alternatesQuery.data);
  }, [alternatesQuery.data]);

  useEffect(() => {
    if (!isCreate && productQuery.data) {
      form.reset(toInput(productQuery.data));
    }
  }, [isCreate, productQuery.data, form]);

  useEffect(() => {
    if (isCreate && catalogLookups.data?.units.length) {
      const u = catalogLookups.data.units[0];
      if (!u) return;
      if (!form.getValues('unit_purchase_id')) form.setValue('unit_purchase_id', u.id);
      if (!form.getValues('unit_sale_id')) form.setValue('unit_sale_id', u.id);
    }
  }, [isCreate, catalogLookups.data, form]);

  const costHist = useQuery({
    queryKey: ['products', 'hist-cost', id],
    queryFn: () => listProductCostHistory(id!),
    enabled: Boolean(id),
  });
  const priceHist = useQuery({
    queryKey: ['products', 'hist-price', id],
    queryFn: () => listProductPriceHistory(id!),
    enabled: Boolean(id),
  });
  const scoreHist = useQuery({
    queryKey: ['products', 'hist-score', id],
    queryFn: () => listProductScoreHistory(id!),
    enabled: Boolean(id),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormInput) => {
      const payload = {
        internal_code: values.internal_code.trim(),
        erp_code: values.erp_code?.trim() || null,
        erp_product_id: values.erp_product_id?.trim() || null,
        factory_code: values.factory_code?.trim() || null,
        barcode: values.barcode?.trim() || null,
        description: values.description.trim(),
        category_id: values.category_id?.trim() || null,
        subcategory_id: values.subcategory_id?.trim() || null,
        brand_id: values.brand_id?.trim() || null,
        primary_supplier_id: values.primary_supplier_id?.trim() || null,
        unit_purchase_id: values.unit_purchase_id?.trim() || null,
        unit_sale_id: values.unit_sale_id?.trim() || null,
        unit_conversion_factor: values.unit_conversion_factor,
        management_cost: values.management_cost,
        management_price: values.management_price,
        margin_minimum_pct: values.margin_minimum_pct,
        margin_target_pct: values.margin_target_pct,
        max_discount_pct: values.max_discount_pct,
        min_stock: values.min_stock,
        max_stock: values.max_stock,
        default_location: values.default_location?.trim() || null,
        result_center_id: values.result_center_id?.trim() || null,
        abc_class: values.abc_class,
        is_new_standard: values.is_new_standard,
        responsible_user_id: values.responsible_user_id?.trim() || null,
        last_reviewed_at: values.last_reviewed_at?.trim()
          ? new Date(values.last_reviewed_at).toISOString()
          : null,
        notes: values.notes?.trim() || null,
        is_active: values.is_active,
      };
      if (isCreate) {
        const row = await insertProduct(payload);
        const primary = values.primary_supplier_id?.trim();
        const alts = alternateSelection.filter((s) => s && s !== primary);
        if (alts.length) await replaceAlternateSuppliers(row.id, alts);
        return row.id;
      }
      await updateProduct(id!, payload);
      const primary = values.primary_supplier_id?.trim();
      const alts = alternateSelection.filter((s) => s && s !== primary);
      await replaceAlternateSuppliers(id!, alts);
      return id!;
    },
    onSuccess: async (savedId) => {
      toast.success(isCreate ? 'Produto criado.' : 'Produto atualizado.');
      await qc.invalidateQueries({ queryKey: ['products'] });
      await qc.invalidateQueries({ queryKey: ['products', 'one', savedId] });
      if (isCreate) navigate(`/products/${savedId}/edit`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const primaryId = form.watch('primary_supplier_id');
  const supplierOptions = useMemo(() => catalogLookups.data?.suppliers ?? [], [catalogLookups.data]);

  const toggleAlternate = (sid: string) => {
    if (sid === primaryId) return;
    setAlternateSelection((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  };

  if (!isCreate && productQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!isCreate && !productQuery.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Produto não encontrado.</p>
        <Button variant="secondary" asChild>
          <Link to="/products">Voltar</Link>
        </Button>
      </div>
    );
  }

  if (!isCreate && productQuery.data?.deleted_at) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Este produto foi arquivado e não pode ser editado.</p>
        <Button variant="secondary" asChild>
          <Link to="/products">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  const currentScore = !isCreate ? productQuery.data?.registration_score : undefined;
  const currentPend = !isCreate ? productQuery.data?.pendencies : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/products">
            <ArrowLeft className="h-4 w-4" />
            Lista
          </Link>
        </Button>
        {!isCreate && currentScore != null ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score atual</span>
            <Badge variant={currentScore >= 100 ? 'success' : currentScore >= 70 ? 'secondary' : 'danger'}>
              {currentScore}%
            </Badge>
          </div>
        ) : null}
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">{isCreate ? 'Novo produto' : 'Editar produto'}</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados operacionais e comerciais; o score de cadastro é recalculado ao gravar.
        </p>
      </div>

      {!isCreate && currentPend && currentPend.length > 0 ? (
        <Card className="border-warning/40 bg-warning-soft/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pendências</CardTitle>
            <CardDescription>Itens que reduzem o score de cadastro.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {currentPend.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((v) => {
          void saveMutation.mutateAsync(v);
        })}
      >
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-internal_code" label="Código interno *" error={form.formState.errors.internal_code?.message}>
              <Input id="p-internal_code" {...form.register('internal_code')} autoComplete="off" />
            </FormField>
            <FormField id="p-erp_code" label="Código ERP" error={form.formState.errors.erp_code?.message}>
              <Input id="p-erp_code" {...form.register('erp_code')} autoComplete="off" />
            </FormField>
            <FormField id="p-factory_code" label="Código fábrica" error={form.formState.errors.factory_code?.message}>
              <Input id="p-factory_code" {...form.register('factory_code')} autoComplete="off" />
            </FormField>
            <FormField id="p-barcode" label="Código de barras" error={form.formState.errors.barcode?.message}>
              <Input id="p-barcode" {...form.register('barcode')} autoComplete="off" />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="p-description" label="Descrição padronizada *" error={form.formState.errors.description?.message}>
                <Textarea id="p-description" rows={3} {...form.register('description')} />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vínculo ERP (opcional)</CardTitle>
            <CardDescription>Busque pelo código ou descrição do espelho importado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Buscar (mín. 2 caracteres)…"
                value={erpQ}
                onChange={(e) => {
                  setErpBrowse(false);
                  setErpQ(e.target.value);
                }}
                className="max-w-sm"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => setErpBrowse(true)}>
                Listar primeiros
              </Button>
            </div>
            <Controller
              name="erp_product_id"
              control={form.control}
              render={({ field }) => (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
                  {(erpSearch.data ?? []).map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-muted">
                      <input
                        type="radio"
                        name="erp_pick"
                        checked={field.value === r.id}
                        onChange={() => {
                          field.onChange(r.id);
                          form.setValue('erp_code', r.erp_code);
                        }}
                      />
                      <span className="font-mono text-xs">{r.erp_code}</span>
                      <span className="text-muted-foreground">{r.description}</span>
                    </label>
                  ))}
                  {erpSearch.isFetching ? <span className="text-muted-foreground">Buscando…</span> : null}
                </div>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                form.setValue('erp_product_id', '');
              }}
            >
              Limpar vínculo ERP
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-category_id" label="Categoria" error={form.formState.errors.category_id?.message}>
              <select
                id="p-category_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('category_id')}
              >
                <option value="">—</option>
                {(catalogLookups.data?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-subcategory_id" label="Subcategoria" error={form.formState.errors.subcategory_id?.message}>
              <select
                id="p-subcategory_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('subcategory_id')}
              >
                <option value="">—</option>
                {(subcategoriesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-brand_id" label="Marca" error={form.formState.errors.brand_id?.message}>
              <select id="p-brand_id" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm" {...form.register('brand_id')}>
                <option value="">—</option>
                {(catalogLookups.data?.brands ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-result_center_id" label="Centro de resultado" error={form.formState.errors.result_center_id?.message}>
              <select
                id="p-result_center_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('result_center_id')}
              >
                <option value="">—</option>
                {(catalogLookups.data?.centers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-abc_class" label="Curva ABC" error={form.formState.errors.abc_class?.message}>
              <select id="p-abc_class" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm" {...form.register('abc_class')}>
                <option value="">—</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fornecedores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField id="p-primary_supplier_id" label="Fornecedor principal" error={form.formState.errors.primary_supplier_id?.message}>
              <select
                id="p-primary_supplier_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('primary_supplier_id')}
              >
                <option value="">—</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div>
              <Label className="mb-2 block text-sm font-medium">Fornecedores alternativos</Label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
                {supplierOptions.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={alternateSelection.includes(s.id)}
                      disabled={s.id === primaryId}
                      onChange={() => toggleAlternate(s.id)}
                    />
                    {s.name}
                    {s.id === primaryId ? <span className="text-xs text-muted-foreground">(principal)</span> : null}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unidades e conversão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-unit_purchase_id" label="Unidade de compra" error={form.formState.errors.unit_purchase_id?.message}>
              <select
                id="p-unit_purchase_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('unit_purchase_id')}
              >
                <option value="">—</option>
                {(catalogLookups.data?.units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} — {u.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-unit_sale_id" label="Unidade de venda" error={form.formState.errors.unit_sale_id?.message}>
              <select
                id="p-unit_sale_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('unit_sale_id')}
              >
                <option value="">—</option>
                {(catalogLookups.data?.units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} — {u.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-unit_conversion_factor" label="Fator de conversão" error={form.formState.errors.unit_conversion_factor?.message}>
              <Input id="p-unit_conversion_factor" type="number" step="0.0001" min={0.0001} {...form.register('unit_conversion_factor', { valueAsNumber: true })} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custos, preços e margens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-management_cost" label="Custo gerencial" error={form.formState.errors.management_cost?.message}>
              <Input id="p-management_cost" type="number" step="0.01" {...form.register('management_cost', { valueAsNumber: true })} />
            </FormField>
            <FormField id="p-management_price" label="Preço gerencial" error={form.formState.errors.management_price?.message}>
              <Input id="p-management_price" type="number" step="0.01" {...form.register('management_price', { valueAsNumber: true })} />
            </FormField>
            <FormField id="p-margin_minimum_pct" label="Margem mínima %" error={form.formState.errors.margin_minimum_pct?.message}>
              <Input id="p-margin_minimum_pct" type="number" step="0.1" {...form.register('margin_minimum_pct', { valueAsNumber: true })} />
            </FormField>
            <FormField id="p-margin_target_pct" label="Margem desejada %" error={form.formState.errors.margin_target_pct?.message}>
              <Input id="p-margin_target_pct" type="number" step="0.1" {...form.register('margin_target_pct', { valueAsNumber: true })} />
            </FormField>
            <FormField id="p-max_discount_pct" label="Desconto máximo %" error={form.formState.errors.max_discount_pct?.message}>
              <Input id="p-max_discount_pct" type="number" step="0.1" {...form.register('max_discount_pct', { valueAsNumber: true })} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque e localização</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-min_stock" label="Estoque mínimo" error={form.formState.errors.min_stock?.message}>
              <Input id="p-min_stock" type="number" step="0.01" {...form.register('min_stock', { valueAsNumber: true })} />
            </FormField>
            <FormField id="p-max_stock" label="Estoque máximo" error={form.formState.errors.max_stock?.message}>
              <Input id="p-max_stock" type="number" step="0.01" {...form.register('max_stock', { valueAsNumber: true })} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField id="p-default_location" label="Localização física padrão" error={form.formState.errors.default_location?.message}>
                <Input id="p-default_location" {...form.register('default_location')} />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operação e revisão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-responsible_user_id" label="Responsável pelo cadastro" error={form.formState.errors.responsible_user_id?.message}>
              <select
                id="p-responsible_user_id"
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                {...form.register('responsible_user_id')}
              >
                <option value="">—</option>
                {(catalogLookups.data?.profiles ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="p-last_reviewed_at" label="Última revisão" error={form.formState.errors.last_reviewed_at?.message}>
              <Input id="p-last_reviewed_at" type="datetime-local" {...form.register('last_reviewed_at')} />
            </FormField>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="is_new_standard" {...form.register('is_new_standard')} />
              <Label htmlFor="is_new_standard">Marcar no padrão novo (exige score 100%, categoria e unidades)</Label>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="is_active" {...form.register('is_active')} />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <div className="sm:col-span-2">
              <FormField id="p-notes" label="Observações" error={form.formState.errors.notes?.message}>
                <Textarea id="p-notes" rows={3} {...form.register('notes')} />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" asChild>
            <Link to="/products">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>

      {!isCreate ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de custo</CardTitle>
            </CardHeader>
            <CardContent className="max-h-56 space-y-2 overflow-y-auto text-xs">
              {(costHist.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">Sem alterações ainda.</p>
              ) : (
                (costHist.data ?? []).map((h) => (
                  <div key={h.id} className="border-b border-border pb-1">
                    <div className="tabular-nums">
                      {h.previous_cost ?? '—'} → {h.new_cost ?? '—'}
                    </div>
                    <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de preço / margem</CardTitle>
            </CardHeader>
            <CardContent className="max-h-56 space-y-2 overflow-y-auto text-xs">
              {(priceHist.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">Sem alterações ainda.</p>
              ) : (
                (priceHist.data ?? []).map((h) => (
                  <div key={h.id} className="border-b border-border pb-1">
                    <div className="tabular-nums">
                      Preço {h.previous_price ?? '—'} → {h.new_price ?? '—'}
                    </div>
                    <div className="tabular-nums text-muted-foreground">
                      Margem {h.previous_margin_pct ?? '—'}% → {h.new_margin_pct ?? '—'}%
                    </div>
                    <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de score</CardTitle>
            </CardHeader>
            <CardContent className="max-h-56 space-y-2 overflow-y-auto text-xs">
              {(scoreHist.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">Sem alterações após criação.</p>
              ) : (
                (scoreHist.data ?? []).map((h) => (
                  <div key={h.id} className="border-b border-border pb-1">
                    <div>
                      {h.previous_score ?? '—'}% → {h.new_score ?? '—'}%
                    </div>
                    <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
