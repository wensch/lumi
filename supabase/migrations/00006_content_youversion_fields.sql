-- Lumi — content passa a referenciar passagens reais via YouVersion SDK
-- (integração feita client-side com SDK oficial, ver README). bible_source_id
-- ficava para o modelo antigo de licenciamento via backend próprio; mantido
-- nullable para não quebrar nada, mas passage_reference + youversion_version_id
-- é o par usado pelo componente BibleCard/BibleReader no client.

alter table public.content
  add column youversion_version_id integer;

comment on column public.content.passage_reference is 'Referência USFM (ex: "JHN.3.16"), consumida pelo YouVersion SDK no client.';
comment on column public.content.youversion_version_id is 'ID numérico da versão bíblica na YouVersion (ex: 3034 = BSB), usado junto com passage_reference.';
