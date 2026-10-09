# Supabase — Lumi

Schema inicial do banco (auth, tabelas, RLS). Ver
[docs/lumi-briefing.md §15](../docs/lumi-briefing.md) para o racional de
produto por trás de cada tabela.

## Migrations

| Arquivo                                   | Conteúdo                                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/00001_initial_schema.sql`     | Tabelas: profiles, streaks, bible_sources, content, devotional_sessions, xp_events, achievements, user_achievements, prayer_entries, lumi_state, notification_preferences. |
| `migrations/00002_row_level_security.sql` | RLS: cada usuário só acessa seus próprios dados; catálogo editorial (content, bible_sources, achievements) é leitura pública.                                              |
| `migrations/00003_new_user_bootstrap.sql` | Trigger que cria profile/streak/lumi_state/notification_preferences automaticamente no signup.                                                                             |

## Como aplicar

### Opção A — projeto novo via Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

### Opção B — colar direto no SQL Editor

No painel do projeto (SQL Editor), rode os 3 arquivos de `migrations/` **em
ordem numérica**, um de cada vez.

## Depois de aplicar

1. Copie `../.env.example` para `../.env` e preencha com a URL e a anon key
   do projeto (Project Settings > API).
2. Em **Authentication > Providers**, confirme que Email está habilitado.
   Magic link usa o mesmo provider de Email (Supabase envia link em vez de
   pedir senha, dependendo do método de chamada no client). Para Google/Apple
   OAuth, configure client IDs em **Authentication > Providers** — vai exigir
   configuração adicional nativa (bundle id / package name) antes de
   funcionar em build real, não só no client.

## Segurança e privacidade (briefing §15.6)

- `prayer_entries` tem RLS estrita: só o dono lê/escreve suas orações.
  Nenhuma policy dá acesso a outro usuário nem a `anon`.
- `xp_events` é append-only: authenticated pode inserir, não pode
  editar/apagar eventos já criados.
- Nenhuma tabela pessoal tem policy para o role `anon` — leitura pública só
  existe em `content` (publicados), `bible_sources` (aprovados) e
  `achievements` (catálogo).
- Deletar o usuário em `auth.users` cascateia para todas as tabelas
  pessoais (profiles, streaks, devotional_sessions, xp_events,
  prayer_entries, lumi_state, notification_preferences, user_achievements) —
  cobre o requisito de "permitir exclusão dos registros do usuário".

### Avisos esperados no Security Advisor

`complete_devotional_session` e `complete_onboarding` disparam o aviso
**"Signed-In Users Can Execute SECURITY DEFINER Function"** (lint 0029).
Isso é esperado, não um bug: ambas as funções precisam de `SECURITY
DEFINER` para escrever em `streaks`/`xp_events`/`notification_preferences`
(que o usuário não pode alterar via RLS direto), mas validam `auth.uid()`
internamente e só escrevem na linha do próprio usuário chamador — o padrão
"endpoint público intencional" que a
[própria documentação do lint](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
descreve como seguro. Revogar `EXECUTE` quebraria onboarding e devocional.

Mitigação aplicada (`migrations/00011_security_definer_hardening.sql`):
validação explícita de entrada (faixa etária, nome, tamanho de reflexão)
para que dados inválidos gerem erro claro da própria função em vez de
estourar um constraint genérico do banco. O aviso do Security Advisor
continua aparecendo mesmo assim — isso é esperado, já que o lint sinaliza
a existência do `SECURITY DEFINER` em si, não uma vulnerabilidade
detectada. Reconhecer/ignorar o aviso no dashboard (Security Advisor →
clicar no finding) é a ação correta depois de revisar; não há mudança de
código que faça o aviso desaparecer sem revogar o acesso.

## Migrations 00004 a 00017

Aplique **todas** as migrations em ordem numérica (a tabela acima lista só as três primeiras).
A `00013_security_and_streak_hardening.sql` fecha a escrita direta do cliente em XP/sequência/
conquistas, passa a validar e gravar o fuso do usuário (`set_user_timezone`) e deixa
`complete_devotional_session` idempotente. É segura de aplicar com o app antigo no ar.
A `00014_ai_quota_and_reflection_clear.sql` cria o limite diário de perguntas à IA (15 por dia,
função `consume_ai_quota`, usada pela edge function `ask-about-devotional`) e a função
`clear_session_reflection`, usada pelo botão de apagar reflexão no histórico. Depois de aplicá-la,
reimplante a edge function para o limite passar a valer (sem a função no banco, a edge function
segue sem limite em vez de quebrar).

A `00015_circles.sql` cria os círculos (Fase 3, social): tabelas fechadas para o cliente e funções
que conferem a participação. Sem ela a aba Círculos mostra "estão sendo preparados".

A `00016_streak_freeze.sql` cria a **Folga** (proteção de sequência): colunas `freezes` e
`last_freeze_date` em `streaks` e uma nova `complete_devotional_session` com os campos
`freeze_used`, `freeze_earned` e `freezes_left`. O conector do Supabase cancela SQL com `DROP` ou
`DELETE`; nesse caso rode `supabase/patches/00016_streak_freeze_function.sql` pelo SQL Editor.
Seguro com o app antigo no ar (os campos novos são só extras no retorno).

A `00017_more_achievements.sql` amplia o catálogo de 3 para 14 conquistas (sequências de 3 a 100 dias,
10/50/100 momentos, primeira reflexão, recomeço, primeiro círculo e primeira torcida) e recria
`complete_devotional_session` avaliando todas ao concluir o momento. Não usa `DROP` nem `DELETE`,
então o conector do Supabase aplica sozinho.

