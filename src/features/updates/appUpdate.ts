/**
 * Atualização do APK distribuído pela release fixa "apk-latest" do GitHub
 * (gerada pelo workflow Build APK). O número do build é o run_number do
 * workflow, embutido no app via EXPO_PUBLIC_BUILD_NUMBER e repetido no corpo
 * da release ("Build #N do commit ..."). Em desenvolvimento (sem a variável)
 * o número é 0 e nenhuma atualização é oferecida.
 */
const RELEASE_URL = 'https://api.github.com/repos/wensch/lumi/releases/tags/apk-latest';
const APK_NAME = 'Lumi.apk';
const REQUEST_TIMEOUT_MS = 8000;

export const CURRENT_BUILD = Number(process.env.EXPO_PUBLIC_BUILD_NUMBER ?? 0) || 0;

export type LatestBuild = {
  build: number;
  apkUrl: string;
};

type ReleaseResponse = {
  body?: string | null;
  assets?: { name: string; browser_download_url: string }[];
};

/** Lê a release mais recente; devolve null se a resposta não tiver o formato esperado. */
export async function fetchLatestBuild(): Promise<LatestBuild | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GitHub respondeu ${response.status}`);

    const release = (await response.json()) as ReleaseResponse;
    const build = Number(/Build #(\d+)/.exec(release.body ?? '')?.[1]);
    const apkUrl = release.assets?.find((asset) => asset.name === APK_NAME)?.browser_download_url;

    if (!build || !apkUrl) return null;
    return { build, apkUrl };
  } finally {
    clearTimeout(timeout);
  }
}

export function isNewerBuild(latest: LatestBuild | null): latest is LatestBuild {
  return latest !== null && CURRENT_BUILD > 0 && latest.build > CURRENT_BUILD;
}
