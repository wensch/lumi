-- Lumi — restaura as datas reais dos eventos de 2026 (Advento, Natal e Páscoa).
--
-- Em 11/10/2026 as janelas de 2026 foram ABERTAS DE PROPÓSITO para testar os eventos no aparelho
-- (começando em 10/10). Antes de publicar nas lojas, rode este arquivo para voltar às datas reais.
-- Só atualiza datas (sem DROP e sem DELETE). O progresso de teste das pessoas deixa de valer sozinho,
-- porque foi iniciado fora da janela real.

update public.seasonal_events set starts_on = date '2026-11-29', ends_on = date '2026-12-24', lead_days = 7
where slug = 'advento' and year = 2026;
update public.seasonal_events set starts_on = date '2026-12-25', ends_on = date '2027-01-05', lead_days = 3
where slug = 'natal' and year = 2026;
update public.seasonal_events set starts_on = date '2026-03-29', ends_on = date '2026-04-12', lead_days = 7
where slug = 'pascoa' and year = 2026;
