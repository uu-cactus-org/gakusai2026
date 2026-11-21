import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Button } from '#/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs';
import { meQueryOptions } from '#/features/admin/api';
import { DevicesPanel } from '#/features/admin/devices-panel';
import { GamesPanel } from '#/features/admin/games-panel';
import { UuJumpRunsPanel } from '#/features/admin/uu-jump-runs-panel';
import { WaterShootingRunsPanel } from '#/features/admin/water-shooting-runs-panel';
import { useSystemColorScheme } from '#/lib/use-document-theme';
import { usePageTitle } from '#/lib/use-page-title';

const TABS = ['water-shooting', 'uu-jump', 'devices', 'games'] as const;

// 上の段の切り替え。tab は、その区分を開いたときに最初に出すもの
const SECTIONS = [
  { id: 'ranking', label: 'ランキング', tab: 'water-shooting' },
  { id: 'devices', label: 'デバイス管理', tab: 'devices' },
  { id: 'games', label: '配布ファイル', tab: 'games' },
] as const;

const searchSchema = z.object({
  tab: z.enum(TABS).default('water-shooting').catch('water-shooting'),
});

// 管理画面。本番では /admin とその下を Cloudflare Access が守る(docs/access-setup.md)。
// 画面を開けても、操作は /api/admin/* が Access のトークンを確かめてから受け付ける。
export const Route = createFileRoute('/admin')({
  validateSearch: searchSchema,
  search: { middlewares: [stripSearchParams({ tab: 'water-shooting' })] },
  component: Admin,
});

function Admin() {
  usePageTitle('Admin');
  useSystemColorScheme();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const me = useQuery(meQueryOptions);
  const section = tab === 'games' || tab === 'devices' ? tab : 'ranking';

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Button variant="outline" size="sm" render={<Link to="/" />} nativeButton={false}>
          <ArrowLeft aria-hidden="true" />
          トップに戻る
        </Button>
        <p className="mr-auto text-sm text-muted-foreground">
          {me.isPending
            ? 'ログインを確認しています…'
            : me.isError
              ? ''
              : !me.data.authenticated
                ? 'ローカル開発(ログインの確認なし)'
                : (me.data.login ?? me.data.name)
                  ? `${me.data.login ?? me.data.name} としてログイン中`
                  : 'ログイン中'}
        </p>
        <Link to="/water-shooting" className="text-sm hover:underline">
          ランキングを見る
        </Link>
      </header>

      {me.isPending ? null : me.isError ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="text-destructive">{me.error.message}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            ページを読み込み直す
          </Button>
        </div>
      ) : (
        <>
          {/* 記録の整理、PC の表示名、zip の配布は別の仕事なので、上の段で切り替える。ゲームごとのタブはランキングの中だけ */}
          <nav className="flex gap-1 border-b" aria-label="管理する対象">
            {SECTIONS.map(({ id, label, tab: first }) => (
              <Link
                key={id}
                to="/admin"
                search={{ tab: first }}
                replace
                aria-current={section === id ? 'page' : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                  section === id
                    ? 'border-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {section === 'games' ? (
            <GamesPanel />
          ) : section === 'devices' ? (
            <DevicesPanel />
          ) : (
            <Tabs
              value={tab}
              onValueChange={(value) => {
                const next = TABS.find((t) => t === value);
                if (next) void navigate({ search: { tab: next }, replace: true });
              }}
            >
              <TabsList>
                <TabsTrigger value="water-shooting">WaterShooting</TabsTrigger>
                <TabsTrigger value="uu-jump">UU-JUMP</TabsTrigger>
              </TabsList>
              <TabsContent value="water-shooting">
                <WaterShootingRunsPanel />
              </TabsContent>
              <TabsContent value="uu-jump">
                <UuJumpRunsPanel />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </main>
  );
}
