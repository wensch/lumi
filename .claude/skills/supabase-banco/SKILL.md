---
name: supabase-banco
description: Regras para mexer no banco do Lumi (Supabase/Postgres) — migrations numeradas, funções SECURITY DEFINER, RLS, índices, datas no fuso da pessoa, testes locais e o que o conector do Supabase cancela. Use ao criar/alterar tabela, função, policy ou índice, ao revisar SQL e ao aplicar migration.
---

# Banco do Lumi (Supabase / Postgres 16)

Junta e adapta `postgres-patterns` e `database-migrations` do ECC (MIT, ver `../NOTICE-ECC.md`) ao que o Lumi
já faz. Responda em **português do Brasil**, curto. Projeto remoto: `xdbbzcajgjlzajwhojsh` (conector
`mcp__Lumi_supabase__*`). Nunca apague dados do Supabase sem o usuário pedir.

## O modelo (não fuja dele)

1. **Tabelas fechadas ao cliente**: `enable row level security` **e** `revoke all ... from anon, authenticated`.
   O app lê/escreve por **funções** (`supabase.rpc`). Exceção: tabelas do próprio usuário com policy simples
   (`profiles` leitura, `devotional_sessions`, `prayer_entries`...). O aviso `rls_enabled_no_policy` (INFO) nas
   tabelas fechadas é **esperado**.
2. **Função pública** = `security definer` + `set search_path = public, pg_temp` + `auth.uid()` conferido
   (`not_authenticated`) + participação/dono conferido (`not_member`, `forbidden`) + entrada validada
   (`invalid_input`) + `revoke ... from public, anon` + `grant ... to authenticated`. Erros são **códigos curtos
   em string** (o app os traduz em `*.errors.*`).
3. **Função interna** (helpers como `refresh_*`, `*_core`, `safe_timezone`): `revoke execute ... from public,
anon, authenticated`. Só outras funções as chamam.
4. **Segredos e escrita sensível** (XP, sequência, conquistas, avisos) só em função, nunca por policy de escrita.

## Template de função

```sql
create or replace function public.minha_funcao(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  -- participação / dono / limites aqui; texto do cliente: tamanho, caracteres, formato
  ...
end;
$$;
revoke execute on function public.minha_funcao(uuid) from public, anon;
grant execute on function public.minha_funcao(uuid) to authenticated;
```

## RLS, índices e tipos

- Policy: `using ((select auth.uid()) = user_id)` (o `select` evita reavaliar por linha). Policy sem `select`
  vira alerta de desempenho.
- **Índice em toda chave estrangeira** e em colunas de filtro/ordem usadas pelas funções. Para achar FKs sem
  índice: consulta `pg_constraint` × `pg_index` (ver `get_advisors` de performance, que já lista).
  Índice parcial (`where status = 'active'`) para "um ativo por vez"; índice único parcial garante a regra.
- Tipos: `uuid` (padrão do projeto), `text` (não `varchar(n)`; limite com `check`/validação), `timestamptz`,
  `boolean`, `integer`. Nunca `timestamp` sem fuso nem `float` para quantidade.
- **Datas = dia local da pessoa**: use `public.user_local_date(user_id)` e `public.safe_timezone(tz)`; nunca
  `current_date`/`now()::date` para regra de sequência, plano ou desafio. Fuso inválido não pode quebrar nada.
- Funções que devolvem lista: sempre com `limit` ou escopo pequeno; evite consulta por linha dentro de loop
  (N+1) — faça um `join`/`jsonb_agg`.
- Limites contra spam/abuso nos RPCs que gravam texto livre (por dia e total), como em `create_custom_*`.
- Regra "no máximo N ativos" ou "um por círculo": **trave a linha pai** antes de contar
  (`perform 1 from public.profiles where id = v_user_id for update;`), senão dois toques seguidos passam.

## Migrations

- Arquivo novo `supabase/migrations/000NN_descricao.sql` (próximo número livre). **Nunca edite uma migration
  já aplicada**; correção = migration nova. Só avançar (sem "down"); desfazer é outra migration.
- Redefinir função (`create or replace`): **copie a versão MAIS RECENTE** (procure `grep -n "function public.nome"
supabase/migrations/*.sql` e use a última), senão você desfaz correções antigas. Mantenha assinatura e refaça
  os `revoke`/`grant`.
- Esquema e dados em migrations separadas quando o dado é grande (backfill em lotes). Coluna nova: nula ou com
  default; `not null` sem default em tabela com linhas = reescrita/falha.
- Renomear/remover coluna: padrão expandir → migrar → contrair, em releases diferentes do app (celulares com
  APK antigo continuam chamando a função/coluna antiga).
- `create index concurrently` não roda dentro de transação (o `apply_migration` usa transação): aplique esse
  índice à parte, com `execute_sql`, ou aceite o lock em tabela pequena.
- Seeds editoriais (`supabase/seed-*.sql`) ficam fora das migrations e são "seguros repetir" (`on conflict`).

## Testar antes de aplicar (obrigatório)

1. `pg_ctlcluster 16 main start` (reinicie se o ambiente reiniciou).
2. Banco novo: `create database lumitest2`; `psql -f supabase/tests/stub.sql`; todas as migrations em ordem;
   seeds (`supabase/tests/README.md` lista).
3. Rode `supabase/tests/tNN.sql` das áreas que mudaram e **escreva um teste novo** (`tNN.sql`) com: caso feliz,
   sem login, não membro/dono errado, repetição/toque duplo, limites, e **dois usuários** (um não vê o do outro).
   Os testes imprimem o esperado ao lado do resultado; `permission denied` é intencional.
4. Cuidado: `truncate ... cascade` em tabela pai apaga filhas (ex.: `circles` → `challenges`); o teste deve
   recarregar o seed necessário.
5. Aplicar: `apply_migration` (nome em snake_case, o mesmo SQL do arquivo). Depois `get_advisors` (security e
   performance) e uma consulta de leitura para conferir.

## O que o conector do Supabase cancela

SQL com `delete from` ou `drop function` é **cancelado**. Contornos usados no projeto:

- trocar o nome da função antiga (`alter function ... rename to ..._core`) e criar um **wrapper** público fino
  que faz a checagem nova e chama a `_core` (ver `remove_circle_member`, `leave_circle`);
- remoção lógica (`archived_at`) em vez de apagar;
- o que for realmente destrutivo vira **patch** em `supabase/patches/` para o usuário rodar no SQL Editor.

## Avisos esperados do `get_advisors`

- `rls_enabled_no_policy` (INFO) nas tabelas fechadas; `authenticated_security_definer_function_executable`
  (WARN) nas funções públicas; `auth_leaked_password_protection` (WARN, ligar no painel do Supabase Auth).
- Qualquer outro alerta (policy sem `select`, FK sem índice, função sem `search_path`) é achado: corrigir.

## Não se aplica aqui (do ECC)

`ALTER SYSTEM`/ajuste de conexões (o Supabase gerencia), `REVOKE ALL ON SCHEMA public FROM public` (quebra a
API), Prisma/Drizzle/Django (não usamos), `pg_stat_statements` sem acesso (use os alertas de performance).
