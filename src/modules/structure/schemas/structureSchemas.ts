import { z } from 'zod';

export const nameDescriptionActiveSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(2000).optional().nullable(),
  is_active: z.boolean(),
});

export type NameDescriptionActiveInput = z.infer<typeof nameDescriptionActiveSchema>;

export const supplierFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  document: z.string().max(32).optional().nullable(),
  email: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .refine((v) => v == null || v === '' || z.string().email().safeParse(v).success, 'Email inválido'),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_active: z.boolean(),
});

export type SupplierFormInput = z.infer<typeof supplierFormSchema>;

export const unitFormSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').max(32),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(2000).optional().nullable(),
  is_active: z.boolean(),
});

export type UnitFormInput = z.infer<typeof unitFormSchema>;

export const subcategoryFormSchema = z.object({
  category_id: z.string().uuid('Selecione a categoria'),
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(2000).optional().nullable(),
  is_active: z.boolean(),
});

export type SubcategoryFormInput = z.infer<typeof subcategoryFormSchema>;
