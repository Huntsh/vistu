-- ════════════════════════════════════════════════════════════════════════════
--  Vistorias a Receber — schema do banco (PostgreSQL / Supabase)
--
--  Instalação NOVA (banco vazio):
--   1. Painel do Supabase  >  SQL Editor  >  New query
--   2. Cole TODO este arquivo e clique em "Run"
--
--  Já tem dados de uma versão antiga (senha única)?  NÃO rode este arquivo —
--  use  supabase/migrations/2026-09-10_contas.sql  em vez dele.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Contas de acesso ──────────────────────────────────────────────────────
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null unique,          -- sempre gravado em minúsculas
  password_hash text        not null,                 -- PBKDF2-SHA256 (feito no app)
  role          text        not null default 'user' check (role in ('user','admin')),
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

-- ─── Tabela de preços — UMA linha por conta ────────────────────────────────
create table if not exists app_settings (
  account_id                uuid primary key references accounts(id) on delete cascade,
  valor_base_realizada      numeric(12,2) not null default 60,   -- Realizada, área <= limite
  valor_adicional_mobiliado numeric(12,2) not null default 60,   -- + quando mobiliado
  valor_nao_realizada       numeric(12,2) not null default 30,   -- status "Não realizada"
  area_limite               numeric(12,2) not null default 150,  -- m² a partir do qual cobra por m²
  valor_por_m2              numeric(12,2) not null default 2,     -- R$ por m² acima do limite
  updated_at                timestamptz  not null default now()
);

-- ─── Vistorias lançadas ────────────────────────────────────────────────────
create table if not exists inspections (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid        not null references accounts(id) on delete cascade,
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

create index if not exists inspections_account_data_idx on inspections (account_id, data_vistoria desc);
create index if not exists inspections_imobiliaria_idx   on inspections (imobiliaria);
create index if not exists inspections_status_idx        on inspections (status);

-- ─── Segurança ─────────────────────────────────────────────────────────────
-- RLS ligada e SEM policies: só a chave service_role (usada pelo servidor do
-- app) e o dono do projeto têm acesso. A chave pública anônima não lê nada.
alter table accounts      enable row level security;
alter table app_settings  enable row level security;
alter table inspections   enable row level security;

-- ─── Primeiro admin ────────────────────────────────────────────────────────
-- Não é criado aqui. Defina ADMIN_EMAIL + APP_PASSWORD nas variáveis de
-- ambiente e faça UM login com esse e-mail: o app cria a conta admin sozinho
-- na primeira vez que a tabela accounts está vazia.
