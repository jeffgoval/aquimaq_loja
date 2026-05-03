import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ds/primitives';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { ROLE_LABELS } from '@shared/types/database';

/**
 * Stub for Phase 0. Real Painel da Casa lands in Phase 4 (PRD §9):
 * cards de % padrão novo, alertas críticos, ações da semana, evolução por área.
 */
export function DashboardPage() {
  const user = useCurrentUser();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel da Casa</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {user.fullName}. Você está autenticado como{' '}
          <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Fase 0 concluída</CardTitle>
            <CardDescription>Fundação técnica, auth e shell</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Próxima fase: <span className="font-medium text-foreground">Estrutura Operacional</span> —
            CRUDs de centros de resultado, categorias, marcas, fornecedores e unidades.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schema Supabase</CardTitle>
            <CardDescription>Vocabulário PRD aplicado</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Roles unificadas e RLS reescrita. Helpers <code>has_role</code> e{' '}
            <code>is_admin_or_gestor</code> disponíveis para futuras tabelas.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos cards</CardTitle>
            <CardDescription>A construir nas fases 1–4</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            % operação no padrão novo · alertas críticos · ações da semana · evolução por área.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
