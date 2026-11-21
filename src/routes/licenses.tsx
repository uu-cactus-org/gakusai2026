import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { FestivalBackdrop } from '#/features/home/backdrop';
import { FestivalFooter } from '#/features/home/footer';
import { FESTIVAL_THEME } from '#/features/home/theme';
import { useDocumentTheme } from '#/lib/use-document-theme';
import { usePageTitle } from '#/lib/use-page-title';

export const Route = createFileRoute('/licenses')({ component: Licenses });

/** ビルドのときに書き出される licenses.json の 1 件。書き出すのは vite.config.ts の thirdPartyLicenses */
type Package = {
  name: string;
  version: string;
  license: string;
  licenseText: string;
  repository: string;
};

async function fetchPackages(): Promise<Package[]> {
  const response = await fetch('/licenses.json');
  // 開発中(vp dev)は licenses.json が無く、代わりに index.html が返る
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) {
    throw new Error('licenses.json がありません');
  }
  return (await response.json()) as Package[];
}

// ゲームから写した書体。出どころは src/assets/README.md
const FONTS = [
  { name: 'PixelMplus', license: 'M+ FONT LICENSE' },
  { name: 'Jersey 10', license: 'SIL Open Font License 1.1' },
  { name: 'DotGothic16', license: 'SIL Open Font License 1.1' },
];

function Licenses() {
  usePageTitle('ライセンス');
  useDocumentTheme(FESTIVAL_THEME);
  const { data, isPending } = useQuery({
    queryKey: ['licenses'],
    queryFn: fetchPackages,
    // ビルドし直すまで変わらない
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <FestivalBackdrop />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-20 pb-8 sm:px-6 sm:pt-28">
        <header className="flex flex-col items-start gap-4">
          <Button variant="outline" size="sm" render={<Link to="/" />} nativeButton={false}>
            <ArrowLeft aria-hidden="true" />
            トップに戻る
          </Button>
          <h1 className="festival-title text-4xl leading-[1.25] text-primary">ライセンス</h1>
        </header>

        <section className="flex flex-col gap-3 border-2 border-foreground bg-card p-4">
          <h2 className="text-xl">フォント</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {FONTS.map(({ name, license }) => (
              <li key={name} className="flex flex-wrap justify-between gap-x-4">
                <span>{name}</span>
                <span className="text-muted-foreground">{license}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3 border-2 border-foreground bg-card p-4">
          <h2 className="text-xl">ソフトウェア</h2>
          <p className="text-sm text-muted-foreground">
            このサイトは、次のオープンソースのソフトウェアを使っています。名前を押すと、ライセンスの文面を開きます。
          </p>
          {isPending ? (
            <p className="text-sm text-muted-foreground">読み込んでいます</p>
          ) : !data ? (
            <p className="text-sm text-muted-foreground">一覧を読み込めませんでした。</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.map(({ name, version, license, licenseText }) => (
                <li key={`${name}@${version}`}>
                  <details className="group py-2">
                    <summary className="flex cursor-pointer flex-wrap justify-between gap-x-4 text-sm hover:text-primary group-open:text-primary">
                      <span className="break-all">
                        {name} <span className="text-muted-foreground">{version}</span>
                      </span>
                      <span className="text-muted-foreground">{license}</span>
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto bg-background p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                      {licenseText || 'ライセンスの文面は、パッケージに入っていませんでした。'}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <FestivalFooter />
    </div>
  );
}
