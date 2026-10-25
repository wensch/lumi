---
name: i18n-sync
description: Mantém os textos do Lumi em português e inglês sincronizados (src/i18n/locales/pt.ts e en.ts) — chaves novas, textos alterados, revisão de traduções faltando ou velhas, tom do app e glossário. Use ao adicionar ou mudar qualquer texto de tela, ao revisar "inglês completo" (Bloco D do roadmap) ou quando pedirem para traduzir/sincronizar idiomas.
---

# i18n no Lumi (pt ⇄ en)

Adaptada da skill `i18n-sync` do ECC (MIT, ver `../NOTICE-ECC.md`). Responda em **português do Brasil**, curto.

## Como o i18n do projeto funciona

- Arquivos: `src/i18n/locales/pt.ts` (**fonte de verdade**, define o tipo `TranslationSchema`) e
  `src/i18n/locales/en.ts` (tipado a partir de pt: faltou chave, o `npm run typecheck` quebra).
- Uso: `const { t } = useTranslation(); t('plans.start')`; fora de componente, `translate('errors.x')`
  (`src/i18n`). Placeholders `{{nome}}`: `t('plans.dayProgress', { done, total })`.
- Plural: objeto `{ one: '…', other: '… {{count}} …' }` (ver `challenges`/`lumi.daysToGo`).
- Chaves dinâmicas montadas em código (`t(\`lumi.milestones.d${n}.title\`)`, `challenges.errors.${code}`,
`events.${slug}`): **ao criar um valor novo do tipo, crie a chave nos dois idiomas**.
- Textos que vêm do **banco** (devocionais, planos, desafios, conquistas, itens de eventos) hoje existem só em
  português. Traduzi-los é trabalho à parte (Bloco D) — não tente resolver só no app.

## Fluxo

1. **Lista de trabalho**: `node .claude/skills/i18n-sync/verificar.mjs` (mesmas chaves, mesmos `{{placeholders}}`,
   texto vazio, texto igual nos dois idiomas). Mais `git diff -- src/i18n` para ver o que mudou no pt.
2. **Contexto**: para cada chave nova/alterada, ache onde é usada (`grep -rn "chave" app src`) e leia o
   componente: é botão, título, erro, aviso do leitor de tela, fragmento? Qual o limite de espaço?
3. **Traduza**: pt primeiro (se a chave é nova), depois en. Agrupe por tela para manter a terminologia.
4. **Valide**: `node .claude/skills/i18n-sync/verificar.mjs && npm run typecheck && npm run lint && npm run format:check`.
5. **Relate**: chaves novas/mudadas, decisões de tom, o que ficou pendente (ex.: texto do banco).

## Tom e glossário

Tom do Lumi (briefing §7–8): **acolhedor, sem culpa, sem ranking, sem comparação**; o Lumi nunca fala como
autoridade espiritual; XP e sequência são **constância**, não mérito. Frases curtas, voz ativa, "você".
Evite "falhou", "perdeu", "atrasado", "só"; prefira "dá para tentar de novo".

| pt                          | en                          | Observação                                               |
| --------------------------- | --------------------------- | -------------------------------------------------------- |
| Lumi                        | Lumi                        | não traduzir (nome do mascote/app)                       |
| sequência                   | streak                      |                                                          |
| Folga                       | Rest day                    | não é "freeze" nem "pause"; Folga cobre um dia sem culpa |
| momento (devocional do dia) | moment / devotional         | "momento" = o hábito diário; "devocional" = o texto      |
| círculo                     | circle                      | grupo pequeno de pessoas conhecidas                      |
| pedido de oração            | prayer request              |                                                          |
| torcer / torcida            | cheer                       | "torcer por você" = "cheering for you"                   |
| gratidão / atendido         | answered                    | "marcar gratidão" = "mark as answered"                   |
| plano de leitura            | reading plan                |                                                          |
| desafio                     | challenge                   | meta curta de constância                                 |
| Jornada                     | Journey                     | aba de planos e desafios                                 |
| Advento / Natal / Páscoa    | Advent / Christmas / Easter |                                                          |
| YouVersion, NVI             | idem                        | não traduzir                                             |

## Cuidados

- Nunca altere um `{{placeholder}}` (nome e quantidade iguais nos dois idiomas; a ordem pode mudar).
- Inglês é mais curto que o português na maioria dos botões; o contrário acontece em rótulos de aba — confira
  o espaço (abas e chips são pequenos).
- Texto sensível (privacidade, política, termos, aviso legal, pedidos de oração) → revisão de uma pessoa
  nativa/jurídica antes de publicar.
- Não escreva texto fixo em componente: tudo vai para os locales.
- Não use ferramenta externa para "aplicar" traduções: edite os `.ts` com precisão; o formato é código TypeScript.
