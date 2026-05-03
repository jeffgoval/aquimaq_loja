import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

/** Configurações: auditoria (administrador/gestor); matriz de permissões e flags só administrador. */
export function SettingsAccess() {
  return (
    <RoleGate allow={['admin', 'gestor']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
