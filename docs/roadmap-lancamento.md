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
10. **Inglês completo** — telas (616 textos nos dois idiomas, conferidos por `.claude/skills/i18n-sync/verificar.mjs`) e conteúdo do banco: 73 devocionais, 9 planos e 9 desafios traduzidos (migration 00029 + `supabase/seed-translations-en.sql`), lidos pelo app no idioma inglês. ⚠️ A tradução foi feita pelo Claude e precisa da sua revisão antes de publicar. Falta: a IA responder usando o texto em inglês (hoje usa o português como contexto) e as 20 conquistas (já têm título em inglês no app).
11. ✅ **Métricas** (25/10) — eventos de uso só com nome e dia (`app_events`, migration 00028), resumo com ativação, D1/D7/D30, constância e conclusão (`metrics_summary()`, no SQL Editor). Sem dados de oração nem texto. Guia em `docs/metricas.md`. Pendente: avisos enviados e retorno após quebra de sequência.
12. ✅ **Relatório de erros** (25/10) — erros de JavaScript vão para `app_errors`, sem identificação, com aspas, e-mails e links apagados e teto por hora. Sem serviço de terceiros. Pendente: erros nativos (travamentos fora do JavaScript); decidir se entra um serviço como o Sentry.
13. **Acessibilidade e desempenho** (auditoria de 25/10 feita com a skill `acessibilidade`: contraste nas 4 paletas, papéis/rótulos, alvos de toque e "reduzir movimento" corrigidos; falta testar com TalkBack e fonte máxima no aparelho) — leitor de tela, fontes grandes, modo escuro, celulares simples.

## Bloco E — Lançamento (por último)
14. Nome definitivo e ícone final.
15. Política de privacidade, termos e **apagar conta e dados** (exigido pelas lojas). **Política de privacidade: rascunho pronto (13/11)** em português e inglês (`docs/politica-de-privacidade.md`; páginas `site/privacidade` e `site/privacy`; link em Configurações > Privacidade e na tela de entrada). Contato: wensch22@gmail.com. **Consentimento dos pais** para a faixa "Criança" no cadastro (migration 00039). **Excluir conta no app** (Configurações > Conta; função `delete-account` + gatilho da migration 00036) e **limpeza automática** dos dados antigos (00037). Falta: conferir o texto com a pessoa que cuidará do jurídico (nome completo e CPF/CNPJ do responsável, se as lojas pedirem), **termos de uso**, e decidir `store:false` na chamada ao Gemini.
16. Assinatura de release (Play Store / App Store), fichas das lojas, capturas de tela.
17. **Apagar os dados de teste** do Supabase e publicar. Antes de publicar nas lojas: restringir `apk.yml`/`site.yml` à branch `main` (hoje qualquer `ccr-*` publica o `apk-latest`), migrar o login para PKCE e guardar a sessão no SecureStore, e restringir a chave de API do Firebase ao pacote `com.lumi.app`. Antes: rodar `supabase/patches/restore-event-windows.sql` (volta as datas reais dos eventos de 2026).

## Banco de ideias (fora do roadmap até o dono decidir)
Ideias que apareceram durante o desenvolvimento. Nenhuma está no escopo do lançamento; cada uma entra no roadmap só quando o dono decidir.

**I1. Ler antes de rolar: pausa gentil dos apps de distração** (ideia vista no app BibleScroll, de Screen Detox Inc, em 12/11/2026).
- **O que é:** a pessoa escolhe apps que a distraem (ex.: Instagram) e, ao abri-los, o celular lembra de fazer o momento do dia no Lumi antes. Quem faz, ganha acesso liberado; a sequência continua sendo o prêmio. O BibleScroll vende isso como "Read the Bible before you scroll" e "Read the Bible to unlock Instagram", com contagem de dias seguidos e "um versículo para começar o dia". Nota 4,9 com 22 mil avaliações, grátis com compras no app, 26 MB, na categoria "Foco Cristão".
- **Encaixe com o Lumi:** a ideia reforça a constância, que é o coração do app. O cuidado é com o tom: o Lumi não cobra nem culpa (briefing §7.3), então a versão do Lumi deveria ser uma **pausa convidativa** ("Que tal um minuto de devocional antes?") com saída fácil ("Agora não"), nunca um bloqueio rígido. Isso precisa de decisão do dono.
- **Como poderia funcionar (a confirmar antes de construir):**
  - Android: detectar o app aberto (permissão de "acesso ao uso" do sistema) e mostrar uma tela do Lumi por cima. Cuidado: a Google Play restringe serviços de acessibilidade e sobreposição de tela, e a análise da loja pode barrar.
  - iOS: só pelo Screen Time (Family Controls), que exige uma permissão especial aprovada pela Apple.
  - Nos dois casos é código nativo (fora do Expo Go; exige build de desenvolvimento e um módulo ou plugin próprio) e a pessoa precisa conceder permissões que assustam: a política de privacidade teria de explicar bem.
- **Passos baratos antes do bloqueio de verdade:** (1) lembrete no horário em que a pessoa mais rola (já existe lembrete diário); (2) versículo do dia como aviso ou widget; (3) uma pesquisa curta com as primeiras pessoas para saber se querem isso, antes de gastar com o nativo.
- **Outras ideias do mesmo app, para avaliar junto:** versículo do dia para começar o dia; mostrar a sequência na própria tela de pausa; liberar por um tempo (ex.: 15 minutos) depois do momento.
- **Decisões do dono:** entra no produto? Como pausa suave ou bloqueio? Só Android no começo? Antes ou depois do lançamento?
