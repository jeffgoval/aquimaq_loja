import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2, Sparkles } from 'lucide-react';
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
  Label,
  Textarea,
} from '@ds/primitives';
import { FormField } from '@shared/components/forms/FormField';
import { DataTable } from '@shared/components/tables/DataTable';
import type { Database } from '@shared/types/database';
import {
  nameDescriptionActiveSchema,
  type NameDescriptionActiveInput,
  supplierFormSchema,
  type SupplierFormInput,
  unitFormSchema,
  type UnitFormInput,
  subcategoryFormSchema,
  type SubcategoryFormInput,
} from '../schemas/structureSchemas';
import type { StructureSegmentConfig } from '../structureConfig';
import {
  deleteStructureRow,
  insertStructureRow,
  listStructureRows,
  seedCategoriesFromPrd,
  seedResultCentersFromPrd,
  updateStructureRow,
  type StructureTableName,
} from '../services/structureApi';
import { AuditTimeline } from './AuditTimeline';

type RowFor<T extends StructureTableName> = Database['public']['Tables'][T]['Row'];

interface StructureEntityCrudProps {
  config: StructureSegmentConfig;
}

export function StructureEntityCrud({ config }: StructureEntityCrudProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['structure', config.table],
    queryFn: () =>
      listStructureRows(config.table, {
        column: config.order.column as never,
        ascending: config.order.ascending ?? true,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['structure', 'product_categories'],
    queryFn: () => listStructureRows('product_categories', { column: 'name' }),
    enabled: config.formVariant === 'subcategory',
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['structure', config.table] });
    if (editingId) void qc.invalidateQueries({ queryKey: ['audit_logs', config.table, editingId] });
  };

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (config.table === 'result_centers') return seedResultCentersFromPrd();
      if (config.table === 'product_categories') return seedCategoriesFromPrd();
      throw new Error('Seed PRD não disponível para esta lista.');
    },
    onSuccess: (out) => {
      if (out.inserted === 0) {
        toast.info('Nada novo para inserir: os nomes do PRD §10 já constam na base.');
      } else {
        toast.success(`${out.inserted} registro(s) do PRD §10 inserido(s).`);
      }
      void qc.invalidateQueries({ queryKey: ['structure', config.table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameDescForm = useForm<NameDescriptionActiveInput>({
    resolver: zodResolver(nameDescriptionActiveSchema),
    defaultValues: { name: '', description: '', is_active: true },
  });

  const supplierForm = useForm<SupplierFormInput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      document: '',
      email: '',
      phone: '',
      notes: '',
      is_active: true,
    },
  });

  const unitForm = useForm<UnitFormInput>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { code: '', name: '', description: '', is_active: true },
  });

  const subForm = useForm<SubcategoryFormInput>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: { category_id: '', name: '', description: '', is_active: true },
  });

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    nameDescForm.reset({ name: '', description: '', is_active: true });
    supplierForm.reset({
      name: '',
      document: '',
      email: '',
      phone: '',
      notes: '',
      is_active: true,
    });
    unitForm.reset({ code: '', name: '', description: '', is_active: true });
    subForm.reset({ category_id: '', name: '', description: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (row: RowFor<typeof config.table>) => {
    setMode('edit');
    setEditingId(row.id);
    if (config.formVariant === 'nameDesc') {
      const r = row as RowFor<'result_centers'>;
      nameDescForm.reset({
        name: r.name,
        description: r.description ?? '',
        is_active: r.is_active,
      });
    } else if (config.formVariant === 'supplier') {
      const r = row as RowFor<'suppliers'>;
      supplierForm.reset({
        name: r.name,
        document: r.document ?? '',
        email: r.email ?? '',
        phone: r.phone ?? '',
        notes: r.notes ?? '',
        is_active: r.is_active,
      });
    } else if (config.formVariant === 'unit') {
      const r = row as RowFor<'units'>;
      unitForm.reset({
        code: r.code,
        name: r.name,
        description: r.description ?? '',
        is_active: r.is_active,
      });
    } else {
      const r = row as RowFor<'subcategories'>;
      subForm.reset({
        category_id: r.category_id,
        name: r.name,
        description: r.description ?? '',
        is_active: r.is_active,
      });
    }
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config.formVariant === 'nameDesc') {
        const v = nameDescForm.getValues();
        const payload = {
          name: v.name.trim(),
          description: v.description?.trim() ? v.description.trim() : null,
          is_active: v.is_active,
        };
        if (mode === 'create') {
          await insertStructureRow(config.table, payload);
        } else if (editingId) {
          await updateStructureRow(config.table, editingId, payload);
        }
      } else if (config.formVariant === 'supplier') {
        const v = supplierForm.getValues();
        const payload = {
          name: v.name.trim(),
          document: v.document?.trim() || null,
          email: v.email?.trim() || null,
          phone: v.phone?.trim() || null,
          notes: v.notes?.trim() || null,
          is_active: v.is_active,
        };
        if (mode === 'create') await insertStructureRow('suppliers', payload);
        else if (editingId) await updateStructureRow('suppliers', editingId, payload);
      } else if (config.formVariant === 'unit') {
        const v = unitForm.getValues();
        const payload = {
          code: v.code.trim(),
          name: v.name.trim(),
          description: v.description?.trim() ? v.description.trim() : null,
          is_active: v.is_active,
        };
        if (mode === 'create') await insertStructureRow('units', payload);
        else if (editingId) await updateStructureRow('units', editingId, payload);
      } else {
        const v = subForm.getValues();
        const payload = {
          category_id: v.category_id,
          name: v.name.trim(),
          description: v.description?.trim() ? v.description.trim() : null,
          is_active: v.is_active,
        };
        if (mode === 'create') await insertStructureRow('subcategories', payload);
        else if (editingId) await updateStructureRow('subcategories', editingId, payload);
      }
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Registro criado.' : 'Registro atualizado.');
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStructureRow(config.table, id),
    onSuccess: () => {
      toast.success('Registro excluído.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const codeCol: ColumnDef<RowFor<typeof config.table>, unknown> = {
    accessorKey: 'code',
    header: 'Código',
  };
  const nameCol: ColumnDef<RowFor<typeof config.table>, unknown> = {
    accessorKey: 'name',
    header: 'Nome',
  };

  const leadingCols: ColumnDef<RowFor<typeof config.table>, unknown>[] =
    config.formVariant === 'unit' ? [codeCol, nameCol] : [nameCol];

  const columns: ColumnDef<RowFor<typeof config.table>, unknown>[] = [
    ...leadingCols,
    ...(config.formVariant === 'subcategory'
      ? [
          {
            id: 'category',
            header: 'Categoria',
            cell: ({ row }) => {
              const r = row.original as RowFor<'subcategories'>;
              const cat = categoriesQuery.data?.find((c) => c.id === r.category_id);
              return <span className="text-muted-foreground">{cat?.name ?? r.category_id}</span>;
            },
          } satisfies ColumnDef<RowFor<typeof config.table>, unknown>,
        ]
      : []),
    ...(config.formVariant === 'supplier'
      ? [
          {
            id: 'email',
            header: 'Email',
            cell: ({ row }) => {
              const r = row.original as RowFor<'suppliers'>;
              return <span className="text-muted-foreground">{r.email?.trim() ? r.email : '—'}</span>;
            },
          } satisfies ColumnDef<RowFor<typeof config.table>, unknown>,
        ]
      : []),
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) =>
        (row.original as { is_active: boolean }).is_active ? (
          <Badge variant="success">Ativo</Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Editar"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-danger hover:text-danger"
            aria-label="Excluir"
            onClick={() => {
              if (window.confirm('Excluir este registro?')) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const onSubmitForm = () => {
    if (config.formVariant === 'nameDesc') void nameDescForm.handleSubmit(() => saveMutation.mutate())();
    else if (config.formVariant === 'supplier') void supplierForm.handleSubmit(() => saveMutation.mutate())();
    else if (config.formVariant === 'unit') void unitForm.handleSubmit(() => saveMutation.mutate())();
    else void subForm.handleSubmit(() => saveMutation.mutate())();
  };

  const rows = (listQuery.data ?? []) as RowFor<typeof config.table>[];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.seedPrd ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={seedMutation.isPending}
              onClick={() => seedMutation.mutate()}
            >
              <Sparkles className="h-4 w-4" />
              Modelo PRD §10
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={listQuery.isLoading}
          getRowId={(r) => r.id}
        />
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Novo registro' : 'Editar registro'}</DialogTitle>
            <DialogDescription>{config.title}</DialogDescription>
          </DialogHeader>

          {config.formVariant === 'nameDesc' ? (
            <form className="space-y-3" onSubmit={nameDescForm.handleSubmit(() => saveMutation.mutate())}>
              <FormField id="fd-name" label="Nome" error={nameDescForm.formState.errors.name?.message}>
                <Input id="fd-name" {...nameDescForm.register('name')} autoComplete="off" />
              </FormField>
              <FormField
                id="fd-desc"
                label="Descrição"
                error={nameDescForm.formState.errors.description?.message}
              >
                <Textarea id="fd-desc" rows={3} {...nameDescForm.register('description')} />
              </FormField>
              <div className="flex items-center gap-2">
                <Controller
                  control={nameDescForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <>
                      <input
                        type="checkbox"
                        id="fd-active"
                        className="h-4 w-4 rounded border-border"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <Label htmlFor="fd-active">Ativo</Label>
                    </>
                  )}
                />
              </div>
            </form>
          ) : null}

          {config.formVariant === 'supplier' ? (
            <form className="space-y-3" onSubmit={supplierForm.handleSubmit(() => saveMutation.mutate())}>
              <FormField id="fs-name" label="Nome" error={supplierForm.formState.errors.name?.message}>
                <Input id="fs-name" {...supplierForm.register('name')} autoComplete="organization" />
              </FormField>
              <FormField id="fs-doc" label="Documento" error={supplierForm.formState.errors.document?.message}>
                <Input id="fs-doc" {...supplierForm.register('document')} />
              </FormField>
              <FormField id="fs-email" label="Email" error={supplierForm.formState.errors.email?.message}>
                <Input id="fs-email" type="email" {...supplierForm.register('email')} />
              </FormField>
              <FormField id="fs-phone" label="Telefone" error={supplierForm.formState.errors.phone?.message}>
                <Input id="fs-phone" {...supplierForm.register('phone')} />
              </FormField>
              <FormField id="fs-notes" label="Observações" error={supplierForm.formState.errors.notes?.message}>
                <Textarea id="fs-notes" rows={2} {...supplierForm.register('notes')} />
              </FormField>
              <div className="flex items-center gap-2">
                <Controller
                  control={supplierForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <>
                      <input
                        type="checkbox"
                        id="fs-active"
                        className="h-4 w-4 rounded border-border"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <Label htmlFor="fs-active">Ativo</Label>
                    </>
                  )}
                />
              </div>
            </form>
          ) : null}

          {config.formVariant === 'unit' ? (
            <form className="space-y-3" onSubmit={unitForm.handleSubmit(() => saveMutation.mutate())}>
              <FormField id="fu-code" label="Código" error={unitForm.formState.errors.code?.message}>
                <Input id="fu-code" {...unitForm.register('code')} autoComplete="off" />
              </FormField>
              <FormField id="fu-name" label="Nome" error={unitForm.formState.errors.name?.message}>
                <Input id="fu-name" {...unitForm.register('name')} />
              </FormField>
              <FormField id="fu-desc" label="Descrição" error={unitForm.formState.errors.description?.message}>
                <Textarea id="fu-desc" rows={2} {...unitForm.register('description')} />
              </FormField>
              <div className="flex items-center gap-2">
                <Controller
                  control={unitForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <>
                      <input
                        type="checkbox"
                        id="fu-active"
                        className="h-4 w-4 rounded border-border"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <Label htmlFor="fu-active">Ativo</Label>
                    </>
                  )}
                />
              </div>
            </form>
          ) : null}

          {config.formVariant === 'subcategory' ? (
            <form className="space-y-3" onSubmit={subForm.handleSubmit(() => saveMutation.mutate())}>
              <FormField
                id="fsub-cat"
                label="Categoria"
                error={subForm.formState.errors.category_id?.message}
              >
                <select
                  id="fsub-cat"
                  className="flex h-9 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...subForm.register('category_id')}
                >
                  <option value="">Selecione…</option>
                  {(categoriesQuery.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="fsub-name" label="Nome" error={subForm.formState.errors.name?.message}>
                <Input id="fsub-name" {...subForm.register('name')} />
              </FormField>
              <FormField id="fsub-desc" label="Descrição" error={subForm.formState.errors.description?.message}>
                <Textarea id="fsub-desc" rows={2} {...subForm.register('description')} />
              </FormField>
              <div className="flex items-center gap-2">
                <Controller
                  control={subForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <>
                      <input
                        type="checkbox"
                        id="fsub-active"
                        className="h-4 w-4 rounded border-border"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <Label htmlFor="fsub-active">Ativo</Label>
                    </>
                  )}
                />
              </div>
            </form>
          ) : null}

          {mode === 'edit' ? (
            <AuditTimeline entityType={config.table} entityId={editingId} enabled={dialogOpen} />
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saveMutation.isPending} onClick={onSubmitForm}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
