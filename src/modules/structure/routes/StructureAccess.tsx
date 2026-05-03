import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/**
 * Apenas admin e gestor (espelha item da sidebar).
 */
export function StructureAccess() {
  return (
    <RoleGate allow={['admin', 'gestor']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
