import { NavLink } from 'react-router-dom';
import { useCurrentUser } from '@modules/auth/hooks/useAuth';
import { useCrmAccess } from '@modules/settings/hooks/useCrmAccess';
import { cn } from '@shared/lib/cn';
import { NAVIGATION, navItemRoleAllowed, type NavItem } from './navigation';

function visibleFor(items: NavItem[], role: string): NavItem[] {
  return items.filter((it) => navItemRoleAllowed(it, role));
}

export function Sidebar() {
  const user = useCurrentUser();
  const { isNavItemVisible } = useCrmAccess();
  if (!user) return null;

  return (
    <aside className="hidden w-58 shrink-0 flex-col bg-sidebar-bg md:flex" style={{ width: '232px' }}>
      {/* Logo / identidade */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sidebar-logo-bg text-white text-[13px] font-bold tracking-tight">
          Aq
        </div>
        <div className="flex flex-col leading-snug min-w-0">
          <span className="text-[13px] font-semibold text-sidebar-fg tracking-tight truncate">Aquimaq CRM</span>
          <span className="text-[10px] text-sidebar-fg-muted tracking-wider uppercase">Gestão Operacional</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAVIGATION.map((group) => {
          const items = visibleFor(group.items, user.role).filter(isNavItemVisible);
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-fg-muted">
                {group.label}
              </div>
              <ul className="space-y-px">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-item-active text-sidebar-item-active-fg'
                            : 'text-sidebar-fg hover:bg-sidebar-item-hover hover:text-sidebar-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'h-[15px] w-[15px] shrink-0 transition-colors',
                              isActive ? 'text-sidebar-item-active-fg' : 'text-sidebar-fg-muted group-hover:text-sidebar-fg',
                            )}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Rodapé da sidebar */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sidebar-item-active text-sidebar-item-active-fg text-[10px] font-semibold uppercase">
            {user.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-sidebar-fg">{user.fullName}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
