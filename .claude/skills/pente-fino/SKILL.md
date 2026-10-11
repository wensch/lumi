---
name: pente-fino
description: Revisão completa do Lumi (app + banco + funções + CI). Use SEMPRE que o usuário pedir "pente fino", "faz um pente fino", "revisão geral" ou "teste o app inteiro". Analisa o código todo, acha e já corrige bugs, falhas de segurança, problemas de desempenho e inconsistências, testa o app inteiro e propõe melhorias.
---

# Pente fino

Revisão de ponta a ponta do Lumi. O objetivo é **achar e já corrigir** o que estiver errado, provar que
funciona e, no fim, propor melhorias (sem sair implementando o que for decisão de produto).

Responda ao usuário sempre em **português do Brasil**, curto e legível no celular.

Antes de começar, leia `AGENTS.md`, `docs/lumi-briefing.md` (regras de produto e tom: sem culpa, sem
ranking, sem comparação) e `docs/roadmap-lancamento.md`. Em qualquer API do Expo/React Native, confira a
documentação da versão instalada (ver AGENTS.md) em vez de confiar na memória.

## Regras

- Corrija o que for bug, segurança ou desempenho **comprovado**. Mudanças de produto, visual ou escopo
  viram **proposta**, não código.
- Cada correção: mínima, no estilo do código ao redor, sem refatorar o que não precisa.
- Nunca pule nem desligue teste/lint para passar. Nunca apague dados do Supabase.
- O conector do Supabase cancela SQL com `DROP`/`DELETE`: nesse caso gere um patch em
  `supabase/patches/` e peça ao usuário para rodar.
- Segredos (chaves, `google-services.json`, service account) nunca vão para o repositório nem para
  o relatório.
- Se algo não puder ser testado aqui (aparelho, push real, loja), diga claramente o que ficou sem teste.

## Passo a passo

### 1. Base verde

Rode `npm run format:check`, `npm run typecheck` e `npm run lint`. Se algo falhar, corrija antes de seguir
(é o mesmo que o CI roda antes de compilar o APK). Rode também `npx expo-doctor` e `npx expo install --check`
para dependências incompatíveis com o SDK.

### 2. Mapa do código

Liste `app/`, `src/`, `supabase/`, `.github/`, `site/`, `docs/`. Para as áreas abaixo, **leia o código de
verdade** (não só procure por palavras). Para revisão ampla, divida por área e use subagentes em paralelo
(um por área), pedindo que devolvam achados com arquivo:linha e a correção proposta; depois **verifique cada
achado você mesmo** antes de corrigir (agentes erram).

### 3. O que procurar

**Bugs e fluxo**

- Navegação: rotas, redirecionamentos (login → onboarding → abas), voltar do Android, links
  `lumi://` e a página de convite.
- Estados de tela: carregando, vazio, erro, sem internet, toque duplo, desmontar durante `await`.
- Datas e fuso: sempre o dia **local** da pessoa (histórico de bugs aqui). Virada de dia, mudança de fuso.
- Hooks: dependências, vazamento de listeners/timers, `useFocusEffect` sem limpeza, estado após desmontar.
- Tipos: `any`, `as` forçado, `!` sem garantia, erros engolidos por `catch {}`.
- Regras de produto: sequência/Folga/XP/conquistas/planos/desafios coerentes entre si.

**Segurança**

- Supabase: toda tabela com RLS e fechada ao cliente; só funções `SECURITY DEFINER` com
  `set search_path`, checando `auth.uid()` e participação; `revoke` de `public`/`anon` e `grant` só
  para `authenticated`; funções internas sem acesso do cliente. Rode `get_advisors` (security e
  performance) e trate cada alerta.
- Nada de service role, chave de API privada ou segredo no app; só a chave pública. Procure por
  chaves/tokens em todo o repositório e no histórico recente (`git log -p -S`).
- Edge functions: JWT verificado, validação e limite de tamanho da entrada, timeout, limite diário,
  sem devolver texto privado (pedidos de oração) em push ou log.
