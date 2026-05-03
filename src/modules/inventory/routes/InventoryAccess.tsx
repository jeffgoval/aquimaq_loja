import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** PRD §12 — estoque gerencial: admin, gestor, estoque. */
export function InventoryAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'estoque']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
