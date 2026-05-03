import type { ReactNode } from 'react';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import type { Role } from '@shared/types/database';

interface RoleGateProps {
  /** Render children only if current user's role matches one of these. */
  allow: Role[];
  /** Optional fallback when blocked. Defaults to nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * UI-level gate. RLS still enforces server-side — this only hides UI affordances
 * for users who would be denied anyway, so they don't see broken buttons.
 */
export function RoleGate({ allow, fallback = null, children }: RoleGateProps) {
  const user = useCurrentUser();
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}

export function usePermission(allow: Role[]): boolean {
  const user = useCurrentUser();
  return Boolean(user && allow.includes(user.role));
}
