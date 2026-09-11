-- ════════════════════════════════════════════════════════════════════════════
--  Migração: senha única  ->  contas de login + painel admin
--
--  Use este arquivo se o banco JÁ TEM dados da versão antiga (uma senha só).
--  Banco vazio? Rode supabase/schema.sql em vez deste.
--
--  Rode no Supabase: SQL Editor > New query. São DOIS passos, com um login
--  no meio (o app cria o admin sozinho). Não pule a ordem.
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
--  PASSO A — rode este bloco agora
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Contas de acesso
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null unique,
  password_hash text        not null,
  role          text        not null default 'user' check (role in ('user','admin')),
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);
alter table accounts enable row level security;

-- Dono das vistorias
alter table inspections
  add column if not exists account_id uuid references accounts(id) on delete cascade;
create index if not exists inspections_account_data_idx
  on inspections (account_id, data_vistoria desc);

-- Tabela de preços passa a ser por conta (ainda sem trancar)
alter table app_settings drop constraint if exists app_settings_single_row;
alter table app_settings
  add column if not exists account_id uuid references accounts(id) on delete cascade;


-- ─────────────────────────────────────────────────────────────────────────────
--  >>> AGORA, FORA DO SQL:
--      1. Defina as variáveis de ambiente ADMIN_EMAIL e APP_PASSWORD
--         (Vercel + .env.local) e faça deploy / reinicie o dev.
--      2. Abra o app e faça UM login com ADMIN_EMAIL + APP_PASSWORD.
--         Isso cria a conta admin (a tabela accounts estava vazia).
--  Só então rode o PASSO B abaixo.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
--  PASSO B — rode DEPOIS do primeiro login do admin
-- ─────────────────────────────────────────────────────────────────────────────

-- Todas as vistorias e a tabela de preços que já existiam passam a ser do admin
update inspections
   set account_id = (select id from accounts where role = 'admin' order by created_at limit 1)
 where account_id is null;

update app_settings
   set account_id = (select id from accounts where role = 'admin' order by created_at limit 1)
 where account_id is null;

-- Confira que não sobrou nada sem dono (as duas contagens devem ser 0):
--   select count(*) from inspections  where account_id is null;
--   select count(*) from app_settings where account_id is null;

-- Trancar: dono obrigatório e uma linha de preços por conta
alter table inspections alter column account_id set not null;

alter table app_settings drop constraint if exists app_settings_pkey;
alter table app_settings drop column if exists id;
alter table app_settings alter column account_id set not null;
alter table app_settings add primary key (account_id);
