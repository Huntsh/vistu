-- ════════════════════════════════════════════════════════════════════════════
--  Vistorias a Receber — schema do banco (PostgreSQL / Supabase)
--
--  Como rodar:
--   1. Painel do Supabase  >  SQL Editor  >  New query
--   2. Cole TODO este arquivo e clique em "Run"
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Tabela de preços (linha única, id = 1) ─────────────────────────────────
create table if not exists app_settings (
  id                        integer primary key default 1,
  valor_base_realizada      numeric(12,2) not null default 60,   -- Realizada, área <= limite
  valor_adicional_mobiliado numeric(12,2) not null default 60,   -- + quando mobiliado
  valor_nao_realizada       numeric(12,2) not null default 30,   -- status "Não realizada"
  area_limite               numeric(12,2) not null default 150,  -- m² a partir do qual cobra por m²
  valor_por_m2              numeric(12,2) not null default 2,     -- R$ por m² acima do limite
  updated_at                timestamptz  not null default now(),
  constraint app_settings_single_row check (id = 1)
);

insert into app_settings (id) values (1)
on conflict (id) do nothing;

-- ─── Vistorias lançadas ────────────────────────────────────────────────────
create table if not exists inspections (
  id             uuid primary key default gen_random_uuid(),
  num_registro   text        not null,
  num_contrato   text,
  imobiliaria    text        not null,
  area_m2        numeric(12,2) not null default 0,
  mobiliado      boolean     not null default false,
  data_vistoria  date        not null,
  hora_vistoria  text,
  status         text        not null check (status in ('realizada','nao_realizada','desmarcada')),
  valor          numeric(12,2) not null default 0,   -- calculado no servidor ao salvar
  created_at     timestamptz not null default now()
);

create index if not exists inspections_data_idx        on inspections (data_vistoria desc);
create index if not exists inspections_imobiliaria_idx on inspections (imobiliaria);
create index if not exists inspections_status_idx      on inspections (status);

-- ─── Segurança ─────────────────────────────────────────────────────────────
-- Com RLS ligada e SEM policies, apenas a chave service_role (usada pelo
-- servidor do app) e o dono do projeto têm acesso. A chave pública anônima
-- não consegue ler nem escrever nada.
alter table app_settings enable row level security;
alter table inspections  enable row level security;
