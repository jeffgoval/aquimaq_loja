import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** Compras gerenciais: administrador, gestor ou compras. */
export function PurchasesAccess() {
  return (
    <RoleGate allow={['admin', 'gestor', 'compras']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}

