import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** PRD §14 — recebimento gerencial: admin, gestor, recebimento. */
export function ReceivingAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'recebimento']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
