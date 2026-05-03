import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@ds/primitives';
import { toast } from 'sonner';
import {
  insertProduct,
  listCategories,
  listBrands,
  listSuppliers,
  listUnits,
  listResultCenters,
  type ProductInsert,
} from '../services/productsApi';
import { parseExcelFirstSheet, type ImportRow } from '../lib/parseImportSpreadsheet';

export const PRODUCT_IMPORT_FIELD_KEYS = [
  { key: 'internal_code', label: 'Código interno *' },
  { key: 'description', label: 'Descrição *' },
  { key: 'erp_code', label: 'Código ERP' },
  { key: 'factory_code', label: 'Código fábrica' },
  { key: 'barcode', label: 'Código barras' },
  { key: 'category_name', label: 'Categoria (nome exato)' },
  { key: 'subcategory_name', label: 'Subcategoria (nome exato)' },
  { key: 'brand_name', label: 'Marca (nome exato)' },
  { key: 'supplier_name', label: 'Fornecedor principal (nome exato)' },
  { key: 'unit_purchase_code', label: 'Unidade compra (código ex.: UN)' },
  { key: 'unit_sale_code', label: 'Unidade venda (código)' },
  { key: 'unit_conversion_factor', label: 'Fator conversão' },
  { key: 'management_cost', label: 'Custo gerencial' },
  { key: 'management_price', label: 'Preço gerencial' },
  { key: 'margin_minimum_pct', label: 'Margem mínima %' },
  { key: 'margin_target_pct', label: 'Margem desejada %' },
  { key: 'max_discount_pct', label: 'Desconto máx %' },
  { key: 'min_stock', label: 'Estoque mínimo' },
  { key: 'max_stock', label: 'Estoque máximo' },
  { key: 'default_location', label: 'Localização' },
  { key: 'result_center_name', label: 'Centro resultado (nome exato)' },
  { key: 'abc_class', label: 'ABC (A/B/C)' },
] as const;

export type ProductImportFieldKey = (typeof PRODUCT_IMPORT_FIELD_KEYS)[number]['key'];

