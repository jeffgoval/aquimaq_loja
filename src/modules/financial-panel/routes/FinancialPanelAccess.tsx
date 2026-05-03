import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** Painel financeiro e contábil: administrador, gestor ou financeiro. */
export function FinancialPanelAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'financeiro']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
