---
name: acessibilidade
description: Auditoria e correção de acessibilidade do Lumi (WCAG 2.2 AA em React Native/Expo) — leitor de tela (TalkBack/VoiceOver), rótulos e papéis, alvos de toque, contraste nas 4 paletas, fonte grande, "reduzir movimento", foco e estados. Use quando o usuário pedir auditoria de acessibilidade, ao criar ou mexer em telas/componentes, e no Bloco D do roadmap.
---

# Acessibilidade no Lumi

Adaptada da skill `accessibility` do ECC (MIT, ver `../NOTICE-ECC.md`) para React Native/Expo. Responda ao
usuário em **português do Brasil**, curto e legível no celular.

O Lumi é um app de hábito devocional: gente de todas as idades, com celulares simples, às vezes com fonte
grande ou leitor de tela. Acessibilidade aqui é parte do produto, não enfeite.

## Regras de ouro (React Native)

1. **Todo botão só de ícone ou emoji tem `accessibilityLabel`** (no `Pressable`, não no ícone).
   `Ionicons` e emojis soltos são lidos mal ("sol", "carinha") ou ignorados.
2. **Todo `Pressable` tem `accessibilityRole`** (`button`, `radio`, `switch`, `tab`, `link`, `checkbox`) e,
   quando muda, `accessibilityState` (`selected`, `disabled`, `checked`, `expanded`, `busy`).
3. **Alvo de toque ≥ 44 × 44 pt.** Se o visual é menor, aumente `minHeight`/`minWidth` ou use `hitSlop`
   (8 em cada lado leva um alvo de 32 pt a 48 pt). Botões vizinhos não podem ter `hitSlop` sobreposto.
4. **Contraste ≥ 4,5:1** para texto normal e 3:1 para texto grande, bordas e ícones — **em todas as 4
   paletas** (recorte, trilha, aurora, noite). Rode `node .claude/skills/acessibilidade/contraste.mjs`.
   Nunca passe informação só por cor (erro = cor + texto/ícone). **Nunca `muted` sobre `yellow`**
   (4,29:1 em recorte, 3,09:1 em noite): em cartão amarelo use `ink` (padrão `onCardMuted`).
5. **Texto cresce com a fonte do sistema.** Evite `height` fixo em textos; use `minHeight`. Em selos,
   abas e chips pequenos limite com `maxFontSizeMultiplier` (1.2 a 1.3) em vez de desligar o `allowFontScaling`.
6. **"Reduzir movimento"**: animação em loop ou grande usa `useReduceMotion` (`src/lib/useReduceMotion.ts`)
   ou `AccessibilityInfo.isReduceMotionEnabled()`. `FadeIn` já respeita; confira `Skeleton`, mascote e confete.
7. **Campos de texto** têm rótulo visível e `accessibilityLabel` (o `TextField` já faz). Erro aparece como
   texto perto do campo, não só borda vermelha; erros novos usam `accessibilityLiveRegion="polite"`.
8. **Estado que muda sozinho** (progresso, contagem, "salvando") usa `accessibilityLiveRegion="polite"` ou
   `accessibilityRole="progressbar"` com `accessibilityValue={{ min, max, now }}` (ver `components/ProgressBar`).
9. **Agrupe o que é uma coisa só**: um cartão tocável vira **um** `Pressable` com um `accessibilityLabel`
   que resume (título, dias, status), em vez de 4 elementos soltos. Elementos só decorativos
   (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`).
10. **Texto com emoji**: o leitor lê o nome do emoji. Em rótulos, escreva o texto sem o emoji.
11. **Imagens e SVG**: o mascote tem `accessibilityLabel`; ilustração puramente decorativa fica oculta.
12. **Ordem de leitura = ordem visual.** Evite `position: absolute` para conteúdo que muda a ordem.
13. **Alert/modal**: o botão de cancelar sempre existe; ações destrutivas usam `style: 'destructive'`.
14. **Língua**: textos via i18n (pt e en); o leitor usa o idioma do sistema.

## Como auditar (nesta ordem)

1. **Base verde**: `npm run typecheck && npm run lint`.
2. **Contraste**: `node .claude/skills/acessibilidade/contraste.mjs`. Cada par abaixo de 4,5:1 vira achado
   (veja onde o par é usado com `grep -rn "muted" app src | grep -i yellow` etc.).
3. **Varredura de código** (cada comando devolve candidatos; leia o trecho antes de concluir):
   - Botões sem papel: `grep -rn "<Pressable" app src --include=*.tsx -A6 | grep -L accessibilityRole` (use
     por arquivo) ou leia cada `Pressable`.
   - Botões só de ícone/emoji sem rótulo: procure `<Ionicons`/emoji dentro de `Pressable` sem `accessibilityLabel`.
   - Alvos pequenos: `grep -rnE "(width|height|minHeight): ([0-9]|[1-3][0-9])\b" app src` em estilos de botão;
     `paddingVertical` baixo em `Pressable`.
   - `maxFontSizeMultiplier`/`allowFontScaling={false}` espalhados sem motivo.
   - Animações: `grep -rn "Animated.loop\|useNativeDriver" app src` e confirme "reduzir movimento".
   - Cores soltas (hex) fora de `src/theme`: `grep -rnE "#[0-9A-Fa-f]{6}" app src --include=*.tsx`.
   - Texto fixo fora do i18n: `grep -rnE ">[A-ZÁÉÍÓÚ][a-záéíóú ]{4,}<" app src --include=*.tsx`.
4. **Telas, uma a uma**: Hoje, Jornada, Planos (lista, detalhe, novo), Desafios, Círculos (lista, detalhe),
   Bíblia, Devocional (passos e conclusão), Lumi, Perfil, Configurações, Login e Onboarding. Para cada uma,
   imagine a leitura com TalkBack: ordem, o que é anunciado, o que falta, o que sobra.
5. **O que só dá para testar no aparelho** (diga ao usuário): TalkBack/VoiceOver de verdade, fonte do sistema
   no tamanho máximo, "remover animações", modo escuro, tela pequena (~360 dp), tema com alto contraste.

## Como corrigir

- Corrija direto o que é **objetivo**: rótulo/papel/estado faltando, `hitSlop`/`minHeight`, cor de texto
  que falha no contraste (use `ink` no lugar de `muted` em fundo colorido), `accessibilityLiveRegion`.
- **Proponha, não faça**, o que muda o visual de forma perceptível (aumentar chips, trocar paleta, mexer em
  layout). Diga o ganho e o esforço.
- Componentes compartilhados primeiro (`Button`, `Card`, `TextField`, `ScreenHeader`, `ProgressBar`,
  `FloatingTabBar`): uma correção vale para o app todo.
- Depois: `npm run format:check`, `npm run typecheck`, `npm run lint`.

## Entrega

Relatório curto: **Corrigi** · **Achei e proponho** (esforço/ganho) · **Só no aparelho** · **Pontos fortes**.
Atualize a linha de acessibilidade do `docs/roadmap-lancamento.md` (Bloco D) quando mudar o estado.
