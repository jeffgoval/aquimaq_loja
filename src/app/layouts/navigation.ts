import {
  LayoutDashboard,
  Building2,
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  Wrench,
  ListTodo,
  BarChart3,
  Briefcase,
  Landmark,
  CalendarCheck,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@shared/types/database';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Roles that may see this item. Empty = visible to all authenticated users. */
  roles?: Role[];
  /** Chave em `crm_permission_catalog` / matriz (Fase 12). */
  permissionKey?: string;
  /** Flag opcional em `crm_feature_catalog` (Fase 12). */
  featureFlagKey?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Alinhado ao PRD §6 — visibilidade por role antes da matriz CRM (Fase 12). */
export function navItemRoleAllowed(item: NavItem, role: string): boolean {
  if (!item.roles) return true;
  return item.roles.includes(role as Role);
}

/**
 * Resolve o item de menu correspondente ao caminho (ex.: `/products/xyz/edit` → item `/products`).
 * Rotas sem entrada no menu não aplicam gate CRM aqui.
 */
export function getNavItemForRoute(pathname: string): NavItem | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const flat = NAVIGATION.flatMap((g) => g.items);
  const sorted = [...flat].sort((a, b) => b.to.length - a.to.length);
  for (const it of sorted) {
    if (normalized === it.to) return it;
    if (it.to !== '/' && normalized.startsWith(`${it.to}/`)) return it;
  }
  return null;
}

const ALL: Role[] = [
  'admin',
  'gestor',
  'cadastro',
  'compras',
  'estoque',
  'recebimento',
  'oficina',
  'financeiro',
  'consulta',
];

/** Single source of truth for the sidebar. Role gating mirrors PRD §6. */
export const NAVIGATION: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      { to: '/', label: 'Painel da Casa', icon: LayoutDashboard, roles: ALL, permissionKey: 'nav.dashboard' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { to: '/structure', label: 'Estrutura', icon: Building2, roles: ['admin', 'gestor'], permissionKey: 'nav.structure' },
      {
        to: '/products',
        label: 'Cadastro Mestre',
        icon: Package,
        roles: ['admin', 'gestor', 'cadastro'],
        permissionKey: 'nav.products',
      },
      { to: '/inventory', label: 'Estoque', icon: Boxes, roles: ['admin', 'gestor', 'estoque'], permissionKey: 'nav.inventory' },
      {
        to: '/purchases',
        label: 'Compras',
        icon: ShoppingCart,
        roles: ['admin', 'gestor', 'compras'],
        permissionKey: 'nav.purchases',
      },
      {
        to: '/receiving',
        label: 'Recebimento',
        icon: Truck,
        roles: ['admin', 'gestor', 'recebimento'],
        permissionKey: 'nav.receiving',
      },
      { to: '/workshop', label: 'Oficina', icon: Wrench, roles: ['admin', 'gestor', 'oficina'], permissionKey: 'nav.workshop' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/tasks', label: 'Tarefas', icon: ListTodo, roles: ALL, permissionKey: 'nav.tasks' },
      { to: '/indicators', label: 'Indicadores', icon: BarChart3, roles: ['admin', 'gestor'], permissionKey: 'nav.indicators' },
      {
        to: '/management-panel',
        label: 'Painel Gerencial',
        icon: Briefcase,
        roles: ['admin', 'gestor', 'financeiro'],
        permissionKey: 'nav.management_panel',
      },
      {
        to: '/financial-panel',
        label: 'Painel Financeiro',
        icon: Landmark,
        roles: ['admin', 'gestor', 'financeiro'],
        permissionKey: 'nav.financial_panel',
        featureFlagKey: 'feat.financial_panel',
      },
      {
        to: '/weekly-routine',
        label: 'Rotina Semanal',
        icon: CalendarCheck,
        roles: ['admin', 'gestor'],
        permissionKey: 'nav.weekly_routine',
      },
      {
        to: '/improvements',
        label: 'Melhorias',
        icon: Sparkles,
        roles: ['admin', 'gestor'],
        permissionKey: 'nav.improvements',
        featureFlagKey: 'feat.experimental_improvements',
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        to: '/settings',
        label: 'Configurações',
        icon: Settings,
        roles: ['admin', 'gestor'],
        permissionKey: 'nav.settings',
      },
    ],
  },
];
