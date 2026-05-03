import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** PRD — painel gerencial: admin, gestor, financeiro. */
export function ManagementPanelAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'financeiro']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
