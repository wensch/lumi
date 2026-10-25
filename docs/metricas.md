# Métricas e relatório de erros

Como o Lumi acompanha o uso (briefing §16) e os erros, sem ferramenta de terceiros e sem guardar texto pessoal.

## O que é medido

Só o **nome do evento e o dia**, uma vez por dia e por pessoa. Nunca reflexão, pedido de oração, texto de
devocional ou conteúdo digitado.

| Evento | Quando |
|---|---|
| `app_open` | Abriu o app (e de novo ao voltar do segundo plano). |
| `devotional_started` | Começou um devocional (sessão criada). |
| `devotional_completed` | Concluiu um devocional. |
| `plan_started` | Começou um plano de leitura. |
| `challenge_started` | Começou um desafio (pessoal ou do círculo). |
| `circle_joined` | Entrou num círculo pelo código. |
| `notification_opened` | Tocou num aviso de círculo. |

A lista fica na migration `00028` (função `track_event`); um nome fora dela é recusado pelo banco.

## Onde fica

- Tabela `app_events` (`user_id`, `name`, `day`), fechada ao app: só funções leem ou escrevem.
- Quando a conta é apagada, as linhas dela saem junto (cascata).

## Como ler (SQL Editor do Supabase)

```sql
-- últimos 30 dias (padrão)
select public.metrics_summary();

-- um período específico
select public.metrics_summary('2026-10-01', '2026-10-31');
```

O resultado traz: cadastros, **ativação** (fez o primeiro momento até o dia seguinte ao cadastro),
**retenção** D1/D7/D30 (voltou exatamente N dias depois, só conta quem já teve esse prazo),
**constância** (média de dias com momento por pessoa ativa), **conclusão** (sessões iniciadas que
terminaram) e aberturas de aviso.

Números pequenos (poucas pessoas) mudam muito de um dia para o outro: leia com a quantidade junto.

## Erros

Erros não tratados de JavaScript vão para `app_errors` (sem identificação da pessoa). Antes de gravar, o banco
apaga o texto entre aspas, e-mails e links, e corta em 300 caracteres (mensagem) e 1500 (pilha). Há um teto de
300 relatos por hora.

```sql
select created_at, source, message, app_version, platform
from public.app_errors
order by created_at desc
limit 50;
```

Em desenvolvimento nada é enviado.

## O que ainda não é medido

- **Avisos enviados** (só as aberturas contam). Medir envio pede gravar cada aviso que sai pela função de push.
- **Retorno após quebra de sequência** (briefing §16). Pede uma consulta sobre a sequência; fica para a próxima versão.
- **Erros nativos** (travamentos fora do JavaScript). O relatório cobre só erros de JavaScript.

## Privacidade (para a política)

- Base: medir o uso para melhorar o app; sem venda nem compartilhamento.
- Ainda não há opção para desligar as métricas. Antes da publicação, decidir se entra na tela de
  Configurações (recomendado para a política de privacidade).
- Retenção dos erros: manter 60 dias (limpeza a fazer por patch).
