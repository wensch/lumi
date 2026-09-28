-- Lumi — expande a estrutura do devocional (content) para cobrir
-- Título (title, já existia) / Versículo (passage_reference + BibleCard,
-- já existia) / Texto explicativo (body, já existia, redefinido aqui) /
-- Aplicação / Desafio / Oração.
--
-- Nullable: conteúdo já publicado (seed anterior) continua válido sem
-- essas seções — a UI trata ausência como "seção não disponível para
-- este devocional", não como erro.

alter table public.content
  add column application_text text,
  add column challenge_text text,
  add column prayer_text text;

comment on column public.content.body is 'Texto explicativo do devocional — desenvolve o tema a partir da passagem, não curso teológico (§10).';
comment on column public.content.application_text is 'Aplicação prática: como o tema do devocional se conecta ao dia a dia do usuário.';
comment on column public.content.challenge_text is 'Desafio do dia: uma ação concreta e pequena ligada ao tema, para reforçar constância comportamental (não espiritual, §7.1).';
comment on column public.content.prayer_text is 'Oração editorial sugerida para o tema do devocional — base para o fluxo de Oração+IA quando o usuário quiser usar como ponto de partida.';
