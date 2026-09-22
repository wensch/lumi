# Lumi

Aplicativo de constância devocional cristã — hábito diário de oração e
Bíblia, com o mascote Lumi (cordeiro). Contexto completo do produto em
[docs/lumi-briefing.md](docs/lumi-briefing.md).

> **Status:** Fase 0 (identidade, shell de UI, Supabase conectado, auth
> funcional). Dados de produto (streak, XP, devocional) ainda são mock. Sem
> integração com YouVersion, IA ou notificações push.

## Stack

- **Frontend:** React Native + Expo + TypeScript, navegação via
  [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, 4
  abas: Hoje / Bíblia / Lumi / Perfil).
- **Backend:** Supabase (auth, Postgres, storage). Migrations em
  [supabase/migrations/](supabase/migrations/) — ver
  [supabase/README.md](supabase/README.md) para aplicar.
- **IA (futuro):** sempre via backend próprio, nunca client-side.

## Como rodar

Pré-requisitos: Node.js 20+, npm, e o app **Expo Go** no celular (ou um
emulador Android/simulador iOS configurado).

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Supabase
npm start
```

O app não inicia sem `.env` preenchido (`src/lib/supabase/client.ts` lança
erro se as variáveis faltarem). Veja [supabase/README.md](supabase/README.md)
para criar o projeto e aplicar as migrations.

Isso abre o Metro bundler com um QR code. Escaneie com o Expo Go (Android)
ou a câmera (iOS) para abrir o app no celular. Atalhos no terminal do Metro:
`a` (abrir no emulador Android), `i` (simulador iOS), `w` (navegador).

Scripts alternativos:

```bash
npm run android   # abre direto no emulador Android
npm run ios       # abre direto no simulador iOS (só macOS)
npm run web       # abre no navegador
```

## Qualidade de código

```bash
npm run lint          # ESLint (eslint-config-expo)
npm run format         # Prettier — formata tudo
npm run format:check   # Prettier — só verifica
npm run typecheck      # tsc --noEmit
```

## Estrutura de pastas

```
app/                    # Rotas (Expo Router) — cada arquivo é uma tela
  _layout.tsx           # Layout raiz: fontes, splash screen, redirect auth/(tabs)
  (auth)/
    index.tsx           # Login / criar conta / magic link
  (tabs)/
    _layout.tsx         # Navegação em abas (Hoje / Bíblia / Lumi / Perfil)
    index.tsx           # Hoje
    biblia.tsx           # Bíblia
    lumi.tsx             # Lumi
    perfil.tsx           # Perfil (mostra usuário logado + Sair)

src/
  theme/                # Design tokens: cores, tipografia, espaçamento
  components/           # Componentes base: Button, Card, TextField, StreakBadge, XPBadge, ScreenContainer
  features/auth/        # AuthProvider (sessão Supabase) + useAuth()
  lib/supabase/         # Client Supabase + tipos do banco (Database)

supabase/
  migrations/           # SQL: schema, RLS, bootstrap de novo usuário
  config.toml           # Config de auth (Supabase CLI)

docs/
  lumi-briefing.md      # Fonte de verdade de produto e identidade
```

Import de módulos internos usa o alias `@/*` → `src/*` (ex:
`import { Button } from '@/components'`).

## Design system

Os tokens em `src/theme/` seguem a paleta e tipografia hipótese definidas no
briefing (§9.3–9.4) e na skill `lumi-design-tokens`:

- Cores: verde principal `#4CAF72`, verde escuro `#245C42`, creme `#FAF9F4`,
  amarelo `#FFC857`, azul `#5B8DEF`, tinta `#202124`.
- Tipografia: Nunito (provisório — decisão final após protótipo visual).

Qualquer copy, texto do Lumi ou nova UI deve respeitar as skills
`lumi-brand-guardrails` e `lumi-design-tokens`.

## Autenticação

`(auth)/index.tsx` tem login (email+senha), criação de conta e magic link
num único formulário com toggle. `AuthProvider`
(`src/features/auth/AuthProvider.tsx`) mantém a sessão via
`supabase.auth`, persistida com AsyncStorage. O layout raiz redireciona
automaticamente entre `(auth)` e `(tabs)` com base na sessão.

Magic link e confirmação de email exigem a Redirect URL configurada no
painel Supabase (Authentication > URL Configuration) apontando para o
scheme do app (`lumi://`, já definido em `app.json`). OAuth (Google/Apple)
ainda não está implementado — ver `supabase/README.md`.
