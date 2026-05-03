import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStatus, useCurrentUser } from '@modules/auth/hooks/useAuth';
import { LoadingScreen } from '@shared/components/feedback/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const status = useAuthStatus();
  const user = useCurrentUser();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <LoadingScreen label="Verificando sessão..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
