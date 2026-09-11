# Vistorias a Receber

App para vistoriador(a) de imóveis controlar os valores a receber por vistorias
realizadas. Mesma base de dados no celular e no computador (banco real, **não**
`localStorage`), hospedagem gratuita, sem depender de nenhuma ferramenta de IA
para funcionar no dia a dia.

## Stack

- **Next.js 14** (App Router) — front-end + API, deploy na **Vercel** (grátis)
- **Supabase** (PostgreSQL) — banco de dados (plano grátis)
- **Recharts** — gráficos · **jsPDF** — extrato em PDF
- **Contas de login** (e-mail + senha), cada conta com seus próprios dados
- **Painel admin** (`/admin`) para a conta administradora ver as outras contas

Os dados nunca ficam só no navegador: tudo passa pela API e é gravado no
Postgres do Supabase, então o que você lança no celular aparece no computador e
vice-versa.

---

## 1. Criar o banco no Supabase

1. Crie uma conta em <https://supabase.com> (grátis) e clique em **New project**.
2. Dê um nome, defina uma senha de banco e escolha a região mais próxima
   (ex.: *South America (São Paulo)*). Aguarde ~2 min o projeto subir.
3. No menu lateral: **SQL Editor → New query**.
4. **Banco novo (vazio):** abra [`supabase/schema.sql`](supabase/schema.sql),
   copie **todo** o conteúdo, cole no editor e clique em **Run**. Isso cria as
   tabelas `accounts`, `inspections` e `app_settings`.

   **Já tinha a versão antiga (senha única) com dados?** Não rode o `schema.sql`.
   Use [`supabase/migrations/2026-09-10_contas.sql`](supabase/migrations/2026-09-10_contas.sql),
   que tem **PASSO A** (rodar agora) e **PASSO B** (rodar depois do 1º login do
   admin). Siga a ordem descrita no próprio arquivo.
5. Vá em **Project Settings → API** e anote:
   - **Project URL** → vira `SUPABASE_URL`
   - **Project API keys → `service_role`** (a chave secreta, *não* a `anon`)
     → vira `SUPABASE_SERVICE_ROLE_KEY`

> A chave `service_role` é secreta e só é usada no servidor. Nunca a exponha no
> navegador nem a comite no Git.

---

## 2. Rodar no seu computador (opcional, para testar)

Pré-requisitos: **Node.js 18+**.

```bash
npm install
cp .env.local.example .env.local   # no Windows: copy .env.local.example .env.local
```

Edite `.env.local`:

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # chave service_role
AUTH_SECRET=uma-string-aleatoria-bem-longa  # ex.: openssl rand -hex 32
ADMIN_EMAIL=voce@exemplo.com                # vira admin no 1º login
APP_PASSWORD=uma-senha-sua                  # senha inicial desse admin
```

```bash
npm run dev
```

Abra <http://localhost:3000>. No **primeiro** login, entre com `ADMIN_EMAIL` +
`APP_PASSWORD`: como não existe nenhuma conta ainda, o app cria a conta de
administrador automaticamente. Depois disso, novas contas se cadastram em
**/signup** (ou você as cria e gerencia pelo painel `/admin`).

---

## 3. Publicar na Vercel (grátis)

1. Suba este projeto para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em <https://vercel.com> → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione as 4 variáveis (mesmos nomes do
   `.env.local`):

   | Nome | Valor |
   |------|-------|
   | `SUPABASE_URL` | URL do projeto Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` |
   | `AUTH_SECRET` | string aleatória longa |
   | `ADMIN_EMAIL` | e-mail que vira admin no 1º login |
   | `APP_PASSWORD` | senha inicial do admin |

4. Clique em **Deploy**. Ao final você recebe uma URL tipo
   `https://vistorias-a-receber.vercel.app`.
5. No celular, abra essa URL e use **“Adicionar à tela de início”** para ficar
   com cara de app. Entra com a mesma senha.

Pronto — celular e computador leem e gravam no mesmo banco.

---

## Como o valor é calculado

| Status | Valor |
|--------|-------|
| Desmarcada com antecedência | R$ 0,00 |
| Não realizada | valor fixo (padrão R$ 30,00) |
| Realizada, área ≤ limite | valor base (padrão R$ 60,00) + adicional se mobiliado (padrão + R$ 60,00) |
| Realizada, área > limite | área × valor por m² (padrão 150 m² e R$ 2,00/m²) |

Todos esses números (60, 60, 30, 150, 2) ficam na tela **Configurações** e podem
ser alterados a qualquer momento — não estão fixos no código.

Cada lançamento **guarda o valor calculado no momento em que foi salvo**. Se a
tabela de preços mudar, os lançamentos antigos continuam com o valor original;
em **Configurações** há um botão para recalcular todos com a tabela atual, se
você quiser.

---

## Estrutura

```
src/
  app/
    login/  signup/        entrar / criar conta
    (app)/                 área logada (com menu inferior)
      page.tsx             Lançamentos (lista, filtros, resumo)
      nova/                cadastro de vistoria
      editar/[id]/         edição de vistoria
      extrato/             extrato por período + botão "PDF"
      graficos/            gráficos + filtro de período
      configuracoes/       tabela de preços + recalcular + sair
    admin/                 painel do admin (contas + visão por conta)
    api/                   rotas de servidor (Supabase fica só aqui)
      signup/ me/          criar conta / dados da sessão
      admin/accounts/…     listagem e visão somente-leitura por conta
  components/              AppShell, ExtratoView, formulário, gráficos, ícones
  lib/                     cálculo, formatação, auth+sessão, pdf, Supabase
supabase/schema.sql              SQL para banco novo
supabase/migrations/…contas.sql  migração da versão de senha única
```

## Contas, admin e extrato

- **Cadastro:** qualquer pessoa cria conta em **/signup**. Cada conta só vê os
  próprios lançamentos, tem a própria tabela de preços e os próprios gráficos.
- **Admin:** a conta cujo e-mail é `ADMIN_EMAIL` é criada no primeiro login e
  ganha o botão **Admin** no topo → painel `/admin` com a lista de todas as
  contas (nº de vistorias, total a receber), abrindo cada uma em **somente
  leitura** (lançamentos, gráficos e extrato/PDF). O admin também pode
  **ativar/desativar** contas de usuário.
- **Extrato:** aba **Extrato** → escolha De/Até (ou um atalho: este mês, mês
  passado, últimos 30/90 dias), filtre por imobiliária/status e clique em
  **PDF** para baixar a tabela com cabeçalho e totais.

## Trocar a senha depois

Ainda não há tela de "trocar senha" (é o próximo passo natural); por enquanto se
troca direto no banco. Trocar `AUTH_SECRET` nas variáveis de ambiente
**desconecta todo mundo** (invalida os cookies de sessão), mas não afeta as
senhas em si.
