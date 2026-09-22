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
