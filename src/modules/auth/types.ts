import type { Role } from '@shared/types/database';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  department: string;
  isActive: boolean;
}
