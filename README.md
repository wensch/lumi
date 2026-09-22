# Lumi

Aplicativo de constância devocional cristã — hábito diário de oração e
Bíblia, com o mascote Lumi (cordeiro). Contexto completo do produto em
[docs/lumi-briefing.md](docs/lumi-briefing.md).

> **Status:** Fase 0 quase completa (identidade, shell de UI, Supabase
> conectado, auth funcional, mascote placeholder). YouVersion integrada via
> SDK oficial (leitura de passagens). Sem IA ou notificações push ainda.
> Arte final do Lumi pendente (produzida à parte).
>
> ⚠️ **Requer development build** — o SDK YouVersion não funciona no Expo
> Go. Ver [Integração YouVersion](#integração-youversion) abaixo.

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
  features/lumi/        # LumiMascot — SVG placeholder (normal/happy); trocar pela arte final
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
- Tipografia: Nunito (decisão final, briefing §9.4).

Qualquer copy, texto do Lumi ou nova UI deve respeitar as skills
`lumi-brand-guardrails` e `lumi-design-tokens`.

## Mascote Lumi

`src/features/lumi/LumiMascot.tsx` é um placeholder vetorial (SVG via
react-native-svg) com os estados `normal` e `happy`, desenhado em código
como substituto temporário — sem gerador de imagem disponível no ambiente
de desenvolvimento. A arte final está sendo produzida à parte; quando
chegar, substituir o conteúdo deste componente (ou trocá-lo por
`<Image>`/Lottie apontando para os assets finais) mantendo a mesma API
(`mood`, `size`) para não precisar tocar nas telas que já o consomem.

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

## Integração YouVersion

Usa o SDK oficial (`@youversion/platform-react-native-expo-ui` +
`-core`), client-side — é o padrão suportado pela própria YouVersion para
leitura de conteúdo bíblico (diferente da regra "sempre backend" que vale
para IA). A App Key vai em `EXPO_PUBLIC_YOUVERSION_APP_KEY` no `.env`
(pegue em platform.youversion.com), configurada no `YouVersionProvider` em
`app/_layout.tsx`.

**Development build obrigatório**: o SDK não roda no Expo Go. Para testar:

```bash
npx expo prebuild
npx expo run:android   # ou run:ios (requer macOS)
```

O SDK exige oficialmente Expo SDK 56; estamos no 57. Foi instalado com
`--legacy-peer-deps` e o bundle compila (Android e o bundle DOM auxiliar),
mas sem garantia oficial de suporte — revisar quando o SDK anunciar
compatibilidade com SDK 57.

**Pendente de confirmação com a YouVersion** (doc pública não especifica):
política de cache/retenção do texto retornado pela API. Não assumir
armazenamento de longo prazo do conteúdo bíblico até confirmar nos Termos
de Uso (platform.youversion.com/?tos=1) ou com o suporte oficial.