function parseNum(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function ProductImportPage() {
  const qc = useQueryClient();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ProductImportFieldKey, string>>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const catalogLookups = useQuery({
    queryKey: ['products', 'catalog-lookups-import'],
    queryFn: async () => {
      const [categories, brands, suppliers, units, centers] = await Promise.all([
        listCategories(),
        listBrands(),
        listSuppliers(),
        listUnits(),
        listResultCenters(),
      ]);
      return { categories, brands, suppliers, units, centers };
    },
  });

  const maps = useMemo(() => {
    const m = catalogLookups.data;
    if (!m) return null;
    const catByName = new Map(m.categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const brandByName = new Map(m.brands.map((b) => [b.name.trim().toLowerCase(), b.id]));
    const supByName = new Map(m.suppliers.map((s) => [s.name.trim().toLowerCase(), s.id]));
    const unitByCode = new Map(m.units.map((u) => [u.code.trim().toUpperCase(), u.id]));
    const rcByName = new Map(m.centers.map((c) => [c.name.trim().toLowerCase(), c.id]));
    return { catByName, brandByName, supByName, unitByCode, rcByName };
  }, [catalogLookups.data]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!maps || !catalogLookups.data) throw new Error('Mestres ainda carregando');
      const { catByName, brandByName, supByName, unitByCode, rcByName } = maps;
      const errors: string[] = [];
      const inserts: ProductInsert[] = [];

      const col = (r: ImportRow, key: ProductImportFieldKey) => {
        const h = mapping[key];
        return h ? (r[h] ?? '').trim() : '';
      };

      rows.forEach((r, idx) => {
        const line = idx + 2;
        const internal_code = col(r, 'internal_code');
        const description = col(r, 'description');
        if (!internal_code || !description) {
          errors.push(`Linha ${line}: código interno e descrição são obrigatórios.`);
          return;
        }
        const catName = col(r, 'category_name').toLowerCase();
        const category_id = catName ? catByName.get(catName) ?? null : null;
        if (catName && !category_id) errors.push(`Linha ${line}: categoria "${col(r, 'category_name')}" não encontrada.`);

        const brandName = col(r, 'brand_name').toLowerCase();
        const brand_id = brandName ? brandByName.get(brandName) ?? null : null;
        if (brandName && !brand_id) errors.push(`Linha ${line}: marca "${col(r, 'brand_name')}" não encontrada.`);

        const supName = col(r, 'supplier_name').toLowerCase();
        const primary_supplier_id = supName ? supByName.get(supName) ?? null : null;
        if (supName && !primary_supplier_id) errors.push(`Linha ${line}: fornecedor "${col(r, 'supplier_name')}" não encontrado.`);

        const up = col(r, 'unit_purchase_code').toUpperCase();
        const us = col(r, 'unit_sale_code').toUpperCase();
        const unit_purchase_id = up ? unitByCode.get(up) ?? null : null;
        const unit_sale_id = us ? unitByCode.get(us) ?? null : null;
        if (up && !unit_purchase_id) errors.push(`Linha ${line}: unidade compra "${col(r, 'unit_purchase_code')}" inválida.`);
        if (us && !unit_sale_id) errors.push(`Linha ${line}: unidade venda "${col(r, 'unit_sale_code')}" inválida.`);

        const rcn = col(r, 'result_center_name').toLowerCase();
        const result_center_id = rcn ? rcByName.get(rcn) ?? null : null;
        if (rcn && !result_center_id) errors.push(`Linha ${line}: centro resultado "${col(r, 'result_center_name')}" não encontrado.`);

        const abcRaw = col(r, 'abc_class').toUpperCase();
        const abc_class = abcRaw === 'A' || abcRaw === 'B' || abcRaw === 'C' ? abcRaw : null;

        inserts.push({
          internal_code,
          description,
          erp_code: col(r, 'erp_code') || null,
          factory_code: col(r, 'factory_code') || null,
          barcode: col(r, 'barcode') || null,
          category_id,
          subcategory_id: null,
          brand_id,
          primary_supplier_id,
          unit_purchase_id,
          unit_sale_id,
          unit_conversion_factor: parseNum(col(r, 'unit_conversion_factor')) ?? 1,
          management_cost: parseNum(col(r, 'management_cost')),
          management_price: parseNum(col(r, 'management_price')),
          margin_minimum_pct: parseNum(col(r, 'margin_minimum_pct')),
          margin_target_pct: parseNum(col(r, 'margin_target_pct')),
          max_discount_pct: parseNum(col(r, 'max_discount_pct')),
          min_stock: parseNum(col(r, 'min_stock')),
          max_stock: parseNum(col(r, 'max_stock')),
          default_location: col(r, 'default_location') || null,
          result_center_id,
          abc_class,
          is_new_standard: false,
          is_active: true,
        });
      });

      if (errors.length) throw new Error(errors.slice(0, 8).join('\n') + (errors.length > 8 ? `\n…+${errors.length - 8} erros` : ''));

      for (const ins of inserts) {
        await insertProduct(ins);
      }
      return inserts.length;
    },
    onSuccess: async (n) => {
      toast.success(`${n} produto(s) importado(s).`);
      await qc.invalidateQueries({ queryKey: ['products'] });
      setStep(1);
      setRows([]);
      setHeaders([]);
      setMapping({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyParsed = (h: string[], dataRows: ImportRow[], rowCountLabel: string) => {
    if (!h.length) {
      toast.error('Sem cabeçalhos na primeira linha.');
      return;
    }
    setHeaders(h);
    setRows(dataRows);
    const auto: Partial<Record<ProductImportFieldKey, string>> = {};
    for (const def of PRODUCT_IMPORT_FIELD_KEYS) {
      const head = def.label.split('(')[0];
      const labelKey = (head ?? def.label).trim().toLowerCase();
      const match = h.find((x) => x.trim().toLowerCase() === labelKey);
      if (match) auto[def.key] = match;
    }
    setMapping(auto);
    setStep(2);
    toast.success(`${rowCountLabel} linha(s) de dados lidas.`);
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
      void (async () => {
        try {
          const buf = await file.arrayBuffer();
          const { headers: h, rows: dataRows } = parseExcelFirstSheet(buf);
          applyParsed(h, dataRows, String(dataRows.length));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Erro ao ler Excel.');
        }
      })();
      return;
    }

    Papa.parse<ImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const h = res.meta.fields?.filter(Boolean) as string[] | undefined;
        if (!h?.length) {
          toast.error('CSV sem cabeçalho válido.');
          return;
        }
        const dataRows = (res.data as ImportRow[]).filter((row) =>
          Object.values(row).some((v) => String(v).trim() !== ''),
        );
        applyParsed(h, dataRows, String(res.data.length));
      },
      error: (err) => toast.error(err.message),
    });
  };

  const previewOk = Boolean(mapping.internal_code && mapping.description);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/products">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Importar produtos</h1>
        <p className="text-sm text-muted-foreground">
          Podes usar Excel (.xlsx, .xls, .xlsm) ou CSV. No Excel só a primeira folha é lida; a primeira linha tem de ser o cabeçalho (nomes das colunas).
          Depois mapeia cada coluna ao campo do CRM. Categorias, marcas, fornecedores e unidades têm de existir em Estrutura com o mesmo nome/código.
        </p>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Arquivo</CardTitle>
            <CardDescription>
              Excel: exportação “normal” do ERP (ex.: ficheiro em <code className="text-xs">docs/</code> no repositório). CSV:
              UTF-8; vírgula ou ponto-e-vírgula (deteção automática).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </CardContent>
        </Card>
      ) : null}

      {step >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Mapeamento de colunas</CardTitle>
            <CardDescription>Cada campo aponta para uma coluna do ficheiro (cabeçalho da primeira linha).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PRODUCT_IMPORT_FIELD_KEYS.map((f) => (
              <div key={f.key} className="grid gap-1 sm:grid-cols-[1fr_1.2fr] sm:items-center">
                <Label className="text-sm">
                  {f.label}
                  {f.key === 'internal_code' || f.key === 'description' ? ' *' : ''}
                </Label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMapping((m) => {
                      if (!v) {
                        const { [f.key]: _, ...rest } = m;
                        return rest;
                      }
                      return { ...m, [f.key]: v };
                    });
                  }}
                >
                  <option value="">— ignorar —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Outro arquivo
              </Button>
              <Button type="button" disabled={!previewOk} onClick={() => setStep(3)}>
                Pré-visualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Confirmar importação</CardTitle>
            <CardDescription>{rows.length} linha(s) serão inseridas como produtos gerenciais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-60 overflow-auto rounded-md border text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-surface-muted">
                    {['#', mapping.internal_code, mapping.description].filter(Boolean).map((h) => (
                      <th key={String(h)} className="p-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2 font-mono">{mapping.internal_code ? r[mapping.internal_code] : ''}</td>
                      <td className="p-2">{mapping.description ? r[mapping.description] : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 8 ? <p className="text-xs text-muted-foreground">Mostrando 8 primeiras linhas.</p> : null}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Ajustar mapeamento
              </Button>
              <Button type="button" disabled={importMutation.isPending || !catalogLookups.isSuccess} onClick={() => importMutation.mutate()}>
                {importMutation.isPending ? 'Importando…' : 'Importar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
