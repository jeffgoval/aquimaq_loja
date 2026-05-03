import type { StructureTableName } from './services/structureApi';

export type StructureSegment =
  | 'result-centers'
  | 'cost-centers'
  | 'categories'
  | 'subcategories'
  | 'brands'
  | 'suppliers'
  | 'units';

export type StructureFormVariant = 'nameDesc' | 'supplier' | 'unit' | 'subcategory';

export interface StructureSegmentConfig {
  segment: StructureSegment;
  table: StructureTableName;
  title: string;
  description: string;
  formVariant: StructureFormVariant;
  /** Permite carregar listas sugeridas de nomes (centros de resultado e categorias). */
  seedSuggestedDefaults?: boolean;
  order: { column: string; ascending?: boolean };
}

export const STRUCTURE_SEGMENT_CONFIG: StructureSegmentConfig[] = [
  {
    segment: 'result-centers',
    table: 'result_centers',
    title: 'Centros de resultado',
    description: 'Linhas de negócio para alocação gerencial de produtos e indicadores.',
    formVariant: 'nameDesc',
    seedSuggestedDefaults: true,
    order: { column: 'name' },
  },
  {
    segment: 'cost-centers',
    table: 'cost_centers',
    title: 'Centros de custo gerenciais',
    description: 'Áreas de custo para controle interno.',
    formVariant: 'nameDesc',
    order: { column: 'name' },
  },
  {
    segment: 'categories',
    table: 'product_categories',
    title: 'Categorias',
    description: 'Classificação principal de produtos (tabela product_categories).',
    formVariant: 'nameDesc',
    seedSuggestedDefaults: true,
    order: { column: 'name' },
  },
  {
    segment: 'subcategories',
    table: 'subcategories',
    title: 'Subcategorias',
    description: 'Refinamento por categoria.',
    formVariant: 'subcategory',
    order: { column: 'name' },
  },
  {
    segment: 'brands',
    table: 'brands',
    title: 'Marcas',
    description: 'Marcas reutilizáveis no cadastro mestre.',
    formVariant: 'nameDesc',
    order: { column: 'name' },
  },
  {
    segment: 'suppliers',
    table: 'suppliers',
    title: 'Fornecedores',
    description: 'Fornecedores gerenciais (distintos do espelho ERP).',
    formVariant: 'supplier',
    order: { column: 'name' },
  },
  {
    segment: 'units',
    table: 'units',
    title: 'Unidades',
    description: 'Unidades de compra e venda (CX, UN, KG…).',
    formVariant: 'unit',
    order: { column: 'code' },
  },
];

export function getStructureConfig(segment: string | undefined): StructureSegmentConfig | undefined {
  if (!segment) return undefined;
  return STRUCTURE_SEGMENT_CONFIG.find((c) => c.segment === segment);
}
