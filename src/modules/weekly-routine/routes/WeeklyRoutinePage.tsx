import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { CheckCircle2, CopyPlus, Pencil } from 'lucide-react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@ds/primitives';
import { FormField } from '@shared/components/forms/FormField';
import { DataTable } from '@shared/components/tables/DataTable';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { listTasks, type TaskListRow } from '@modules/tasks/services/tasksApi';
import {
  insertWeeklyRoutineTemplate,
  listWeeklyRoutineLogs,
  listWeeklyRoutineTemplates,
  seedWeeklyLogsFromTemplates,
  updateWeeklyRoutineLog,
  updateWeeklyRoutineTemplate,
  weekStartMondayFromDate,
  weekdayLabel,
  type WeeklyRoutineLogListRow,
  type WeeklyRoutineTemplateRow,
} from '../services/weeklyRoutineApi';

const templateSchema = z.object({
  weekday: z.coerce.number().min(1).max(7),
  title: z.string().min(2, 'Título obrigatório'),
  description: z.string().optional(),
  sort_order: z.coerce.number().int().default(0),
});

type TemplateForm = z.infer<typeof templateSchema>;

export function WeeklyRoutinePage() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [weekInput, setWeekInput] = useState(() => weekStartMondayFromDate(new Date()));
  const [tplOpen, setTplOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<WeeklyRoutineTemplateRow | null>(null);
  const [linkLog, setLinkLog] = useState<WeeklyRoutineLogListRow | null>(null);
  const [linkTaskId, setLinkTaskId] = useState<string>('');

  const templatesQ = useQuery({ queryKey: ['weekly-routine-templates'], queryFn: listWeeklyRoutineTemplates });
  const logsQ = useQuery({
    queryKey: ['weekly-routine-logs', weekInput],
    queryFn: () => listWeeklyRoutineLogs(weekInput),
  });
  const tasksQ = useQuery({ queryKey: ['tasks-for-link'], queryFn: listTasks });

  const seedMut = useMutation({
    mutationFn: () => seedWeeklyLogsFromTemplates(weekInput, user?.id ?? null),
    onSuccess: (n) => {
      toast.success(n ? `${n} registo(s) criados a partir da pauta.` : 'Sem novos itens (já existiam para esta semana).');
      void qc.invalidateQueries({ queryKey: ['weekly-routine-logs', weekInput] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) =>
      updateWeeklyRoutineLog(id, { completed_at: new Date().toISOString() }),
    onSuccess: () => {
      toast.success('Marcado como concluído.');
      void qc.invalidateQueries({ queryKey: ['weekly-routine-logs', weekInput] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkTaskMut = useMutation({
    mutationFn: ({ logId, taskId }: { logId: string; taskId: string | null }) =>
      updateWeeklyRoutineLog(logId, { related_task_id: taskId }),
    onSuccess: () => {
      toast.success('Tarefa associada.');
      setLinkLog(null);
      setLinkTaskId('');
      void qc.invalidateQueries({ queryKey: ['weekly-routine-logs', weekInput] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (linkLog) setLinkTaskId(linkLog.related_task_id ?? '');
  }, [linkLog]);

  const tplForm = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { weekday: 1, title: '', description: '', sort_order: 0 },
  });

  const saveTplMut = useMutation({
    mutationFn: async (v: TemplateForm) => {
      if (editTpl) {
        return updateWeeklyRoutineTemplate(editTpl.id, {
          weekday: v.weekday,
          title: v.title,
          description: v.description || null,
          sort_order: v.sort_order,
        });
      }
      return insertWeeklyRoutineTemplate({
        weekday: v.weekday,
        title: v.title,
        description: v.description || null,
        sort_order: v.sort_order,
        is_active: true,
      });
    },
    onSuccess: () => {
      toast.success(editTpl ? 'Pauta atualizada.' : 'Item da pauta criado.');
      setTplOpen(false);
      setEditTpl(null);
      tplForm.reset({ weekday: 1, title: '', description: '', sort_order: 0 });
      void qc.invalidateQueries({ queryKey: ['weekly-routine-templates'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTplMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateWeeklyRoutineTemplate(id, { is_active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['weekly-routine-templates'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const logColumns: ColumnDef<WeeklyRoutineLogListRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Item',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.title}</span>
            {row.original.notes ? (
              <span className="text-xs text-muted-foreground line-clamp-2">{row.original.notes}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'task',
        header: 'Tarefa',
        cell: ({ row }) =>
          row.original.related_task ? (
            <Link to="/tasks" className="text-sm text-primary underline-offset-4 hover:underline">
              {row.original.related_task.title}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: 'completed_at',
        header: 'Estado',
        cell: ({ row }) =>
          row.original.completed_at ? (
            <Badge variant="success">Concluído</Badge>
          ) : (
            <Badge variant="secondary">Aberto</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => setLinkLog(row.original)}>
              Tarefa
            </Button>
            {!row.original.completed_at ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => completeMut.mutate(row.original.id)}
                disabled={completeMut.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [completeMut],
  );

  const tplColumns: ColumnDef<WeeklyRoutineTemplateRow>[] = useMemo(
    () => [
      {
        accessorKey: 'weekday',
        header: 'Dia',
        cell: ({ row }) => weekdayLabel(row.original.weekday),
      },
      { accessorKey: 'title', header: 'Título' },
      {
        accessorKey: 'is_active',
        header: 'Ativo',
        cell: ({ row }) => (row.original.is_active ? <Badge variant="success">Sim</Badge> : <Badge>Off</Badge>),
      },
      {
        id: 'act',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditTpl(row.original);
                tplForm.reset({
                  weekday: row.original.weekday,
                  title: row.original.title,
                  description: row.original.description ?? '',
                  sort_order: row.original.sort_order,
                });
                setTplOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                toggleTplMut.mutate({ id: row.original.id, is_active: !row.original.is_active })
              }
            >
              {row.original.is_active ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        ),
      },
    ],
    [tplForm, toggleTplMut],
  );

  const taskOptions: TaskListRow[] = tasksQ.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Rotina semanal</h1>
          <p className="text-sm text-muted-foreground">
            Pauta fixa (modelo), registo por semana e vínculo opcional a tarefas.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="week-start">
              Semana (início segunda)
            </label>
            <Input
              id="week-start"
              type="date"
              value={weekInput}
              onChange={(e) => setWeekInput(e.target.value || weekStartMondayFromDate(new Date()))}
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            <CopyPlus className="mr-1 h-4 w-4" />
            Gerar da pauta
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Registo da semana</CardTitle>
            <CardDescription>Itens gerados ou manuais para {weekInput}.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {logsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : logsQ.isError ? (
            <p className="text-sm text-destructive">
              {logsQ.error instanceof Error ? logsQ.error.message : 'Erro'}
            </p>
          ) : (
            <DataTable columns={logColumns} data={logsQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Pauta fixa</CardTitle>
            <CardDescription>Modelo reutilizado ao carregar &quot;Gerar da pauta&quot;.</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditTpl(null);
              tplForm.reset({ weekday: 1, title: '', description: '', sort_order: 0 });
              setTplOpen(true);
            }}
          >
            Novo item
          </Button>
        </CardHeader>
        <CardContent>
          {templatesQ.isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : templatesQ.isError ? (
            <p className="text-sm text-destructive">
              {templatesQ.error instanceof Error ? templatesQ.error.message : 'Erro'}
            </p>
          ) : (
            <DataTable columns={tplColumns} data={templatesQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTpl ? 'Editar pauta' : 'Novo item da pauta'}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={tplForm.handleSubmit((v) => saveTplMut.mutate(v))}
          >
            <FormField id="tpl-weekday" label="Dia da semana (1=seg … 7=dom)">
              <Input id="tpl-weekday" type="number" min={1} max={7} {...tplForm.register('weekday')} />
            </FormField>
            <FormField id="tpl-title" label="Título" error={tplForm.formState.errors.title?.message}>
              <Input id="tpl-title" {...tplForm.register('title')} />
            </FormField>
            <FormField id="tpl-desc" label="Descrição">
              <Textarea id="tpl-desc" rows={3} {...tplForm.register('description')} />
            </FormField>
            <FormField id="tpl-order" label="Ordem">
              <Input id="tpl-order" type="number" {...tplForm.register('sort_order')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTplOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveTplMut.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!linkLog}
        onOpenChange={(o) => {
          if (!o) {
            setLinkLog(null);
            setLinkTaskId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar tarefa</DialogTitle>
          </DialogHeader>
          {linkLog ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">{linkLog.title}</p>
              <FormField id="log-link-task" label="Tarefa">
                <select
                  id="log-link-task"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={linkTaskId}
                  onChange={(e) => setLinkTaskId(e.target.value)}
                >
                  <option value="">— Nenhuma —</option>
                  {taskOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </FormField>
              {tasksQ.isLoading ? <p className="text-xs text-muted-foreground">A carregar tarefas…</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLinkLog(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    linkTaskMut.mutate({
                      logId: linkLog.id,
                      taskId: linkTaskId ? linkTaskId : null,
                    })
                  }
                  disabled={linkTaskMut.isPending}
                >
                  Guardar vínculo
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
