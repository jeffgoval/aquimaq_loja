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
}

export interface NavGroup {
  label: string;
  items: NavItem[];
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
      { to: '/', label: 'Painel da Casa', icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    label: 'Operação',
    items: [
      { to: '/structure', label: 'Estrutura', icon: Building2, roles: ['admin', 'gestor'] },
      { to: '/products', label: 'Cadastro Mestre', icon: Package, roles: ['admin', 'gestor', 'cadastro'] },
      { to: '/inventory', label: 'Estoque', icon: Boxes, roles: ['admin', 'gestor', 'estoque'] },
      { to: '/purchases', label: 'Compras', icon: ShoppingCart, roles: ['admin', 'gestor', 'compras'] },
      { to: '/receiving', label: 'Recebimento', icon: Truck, roles: ['admin', 'gestor', 'recebimento'] },
      { to: '/workshop', label: 'Oficina', icon: Wrench, roles: ['admin', 'gestor', 'oficina'] },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/tasks', label: 'Tarefas', icon: ListTodo, roles: ALL },
      { to: '/indicators', label: 'Indicadores', icon: BarChart3, roles: ['admin', 'gestor'] },
      { to: '/management-panel', label: 'Painel Gerencial', icon: Briefcase, roles: ['admin', 'gestor', 'financeiro'] },
      { to: '/weekly-routine', label: 'Rotina Semanal', icon: CalendarCheck, roles: ['admin', 'gestor'] },
      { to: '/improvements', label: 'Melhorias', icon: Sparkles, roles: ['admin', 'gestor'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
    ],
  },
];