- Privacidade: reflexões e pedidos de oração nunca em métricas, logs ou notificações com texto.
- Deep links e parâmetros de rota: validar antes de usar. Links externos só https esperados.
- Dependências: `npm audit` (avaliar o que realmente afeta o app).
- CI: segredos só em `secrets`, permissões mínimas do workflow, sem imprimir segredos.

**Desempenho**

- Re-renderizações desnecessárias, listas longas sem `FlatList`, imagens grandes, animações fora do
  driver nativo, `useEffect` que dispara rede em loop, chamadas repetidas ao banco que poderiam ser uma só.
- Banco: índices para os filtros das funções, consultas sem limite, N+1 dentro de funções. Veja os
  alertas de performance do `get_advisors`.
- Tamanho do APK e dependências sem uso (`npx depcheck`, se disponível).
- Celulares simples: respeitar "reduzir movimento", fonte grande e tema escuro.

**Qualidade e refinamento**

- Código morto, duplicação clara, nomes confusos, comentários que mentem.
- Textos: tudo via i18n, pt e en com as mesmas chaves, tom acolhedor e sem culpa.
- Acessibilidade: `accessibilityLabel`/`role` nos botões de ícone, contraste, alvos de toque grandes.
- Consistência visual com o tema (tokens, sem cores soltas).

### 4. Testar o app inteiro

- **Banco (Postgres 16 local)**: `pg_ctlcluster 16 main start`; carregue as migrations em ordem num banco
  de teste (`lumitest`, com stub de `auth`) e rode os cenários de `supabase/tests/` (veja o README da pasta); se
  não existirem, escreva cenários novos para as funções que mudaram (casos felizes, sem permissão, não
  membro, repetição, limites). Use mais de um usuário para testar o que um não pode ver do outro.
  Limpe os dados entre cenários para não poluir os testes seguintes.
- **Lógica pura**: teste funções puras (ex.: planejamento de lembretes, datas) com um script rápido.
- **App**: com o dev server (`npx expo start`) ou export web (`npx expo export --platform web`), abra
  no Chromium/Playwright já instalado (não rode `playwright install`) e percorra as telas que rodarem na
  web: login, onboarding, Hoje, devocional, conclusão, Bíblia, Lumi, Perfil, Configurações, Círculos,
  Planos, Desafios. Registre erros de console e capturas de tela. O que depender de módulo nativo
  (push, haptics, compartilhar) fica na lista "só no aparelho".
- **Backend remoto** (conector Supabase): `list_tables`, `get_advisors`, `list_edge_functions`, e consultas
  só de leitura para conferir contagens e dados de seed (planos, desafios, conteúdo publicado).
- **CI**: confira os últimos runs em Actions; falhas recorrentes também são achado.

### 5. Corrigir

Para cada achado confirmado: corrija, rode os testes relacionados, e rode de novo
`format:check`, `typecheck` e `lint`. Mudanças de banco entram como **nova migration numerada** (nunca edite
uma já aplicada), são testadas no Postgres local e só então aplicadas pelo conector.

### 6. Entregar

1. Atualize `docs/` se algo mudou (briefing, `supabase/README.md`, roadmap).
2. Commit com mensagem que descreva as correções por tema (Fluxo, Segurança, Banco, Desempenho,
   Interface) e os trailers de atribuição pedidos pelo ambiente. Push na branch da sessão.
3. Se mudou código do app, agende um aviso (`send_later`, ~18 min) para conferir o build e avisar o usuário
   com o link do APK (`https://github.com/wensch/lumi/releases/tag/apk-latest`).
4. Responda ao usuário com um relatório curto:
   - **Corrigi** (lista curta, 1 linha cada, com o impacto para a pessoa que usa o app);
   - **Testei** (o que foi coberto e como);
   - **Não deu para testar aqui** (precisa do aparelho/lojas);
   - **Proponho** (melhorias priorizadas, cada uma com esforço e ganho; pergunte antes de fazer as que
     mudam o produto).
