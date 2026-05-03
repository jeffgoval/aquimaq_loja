import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { FormField } from '@shared/components/forms/FormField';
import { DataTable } from '@shared/components/tables/DataTable';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { usePermission } from '@shared/components/auth/RoleGate';
import { listProfilesForResponsible } from '@modules/products/services/productsApi';
import { completeTask, deleteTask, insertTask, listTasks, updateTask, type TaskListRow } from '../services/tasksApi';

const TASK_PRIORITIES = ['critica', 'alta', 'media', 'baixa'] as const;
const TASK_STATUSES = [
  'aberta',
  'em_andamento',
  'aguardando_terceiro',
  'concluida',
  'atrasada',
  'cancelada',
] as const;

const taskFormSchema = z.object({
  title: z.string().min(2, 'Título obrigatório'),
  description: z.string().optional(),
  origin: z.string().min(1),
  module: z.string().optional(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  responsible_user_id: z.string().min(1, 'Responsável obrigatório').uuid(),
  due_date_local: z.string().min(1, 'Prazo obrigatório'),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

function toIsoFromLocal(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function toLocalInput(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    critica: 'Crítica',
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
  };
  return map[p] ?? p;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    aberta: 'Aberta',
    em_andamento: 'Em andamento',
    aguardando_terceiro: 'Aguardando terceiro',
    concluida: 'Concluída',
    atrasada: 'Atrasada',
    cancelada: 'Cancelada',
  };
  return map[s] ?? s;
}

function statusVariant(s: string): 'success' | 'secondary' | 'danger' | 'default' {
  if (s === 'concluida') return 'success';
  if (s === 'cancelada') return 'secondary';
  if (s === 'atrasada') return 'danger';
  return 'default';
}

export function TasksPage() {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const canManageAny = usePermission(['admin', 'gestor']);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskListRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const tasksQuery = useQuery({ queryKey: ['tasks', 'list'], queryFn: listTasks });
  const profilesQuery = useQuery({ queryKey: ['profiles', 'responsible'], queryFn: listProfilesForResponsible });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      origin: 'manual',
      module: '',
      priority: 'media',
      status: 'aberta',
      responsible_user_id: user?.id ?? '',
      due_date_local: toLocalInput(new Date(Date.now() + 7 * 86400000).toISOString()),
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: '',
      description: '',
      origin: 'manual',
      module: '',
      priority: 'media',
      status: 'aberta',
      responsible_user_id: user?.id ?? '',
      due_date_local: toLocalInput(new Date(Date.now() + 7 * 86400000).toISOString()),
    });
    setDialogOpen(true);
  };

  const openEdit = (row: TaskListRow) => {
    setEditing(row);
    form.reset({
      title: row.title,
      description: row.description ?? '',
      origin: row.origin,
      module: row.module ?? '',
      priority: row.priority as TaskFormValues['priority'],
      status: row.status as TaskFormValues['status'],
      responsible_user_id: row.responsible_user_id,
      due_date_local: toLocalInput(row.due_date),
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (v: TaskFormValues) => {
      const due = toIsoFromLocal(v.due_date_local);
      const moduleVal = v.module?.trim() || null;
      if (editing) {
        return updateTask(editing.id, {
          title: v.title.trim(),
          description: v.description?.trim() || null,
          origin: v.origin.trim(),
          module: moduleVal,
          priority: v.priority,
          status: v.status,
          responsible_user_id: v.responsible_user_id,
          due_date: due,
        });
      }
      if (!user?.id) throw new Error('Sessão inválida.');
      return insertTask({
        title: v.title.trim(),
        description: v.description?.trim() || null,
        origin: v.origin.trim(),
        module: moduleVal,
        priority: v.priority,
        status: v.status,
        responsible_user_id: v.responsible_user_id,
        due_date: due,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'Tarefa atualizada.' : 'Tarefa criada.');
      setDialogOpen(false);
      void qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeTask(id),
    onSuccess: () => {
      toast.success('Tarefa concluída.');
      void qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      toast.success('Tarefa eliminada.');
      void qc.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredRows = useMemo(() => {
    const rows = tasksQuery.data ?? [];
    if (!statusFilter) return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [tasksQuery.data, statusFilter]);

  const columns: ColumnDef<TaskListRow>[] = [
    { accessorKey: 'title', header: 'Título' },
    {
      id: 'resp',
      header: 'Responsável',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.responsible?.full_name ?? '—'}</span>,
    },
    {
      id: 'due',
      header: 'Prazo',
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">{new Date(row.original.due_date).toLocaleString('pt-BR')}</span>
      ),
    },
    {
      id: 'prio',
      header: 'Prioridade',
      cell: ({ row }) => <Badge variant="secondary">{priorityLabel(row.original.priority)}</Badge>,
    },
    {
      id: 'origin',
      header: 'Origem',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.origin}
          {row.original.source_key ? ` · ${row.original.source_key}` : ''}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{statusLabel(row.original.status)}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const r = row.original;
        const canComplete =
          r.status !== 'concluida' &&
          r.status !== 'cancelada' &&
          (r.responsible_user_id === user?.id || canManageAny);
        const canEdit = r.responsible_user_id === user?.id || canManageAny;
        const canDelete = canManageAny;
        return (
          <div className="flex flex-wrap gap-1">
            {canEdit ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(r)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            ) : null}
            {canComplete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-emerald-700"
                onClick={() => completeMutation.mutate(r.id)}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluir
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-danger hover:text-danger"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm('Eliminar esta tarefa permanentemente?')) deleteMutation.mutate(r.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            Responsável, prazo, prioridade e origem (PRD §16). Tarefas podem ser geradas pelo cadastro (ex.: sem
            localização).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Filtrar estado
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>Inclui tarefas manuais e automáticas ligadas a entidades.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredRows} isLoading={tasksQuery.isLoading} emptyMessage="Nenhuma tarefa." />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription>Campos obrigatórios: título, responsável, prazo e prioridade.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormField id="t-title" label="Título" error={form.formState.errors.title?.message}>
              <Input id="t-title" {...form.register('title')} />
            </FormField>
            <FormField id="t-desc" label="Descrição" error={form.formState.errors.description?.message}>
              <Textarea id="t-desc" rows={3} {...form.register('description')} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="t-origin" label="Origem" error={form.formState.errors.origin?.message}>
                <Input id="t-origin" {...form.register('origin')} />
              </FormField>
              <FormField id="t-module" label="Módulo" error={form.formState.errors.module?.message}>
                <Input id="t-module" placeholder="opcional" {...form.register('module')} />
              </FormField>
            </div>
            <FormField id="t-resp" label="Responsável" error={form.formState.errors.responsible_user_id?.message}>
              <select
                id="t-resp"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('responsible_user_id')}
              >
                {(profilesQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="t-due" label="Prazo" error={form.formState.errors.due_date_local?.message}>
                <Input id="t-due" type="datetime-local" {...form.register('due_date_local')} />
              </FormField>
              <FormField id="t-prio" label="Prioridade" error={form.formState.errors.priority?.message}>
                <select
                  id="t-prio"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register('priority')}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabel(p)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {editing ? (
              <FormField id="t-status" label="Estado" error={form.formState.errors.status?.message}>
                <select
                  id="t-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register('status')}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
