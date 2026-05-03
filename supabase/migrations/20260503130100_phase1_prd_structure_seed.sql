-- Seed idempotente PRD §10 — centros de resultado e categorias (alinhado a src/modules/structure/constants/prdSeeds.ts).
-- Unidades básicas para operação (código único).
-- Executa como dono da migração (bypass RLS); não depende de auth.uid().

-- ---------------------------------------------------------------------------
-- Centros de resultado (PRD §10)
-- ---------------------------------------------------------------------------
insert into public.result_centers (name, is_active)
select v.name, true
from (
  values
    ('Loja / varejo balcão'),
    ('Máquinas e equipamentos'),
    ('Peças e reposição'),
    ('Oficina / assistência técnica'),
    ('Defensivos, foliares e produtos técnicos'),
    ('Fertilizantes e corretivos')
) as v(name)
where not exists (select 1 from public.result_centers rc where rc.name = v.name);

-- ---------------------------------------------------------------------------
-- Categorias de produto (PRD §10)
-- ---------------------------------------------------------------------------
insert into public.product_categories (name, is_active)
select v.name, true
from (
  values
    ('Defensivos'),
    ('Fertilizantes'),
    ('Foliares'),
    ('Corretivos'),
    ('Máquinas'),
    ('Peças'),
    ('Ferramentas'),
    ('EPIs'),
    ('Lubrificantes'),
    ('Irrigação'),
    ('Sacaria'),
    ('Produtos veterinários'),
    ('Sementes'),
    ('Oficina'),
    ('Serviços'),
    ('Frete / entrega'),
    ('Brindes / bonificações')
) as v(name)
where not exists (select 1 from public.product_categories pc where pc.name = v.name);

-- ---------------------------------------------------------------------------
-- Unidades comuns (operação / NF-e)
-- ---------------------------------------------------------------------------
insert into public.units (code, name, is_active)
select v.code, v.name, true
from (
  values
    ('UN', 'Unidade'),
    ('KG', 'Quilograma'),
    ('L', 'Litro'),
    ('CX', 'Caixa'),
    ('PC', 'Peça'),
    ('SC', 'Saco'),
    ('M', 'Metro'),
    ('HA', 'Hectare'),
    ('T', 'Tonelada')
) as v(code, name)
where not exists (select 1 from public.units u where u.code = v.code);
