# Lumi

Aplicativo de constância devocional cristã — hábito diário de oração e
Bíblia, com o mascote Lumi (cordeiro). Contexto completo do produto em
[docs/lumi-briefing.md](docs/lumi-briefing.md).

> **Status:** Fase 1 (MVP) completa, exceto IA para oração — próxima etapa,
> bloqueada por escolha de fornecedor de modelo. Onboarding, Hoje,
> devocional (YouVersion + reflexão), streak/XP, conquistas, histórico, 5
> estados do Lumi e lembretes locais já funcionam. Arte final do Lumi
> pendente (produzida à parte).
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

Pré-requisitos: Node.js 20+, npm, e um emulador Android ou simulador iOS
configurado (ou dispositivo físico com depuração USB/Xcode).

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Supabase e a YouVersion App Key
npx expo prebuild
npx expo run:android   # ou run:ios (requer macOS)
```

O app não inicia sem `.env` preenchido (`src/lib/supabase/client.ts` lança
erro se as variáveis faltarem). Veja [supabase/README.md](supabase/README.md)
para criar o projeto e aplicar as migrations.

⚠️ **Não dá para usar o Expo Go** — o SDK YouVersion e o
`expo-notifications` exigem development build. Depois do primeiro
`expo run:android`/`run:ios`, `npm start` funciona normalmente para os
reloads seguintes (mesmo development build instalado no dispositivo).

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
  features/onboarding/  # useProfile()
  features/home/        # useHomeData(), lumiGreeting() — copy do Lumi por estado de streak
  features/devotional/  # useDevotional() — fluxo de leitura + reflexão + conclusão
  features/lumi/        # LumiMascot — SVG placeholder (5 estados); trocar pela arte final
  features/notifications/ # Lembretes locais (expo-notifications)
  features/achievements/  # Catálogo de conquistas (espelha o seed)
  features/profile/       # useProfileHistory() — streak, histórico, conquistas
  lib/supabase/         # Client Supabase + tipos do banco (Database)

supabase/
  migrations/           # SQL: schema, RLS, bootstrap de novo usuário, funções
  seed-content.sql      # Devocional placeholder — rodar manualmente
  seed-achievements.sql # Catálogo de conquistas — rodar manualmente
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

`src/features/lumi/LumiMascot.tsx` renderiza a arte oficial ilustrada do
Lumi (`assets/lumi/*.png`, 512×512, fundo transparente, otimizada com
ffmpeg a partir dos originais 1024×1024). Mapeamento das 5 variantes do
MVP (`normal`, `happy`, `celebrating`, `waiting`, `missing_you`) para os
arquivos de imagem — a arte ainda não cobre 1:1 todas as variantes:
`celebrating` reaproveita `lumi-happy.png` e `waiting` reaproveita
`lumi-sassy.png`, até termos ilustrações dedicadas. `lumi-surprised.png`
e `lumi-accessory-glasses.png` chegaram no mesmo lote mas ainda não são
usadas — ficam para quando o conjunto de estados for expandido na Fase 2.

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

O SDK exige oficialmente Expo SDK 56; estamos no 57. Foi instalado com
`--legacy-peer-deps` e o bundle compila (Android e o bundle DOM auxiliar),
mas sem garantia oficial de suporte — revisar quando o SDK anunciar
compatibilidade com SDK 57.

**Pendente de confirmação com a YouVersion** (doc pública não especifica):
política de cache/retenção do texto retornado pela API. Não assumir
armazenamento de longo prazo do conteúdo bíblico até confirmar nos Termos
de Uso (platform.youversion.com/?tos=1) ou com o suporte oficial.

### Login com YouVersion

Botão "Entrar com YouVersion" na tela de auth usa `useYVAuth()`
(`@youversion/platform-react-native-expo-core`) para autenticar com a
conta YouVersion do usuário, depois faz a ponte para uma sessão Supabase
real via magic link automático no email retornado (`useYVAuth` e o
Supabase Auth são sistemas independentes — não existe SSO direto entre
eles). Login "num toque só" exigiria uma Edge Function validando o token
YouVersion e emitindo sessão Supabase via admin API; adiado por
simplicidade — ver `app/(auth)/index.tsx`.

**Ação necessária no painel da YouVersion**: o redirect URI `lumi://callback`
(configurado em `app/_layout.tsx`, `youVersionAuthConfig`) precisa estar
registrado em platform.youversion.com para o fluxo de login funcionar —
sem isso o `signIn()` falha no callback.

## Notificações

Lembretes locais via `expo-notifications` (sem backend/push remoto ainda —
briefing §14 fala em "lembrete no horário escolhido" + "lembrete
alternativo se não concluir", ambos cobertos localmente por ora):

- Lembrete principal no horário de `notification_preferences.preferred_time`.
- Lembrete alternativo 4h depois, tom mais leve, se a sequência não avançar.
- Agendado ao concluir o onboarding e re-sincronizado a cada abertura do
  app (`useNotificationScheduler`, no layout raiz) — reflete mudanças de
  horário/preferência sem precisar reabrir o app manualmente.
- Requer permissão do usuário (`requestNotificationPermission`) e, como o
  restante do app, development build — não funciona no Expo Go.
- Toda copy de notificação passa pelo checklist da skill
  `lumi-brand-guardrails`: persistente e contextual, nunca com culpa
  religiosa.
