import { usePassage } from '@youversion/platform-react-hooks';

/**
 * Busca o texto real de uma passagem já referenciada em `content`
 * (passage_reference + youversion_version_id), para exibir no passo
 * "Versículo" do devocional em vez de só a referência.
 */
export function useVersePassage(versionId: number | null, usfm: string | null) {
  const { passage, loading, error } = usePassage({
    versionId: versionId ?? 0,
    usfm: usfm ?? '',
    format: 'text',
    options: { enabled: !!versionId && !!usfm },
  });
  return { passage, loading, error };
}
