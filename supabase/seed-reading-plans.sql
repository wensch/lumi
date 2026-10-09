-- Lumi — planos de leitura iniciais (Fase 4). Só reorganizam devocionais JÁ aprovados e publicados
-- (tabela content); nenhum texto novo. Rode depois da migration 00019. Seguro repetir.
--
-- Cada dia aponta para o devocional pelo título; se algum título não existir na sua base, aquele dia
-- é pulado (confira com: select slug, count(*) from reading_plans p join reading_plan_days d
-- on d.plan_id = p.id group by slug).

insert into public.reading_plans (slug, title, description, icon, sort_order, published_at)
values
  ('descanso', 'Descanso para quem está cansado',
   'Sete dias para parar sem culpa: descansar, esperar e deixar o dia ser do tamanho que é.',
   '🛋️', 1, now()),
  ('confianca', 'Menos ansiedade, mais confiança',
   'Sete dias para entregar as preocupações, cuidar dos pensamentos e confiar sem ter todas as respostas.',
   '🌿', 2, now()),
  ('coragem', 'Coragem e recomeço',
   'Sete dias para quem precisa recomeçar, encontrar força na fraqueza e seguir em frente.',
   '🌅', 3, now()),
  ('relacionamentos', 'Ouvir, perdoar, amar',
   'Sete dias sobre como tratar as pessoas: ouvir primeiro, responder com calma, perdoar e amar na prática.',
   '🤝', 4, now()),
  ('gratidao', 'Gratidão e propósito',
   'Seis dias para agradecer, olhar o que é bom e levar o trabalho de cada dia como uma oferta.',
   '💛', 5, now()),
  ('trinta-dias', '30 dias com o Lumi',
   'Um mês inteiro, um devocional por dia: descanso, coragem, relacionamentos e gratidão em uma só jornada.',
   '🗓️', 6, now())
on conflict (slug) do update
  set title = excluded.title, description = excluded.description,
      icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.reading_plan_days (plan_id, day_number, content_id)
select p.id, v.day_number, c.id
from (values
  ('descanso', 1, 'Um convite para quem está cansado'),
  ('descanso', 2, 'Descansar também é seguir o pastor'),
  ('descanso', 3, 'Parar não é perder tempo'),
  ('descanso', 4, 'Forças que voltam'),
  ('descanso', 5, 'Presença antes de tarefas'),
  ('descanso', 6, 'Tem tempo para tudo'),
  ('descanso', 7, 'Hoje basta a si mesmo'),

  ('confianca', 1, 'Ansiedade não é falta de fé'),
  ('confianca', 2, 'Nem tudo precisa estar entendido'),
  ('confianca', 3, 'De onde vem o socorro'),
  ('confianca', 4, 'Para onde vai o pensamento'),
  ('confianca', 5, 'Mente que se renova aos poucos'),
  ('confianca', 6, 'Fé que anda no escuro'),
  ('confianca', 7, 'Nada separa'),

  ('coragem', 1, 'Recomeçar não é fracassar'),
  ('coragem', 2, 'Coragem não é ausência de medo'),
  ('coragem', 3, 'Força no que parece fraqueza'),
  ('coragem', 4, 'Perto de quem está quebrado'),
  ('coragem', 5, 'Sem se cansar de fazer o bem'),
  ('coragem', 6, 'Permanecer'),
  ('coragem', 7, 'Pedir, buscar, bater'),

  ('relacionamentos', 1, 'Ouvir primeiro'),
  ('relacionamentos', 2, 'Resposta que desarma'),
  ('relacionamentos', 3, 'Vestir-se de gentileza'),
  ('relacionamentos', 4, 'Perdoar também é processo'),
  ('relacionamentos', 5, 'Amar na prática'),
  ('relacionamentos', 6, 'Luz sem holofote'),
  ('relacionamentos', 7, 'O básico é suficiente'),

  ('gratidao', 1, 'Gratidão em pequenas doses'),
  ('gratidao', 2, 'O céu também fala'),
  ('gratidao', 3, 'Formado com cuidado'),
  ('gratidao', 4, 'Contar os dias'),
  ('gratidao', 5, 'Trabalho como oferta'),
  ('gratidao', 6, 'Uma bênção para hoje'),

  ('trinta-dias', 1, 'Descansar também é seguir o pastor'),
  ('trinta-dias', 2, 'Nem tudo precisa estar entendido'),
  ('trinta-dias', 3, 'Forças que voltam'),
  ('trinta-dias', 4, 'Coragem não é ausência de medo'),
  ('trinta-dias', 5, 'Um convite para quem está cansado'),
  ('trinta-dias', 6, 'De onde vem o socorro'),
  ('trinta-dias', 7, 'Permanecer'),
  ('trinta-dias', 8, 'Mente que se renova aos poucos'),
  ('trinta-dias', 9, 'Sem se cansar de fazer o bem'),
  ('trinta-dias', 10, 'Tem tempo para tudo'),
  ('trinta-dias', 11, 'Vestir-se de gentileza'),
  ('trinta-dias', 12, 'Ouvir primeiro'),
  ('trinta-dias', 13, 'Formado com cuidado'),
  ('trinta-dias', 14, 'Gratidão em pequenas doses'),
  ('trinta-dias', 15, 'Presença antes de tarefas'),
  ('trinta-dias', 16, 'Luz sem holofote'),
  ('trinta-dias', 17, 'O céu também fala'),
  ('trinta-dias', 18, 'Resposta que desarma'),
  ('trinta-dias', 19, 'Perdoar também é processo'),
  ('trinta-dias', 20, 'O básico é suficiente'),
  ('trinta-dias', 21, 'Fé que anda no escuro'),
  ('trinta-dias', 22, 'Força no que parece fraqueza'),
  ('trinta-dias', 23, 'Perto de quem está quebrado'),
  ('trinta-dias', 24, 'Para onde vai o pensamento'),
  ('trinta-dias', 25, 'Contar os dias'),
  ('trinta-dias', 26, 'Pedir, buscar, bater'),
  ('trinta-dias', 27, 'Nada separa'),
  ('trinta-dias', 28, 'Amar na prática'),
  ('trinta-dias', 29, 'Trabalho como oferta'),
  ('trinta-dias', 30, 'Uma bênção para hoje')
) as v(slug, day_number, title)
join public.reading_plans p on p.slug = v.slug
join public.content c on c.title = v.title and c.published_at is not null
on conflict (plan_id, day_number) do update set content_id = excluded.content_id;
