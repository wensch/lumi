-- Lumi — preenche application_text, challenge_text, prayer_text dos 4
-- devocionais existentes (migration 00012 adicionou as colunas vazias).
-- Tom e guardrails seguem o já estabelecido em body: comportamental,
-- nunca "mais fé" (§7.1); desafio é uma ação pequena e concreta, não
-- promessa espiritual; oração não fala como autoridade (§11).

update public.content set
  application_text = 'Pensa numa coisa que você andou evitando fazer só porque "já deixou passar tempo demais". A trava não é a tarefa em si — é a ideia de que já é tarde. Hoje é um bom dia pra testar se isso é verdade.',
  challenge_text = 'Escolhe uma coisa pequena que você vinha adiando por vergonha do tempo que passou, e faz ela hoje — sem se justificar, sem recuperar o atraso, só fazendo.',
  prayer_text = 'Obrigado por hoje ser um dia novo, sem eu precisar carregar o peso dos dias que ficaram pra trás. Me ajuda a começar de novo sem gastar energia tentando compensar o que já passou.'
where title = 'Recomeçar não é fracassar';

update public.content set
  application_text = 'Repara se hoje você mediu o valor do seu dia pelo tanto que produziu. Um momento de silêncio de dois minutos entre uma tarefa e outra não é tempo perdido — é o oposto disso.',
  challenge_text = 'Escolhe um momento hoje pra ficar 2 minutos sem fazer nada de produtivo — sem celular, sem tarefa, só parado. Sem culpa depois.',
  prayer_text = 'Me ajuda a parar por um instante sem sentir que estou perdendo tempo. Às vezes o que eu preciso não é fazer mais uma coisa, é só respirar.'
where title = 'Parar não é perder tempo';

update public.content set
  application_text = 'Se hoje a cabeça está cheia, repara na diferença entre "estou ansioso" e "sou uma pessoa de pouca fé" — são coisas bem diferentes, e só a primeira é verdade.',
  challenge_text = 'Escreve numa frase só a preocupação que está pesando mais hoje. Só isso — não precisa resolver, só nomear.',
  prayer_text = 'Estou trazendo pra Ti o que está pesando na minha cabeça hoje. Não preciso resolver tudo sozinho agora — só preciso colocar isso em algum lugar.'
where title = 'Ansiedade não é falta de fé';

update public.content set
  application_text = 'Nota quantas vezes hoje você já começou a pensar em algo que só vai acontecer amanhã, semana que vem, ou daqui um mês. Não precisa resolver agora — só perceber que está fazendo isso já ajuda.',
  challenge_text = 'Toda vez que a cabeça for pra um problema de "depois" hoje, volta pra uma pergunta simples: "o que precisa da minha atenção agora?"',
  prayer_text = 'Ajuda a manter meus pés no dia de hoje, sem carregar o peso do que ainda nem chegou. O que é de hoje já basta.'
where title = 'Hoje basta a si mesmo';
