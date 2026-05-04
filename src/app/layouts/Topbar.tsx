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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5 shadow-[0_1px_0_0_hsl(var(--border))]">
      <div className="text-sm text-muted-foreground">
        {/* Reservado para breadcrumbs / ações contextuais por página */}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {ROLE_LABELS[user.role]}
        </Badge>

        <div className="mx-1 h-4 w-px bg-border hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {initials}
          </div>
          <div className="hidden text-right leading-snug md:block">
            <div className="text-[13px] font-medium text-foreground">{user.fullName}</div>
            <div className="text-[11px] text-muted-foreground">{user.email}</div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Sair"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
