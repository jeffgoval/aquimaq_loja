import { useEffect } from 'react';
import { supabase } from '@app/config/supabase';
import { useAuthStore } from '../store';
import { authService } from '../services/authService';

/**
 * Bootstraps auth state on first mount and subscribes to Supabase auth events.
 * Mount once at the top of the app — child components read state via useAuthStore.
 */
export function useAuthBootstrap(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    authService
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        authService
          .getCurrentUser()
          .then((user) => setUser(user))
          .catch(() => setUser(null));
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setStatus, setUser]);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useAuthStatus() {
  return useAuthStore((s) => s.status);
}
