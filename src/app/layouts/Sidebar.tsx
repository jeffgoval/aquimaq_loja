import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { useCrmAccess } from '@modules/settings/hooks/useCrmAccess';
import { cn } from '@shared/lib/cn';
import { NAVIGATION, type NavItem } from './navigation';

function visibleFor(items: NavItem[], role: string): NavItem[] {
  return items.filter((it) => !it.roles || it.roles.includes(role as never));
}

export function Sidebar() {
  const user = useCurrentUser();
  const { isNavItemVisible } = useCrmAccess();
  if (!user) return null;

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
          A
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Aquimaq CRM</span>
          <span className="text-[11px] text-muted-foreground">Operação · Gestão · Decisão</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAVIGATION.map((group) => {
          const items = visibleFor(group.items, user.role).filter(isNavItemVisible);
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary-soft text-primary font-medium'
                            : 'text-foreground hover:bg-surface-muted',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
