import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** Oficina gerencial: administrador, gestor ou oficina. */
export function WorkshopAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'oficina']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
