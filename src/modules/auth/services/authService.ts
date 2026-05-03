import { supabase } from '@app/config/supabase';
import type { Role } from '@shared/types/database';
import type { AuthUser } from '../types';

interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  department: string;
  is_active: boolean;
}

function toAuthUser(profile: ProfileRow, email: string): AuthUser {
  return {
    id: profile.id,
    email,
    fullName: profile.full_name,
    role: profile.role as Role,
    department: profile.department,
    isActive: profile.is_active,
  };
}

export const authService = {
  async signInWithPassword(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Login retornou sem usuário.');

    const profile = await fetchProfile(data.user.id);
    return toAuthUser(profile, data.user.email ?? email);
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const profile = await fetchProfile(session.user.id);
    return toAuthUser(profile, session.user.email ?? '');
  },
};

async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, department, is_active')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (!data.is_active) throw new Error('Usuário inativo. Contate o administrador.');
  return data;
}
