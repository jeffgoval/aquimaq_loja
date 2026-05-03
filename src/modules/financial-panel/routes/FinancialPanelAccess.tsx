import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** PRD Fase 10 — painel financeiro + contábil: admin, gestor, financeiro. */
export function FinancialPanelAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'financeiro']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
