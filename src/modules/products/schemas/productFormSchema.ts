import { z } from 'zod';

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const productFormSchema = z
  .object({
    internal_code: z.string().min(1, 'Código interno obrigatório'),
    erp_code: z.preprocess(emptyToNull, z.string().nullable().optional()),
    erp_product_id: z.union([z.literal(''), z.string().uuid()]).optional(),
    factory_code: z.preprocess(emptyToNull, z.string().nullable().optional()),
    barcode: z.preprocess(emptyToNull, z.string().nullable().optional()),
    description: z.string().min(2, 'Descrição mínima 2 caracteres'),
    category_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    subcategory_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    brand_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    primary_supplier_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    unit_purchase_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    unit_sale_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    unit_conversion_factor: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? 1 : v),
      z.coerce.number().refine((n) => Number.isFinite(n) && n > 0, 'Conversão deve ser > 0'),
    ),
    management_cost: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().nonnegative().nullable().optional(),
    ),
    management_price: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().nonnegative().nullable().optional(),
    ),
    margin_minimum_pct: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().nullable().optional(),
    ),
    margin_target_pct: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().nullable().optional(),
    ),
    max_discount_pct: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().min(0).max(100).nullable().optional(),
    ),
    min_stock: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().nonnegative().nullable().optional(),
    ),
    max_stock: z.preprocess(
      (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      },
      z.coerce.number().nonnegative().nullable().optional(),
    ),
    default_location: z.preprocess(emptyToNull, z.string().nullable().optional()),
    result_center_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    abc_class: z
      .preprocess((v) => (v === '' || v == null ? null : v), z.string().nullable().optional())
      .refine((v) => v == null || ['A', 'B', 'C'].includes(v), 'Curva ABC: A, B ou C'),
    is_new_standard: z.boolean(),
    responsible_user_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    last_reviewed_at: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : v),
      z.string().nullable().optional(),
    ),
    notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.is_new_standard) {
      if (!data.category_id) ctx.addIssue({ code: 'custom', path: ['category_id'], message: 'Padrão novo exige categoria' });
      if (!data.unit_purchase_id || !data.unit_sale_id) {
        ctx.addIssue({ code: 'custom', path: ['unit_purchase_id'], message: 'Padrão novo exige unidades' });
      }
    }
    if (data.max_stock != null && data.min_stock != null && data.max_stock < data.min_stock) {
      ctx.addIssue({ code: 'custom', path: ['max_stock'], message: 'Estoque máximo deve ser ≥ mínimo' });
    }
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;
