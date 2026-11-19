import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod';
import { Button } from '#/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs';
import { meQueryOptions } from '#/features/admin/api';
import { DevicesPanel } from '#/features/admin/devices-panel';
import { UuJumpRunsPanel } from '#/features/admin/uu-jump-runs-panel';
import { WaterShootingRunsPanel } from '#/features/admin/water-shooting-runs-panel';

const TABS = ['water-shooting', 'uu-jump', 'devices'] as const;

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
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const me = useQuery(meQueryOptions);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm text-muted-foreground">
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
            <TabsTrigger value="devices">PC</TabsTrigger>
          </TabsList>
          <TabsContent value="water-shooting">
            <WaterShootingRunsPanel />
          </TabsContent>
          <TabsContent value="uu-jump">
            <UuJumpRunsPanel />
          </TabsContent>
          <TabsContent value="devices">
            <DevicesPanel />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
