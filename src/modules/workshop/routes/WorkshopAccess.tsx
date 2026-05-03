import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** PRD §15 — oficina gerencial: admin, gestor, oficina. */
export function WorkshopAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'oficina']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
