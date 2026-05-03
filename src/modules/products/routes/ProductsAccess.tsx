import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** PRD §6 — cadastro mestre: admin, gestor, cadastro. */
export function ProductsAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'cadastro']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
