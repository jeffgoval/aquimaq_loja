import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { usePermission } from '@shared/components/auth/RoleGate';
import {
  deleteImprovement,
  IMPROVEMENT_STATUSES,
  insertImprovement,
  listImprovements,
  updateImprovement,
  type ImprovementListRow,
} from '../services/improvementsApi';

const formSchema = z.object({
  title: z.string().min(2),
  problem_statement: z.string().optional(),
  status: z.enum(IMPROVEMENT_STATUSES),
  plan_notes: z.string().optional(),
  do_notes: z.string().optional(),
  check_notes: z.string().optional(),
  act_notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    brainstorm: 'Brainstorm',
    plan: 'Plan',
    do: 'Do',
    check: 'Check',
    act: 'Act',
    closed: 'Encerrado',
  };
  return m[s] ?? s;
}

function statusVariant(s: string): 'default' | 'secondary' | 'success' {
  if (s === 'closed') return 'success';
  if (s === 'brainstorm') return 'secondary';
  return 'default';
}

export function ImprovementsPage() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const canManage = usePermission(['admin', 'gestor']);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ImprovementListRow | null>(null);

  const listQ = useQuery({ queryKey: ['improvements'], queryFn: listImprovements });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      problem_statement: '',
      status: 'plan',
      plan_notes: '',
      do_notes: '',
      check_notes: '',
      act_notes: '',
    },
  });

  const saveMut = useMutation({
    mutationFn: async (v: FormValues) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      if (edit) {
        return updateImprovement(edit.id, {
          title: v.title,
          problem_statement: v.problem_statement || null,
          status: v.status,
          plan_notes: v.plan_notes || null,
          do_notes: v.do_notes || null,
          check_notes: v.check_notes || null,
          act_notes: v.act_notes || null,
        });
      }
      return insertImprovement({
        title: v.title,
        problem_statement: v.problem_statement || null,
        status: v.status,
        owner_id: user.id,
        plan_notes: v.plan_notes || null,
        do_notes: v.do_notes || null,
        check_notes: v.check_notes || null,
        act_notes: v.act_notes || null,
      });
    },
    onSuccess: () => {
      toast.success(edit ? 'Melhoria atualizada.' : 'Melhoria criada.');
      setOpen(false);
      setEdit(null);
      form.reset({
        title: '',
        problem_statement: '',
        status: 'plan',
        plan_notes: '',
        do_notes: '',
        check_notes: '',
        act_notes: '',
      });
      void qc.invalidateQueries({ queryKey: ['improvements'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteImprovement,
    onSuccess: () => {
      toast.success('Removido.');
      void qc.invalidateQueries({ queryKey: ['improvements'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: ColumnDef<ImprovementListRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Título',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.title}</span>
            {row.original.problem_statement ? (
              <span className="text-xs text-muted-foreground line-clamp-2">{row.original.problem_statement}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Fase PDCA',
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{statusLabel(row.original.status)}</Badge>
        ),
      },
      {
        id: 'owner',
        header: 'Dono',
        cell: ({ row }) => <span className="text-sm">{row.original.owner?.full_name ?? '—'}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const mine = user?.id === row.original.owner_id;
          const canEdit = canManage || mine;
          return (
            <div className="flex justify-end gap-1">
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEdit(row.original);
                    form.reset({
                      title: row.original.title,
                      problem_statement: row.original.problem_statement ?? '',
                      status: row.original.status as FormValues['status'],
                      plan_notes: row.original.plan_notes ?? '',
                      do_notes: row.original.do_notes ?? '',
                      check_notes: row.original.check_notes ?? '',
                      act_notes: row.original.act_notes ?? '',
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (confirm('Remover esta melhoria?')) delMut.mutate(row.original.id);
                  }}
                  disabled={delMut.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canManage, delMut, form, user?.id],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Melhorias (PDCA leve)</h1>
          <p className="text-sm text-muted-foreground">
            Registo simples por fases: plano, execução, verificação e ação — sem burocracia extra.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEdit(null);
            form.reset({
              title: '',
              problem_statement: '',
              status: 'plan',
              plan_notes: '',
              do_notes: '',
              check_notes: '',
              act_notes: '',
            });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Nova melhoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
          <CardDescription>Dono pode editar; admin/gestor removem qualquer registo.</CardDescription>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : listQ.isError ? (
            <p className="text-sm text-destructive">
              {listQ.error instanceof Error ? listQ.error.message : 'Erro'}
            </p>
          ) : (
            <DataTable columns={columns} data={listQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? 'Editar melhoria' : 'Nova melhoria'}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={form.handleSubmit((v) => saveMut.mutate(v))}>
            <FormField id="imp-title" label="Título" error={form.formState.errors.title?.message}>
              <Input id="imp-title" {...form.register('title')} />
            </FormField>
            <FormField id="imp-problem" label="Problema / oportunidade">
              <Textarea id="imp-problem" rows={2} {...form.register('problem_statement')} />
            </FormField>
            <FormField id="imp-status" label="Fase">
              <select
                id="imp-status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                {...form.register('status')}
              >
                {IMPROVEMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {statusLabel(st)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="imp-plan" label="Plan (notas)">
              <Textarea id="imp-plan" rows={2} {...form.register('plan_notes')} />
            </FormField>
            <FormField id="imp-do" label="Do (notas)">
              <Textarea id="imp-do" rows={2} {...form.register('do_notes')} />
            </FormField>
            <FormField id="imp-check" label="Check (notas)">
              <Textarea id="imp-check" rows={2} {...form.register('check_notes')} />
            </FormField>
            <FormField id="imp-act" label="Act (notas)">
              <Textarea id="imp-act" rows={2} {...form.register('act_notes')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
