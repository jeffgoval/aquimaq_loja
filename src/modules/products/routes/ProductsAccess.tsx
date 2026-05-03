import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** Cadastro mestre de produtos: administrador, gestor ou cadastro. */
export function ProductsAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'cadastro']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
