# Lumi — Roadmap até o lançamento

Decisão do produto (09/10/2026): terminar **tudo**, inclusive a Fase 4, antes de apagar os dados de teste e publicar nas lojas.
Cada bloco é entregue, testado em aparelho e só então começa o próximo.

## Bloco A — Fechar a experiência (Fase 2)
1. ✅ **Folga** (proteção de sequência) — 1 dia perdido não zera a sequência. Ganha 1 Folga a cada 7 dias seguidos (máx. 2), usada sozinha. Sem culpa e sem nome religioso (o briefing §7.3 pede cuidado para não banalizar "Graça").
2. ✅ **Mais conquistas** (14, migration 00017) — marcos de sequência (3, 14, 50, 100), primeira reflexão, primeira vez no círculo, volta depois de uma pausa.
3. ✅ **Evolução do Lumi** (12 itens em 5 categorias, marcos 7/14/21/30/50/100/200/365, movimento nos itens especiais) — itens liberados por constância (7, 14, 30, 50, 100 dias), conforme briefing §8.7.

## Bloco B — Social completo (Fase 3)
4. ✅ **Notificação push entre membros** (testado em aparelho) — "fulano orou por você", "fulano torceu por você" (token no banco + Edge Function, respeitando as preferências).
5. ✅ **Preferências de notificação** — ligar/desligar lembretes, recados de retorno e avisos do círculo.

## Bloco C — Expansão (Fase 4)
6. ✅ **Planos de leitura** (6 planos de 6 a 30 dias, montados com os devocionais aprovados; migration 00019) — séries sobre um tema, com progresso, um dia por dia.
7. ✅ **Desafios** (6 pessoais + 3 de círculo, migration 00020) — metas curtas de 7 ou 30 dias, sozinho ou no círculo, com progresso somado e sem ranking.
8. ✅ **Áudio** — botão "ouvir" nos passos de leitura do devocional (versículo e textos), com a voz do próprio aparelho (`expo-speech`): sem internet, sem custo e sem conta; para ao trocar de passo, sair da tela ou ir ao segundo plano.
9. ✅ **Eventos** — Advento (24 dias), Natal (7) e Páscoa (8): planos especiais que só aparecem na época (datas 2026–2035), 39 devocionais próprios (fora do sorteio do dia), conquista de cada evento e 5 itens novos do Lumi (coroa do Advento, gorro e estrela de Natal, lírio e amanhecer de Páscoa). ⚠️ As janelas de 2026 estão abertas de propósito para teste: antes de publicar, rode `supabase/patches/restore-event-windows.sql`.

9.1 ✅ **Feedback do teste (14/10)** — seletor de voz mais limpo (nomes simples, dois grupos, botão de amostra); itens do Lumi nos primeiros dias (broto no 1º devocional, sininho em 3 dias, mochila em 5); **desafios criados pela pessoa** (pessoais e do círculo; migration 00025); **planos criados pela pessoa** (um livro da Bíblia, um capítulo por dia, ou acompanhamento de um plano do YouVersion; migration 00026). A API da YouVersion não oferece o conteúdo dos planos, por isso não dá para importá-los.

9.2 ✅ **Navegação (16/10)** — a aba Lumi virou **Jornada** (plano de leitura em andamento + desafios, com atalhos para criar os seus); o Lumi e o guarda-roupa abrem pelo botão/mascote no topo da Hoje. **Pente fino 16/10** — ver o relatório no chat; migration 00027.

9.3 ✅ **Jornada com áreas separadas, histórico paginado e retorno do login YouVersion (25/10)** — a aba Jornada ganhou duas áreas coloridas (plano de leitura e desafios); o histórico de reflexões carrega mais (40 por vez), sem teto de 60; o retorno `lumi://callback` não derruba mais a tela de login (`app/+native-intent.tsx`; só dá para validar no aparelho).

## Bloco D — Qualidade
10. **Inglês completo** — telas e devocionais.
11. **Métricas** — ativação, D1/D7/D30, conclusão (briefing §16), sem dados de oração.
12. **Relatório de erros** (crash reporting).
13. **Acessibilidade e desempenho** (auditoria de 25/10 feita com a skill `acessibilidade`: contraste nas 4 paletas, papéis/rótulos, alvos de toque e "reduzir movimento" corrigidos; falta testar com TalkBack e fonte máxima no aparelho) — leitor de tela, fontes grandes, modo escuro, celulares simples.

## Bloco E — Lançamento (por último)
14. Nome definitivo e ícone final.
15. Política de privacidade, termos e **apagar conta e dados** (exigido pelas lojas).
16. Assinatura de release (Play Store / App Store), fichas das lojas, capturas de tela.
17. **Apagar os dados de teste** do Supabase e publicar. Antes de publicar nas lojas: restringir `apk.yml`/`site.yml` à branch `main` (hoje qualquer `ccr-*` publica o `apk-latest`), migrar o login para PKCE e guardar a sessão no SecureStore, e restringir a chave de API do Firebase ao pacote `com.lumi.app`. Antes: rodar `supabase/patches/restore-event-windows.sql` (volta as datas reais dos eventos de 2026).
