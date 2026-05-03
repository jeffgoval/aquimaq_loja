import { Navigate, Outlet } from 'react-router-dom';
import { RoleGate } from '@shared/components/auth/RoleGate';

export function WeeklyRoutineAccess() {
  return (
    <RoleGate allow={['admin', 'gestor']} fallback={<Navigate to="/" replace />}>
      <Outlet />
    </RoleGate>
  );
}
