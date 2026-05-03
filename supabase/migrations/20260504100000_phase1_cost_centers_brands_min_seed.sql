-- Seed mínimo idempotente: centros de custo e marcas genéricas (estrutura operacional).
-- result_centers / product_categories / units já têm seed em phase1_prd_structure_seed.

insert into public.cost_centers (name, description, is_active)
select v.name, v.description, true
from (
  values
    ('Administrativo / G&A', 'Custos indiretos administrativos'),
    ('Comercial / Vendas', 'Área comercial e relacionamento'),
    ('Logística / Almoxarifado', 'Armazenagem, expedição e estoque'),
    ('Oficina / Serviços', 'Mão de obra e serviços técnicos'),
    ('Operação / Campo', 'Operação agrícola e técnica de campo')
) as v(name, description)
where not exists (select 1 from public.cost_centers c where c.name = v.name);

insert into public.brands (name, description, is_active)
select v.name, v.description, true
from (
  values
    ('Diversos', 'Marca genérica quando não houver fabricante específico'),
    ('Sem marca', 'Produtos sem marca declarada')
) as v(name, description)
where not exists (select 1 from public.brands b where b.name = v.name);
