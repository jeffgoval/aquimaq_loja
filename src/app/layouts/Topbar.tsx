import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button } from '@ds/primitives';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { useAuthStore } from '@modules/auth/store';
import { authService } from '@modules/auth/services/authService';
import { ROLE_LABELS } from '@shared/types/database';

export function Topbar() {
  const user = useCurrentUser();
  const reset = useAuthStore((s) => s.reset);

  async function handleSignOut() {
    try {
      await authService.signOut();
      reset();
      toast.success('Sessão encerrada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao sair';
      toast.error(message);
    }
  }

  if (!user) return null;
  const initials = user.fullName
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div className="text-sm text-muted-foreground">
        {/* Reserved for breadcrumbs / contextual actions per page. */}
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground">
            {initials}
          </div>
          <div className="hidden text-right leading-tight md:block">
            <div className="text-sm font-medium">{user.fullName}</div>
            <div className="text-[11px] text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
