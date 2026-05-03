import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@shared/lib/cn';
import { STRUCTURE_SEGMENT_CONFIG } from '../structureConfig';

export function StructureLayout() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estrutura operacional</h1>
        <p className="text-sm text-muted-foreground">
          Cadastros mestres de apoio (PRD §10) — centros, categorias, marcas, fornecedores e unidades.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STRUCTURE_SEGMENT_CONFIG.map((c) => (
          <NavLink
            key={c.segment}
            to={`/structure/${c.segment}`}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary-soft font-medium text-primary'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )
            }
          >
            {c.title}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
