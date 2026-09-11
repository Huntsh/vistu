-- ════════════════════════════════════════════════════════════════════════════
--  Migração: nome de perfil na conta (usado no avatar e no cabeçalho do PDF)
--
--  Rode no Supabase: SQL Editor > New query > cole tudo > Run.
--  Aditiva e segura — não mexe em dado nenhum já existente.
-- ════════════════════════════════════════════════════════════════════════════

alter table accounts add column if not exists name text;
