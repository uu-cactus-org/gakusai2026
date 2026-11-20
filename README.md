# gakusai2026

学祭 2026 のゲームのランキングサイトです。会場の PC で動くゲーム(WaterShooting、UU-JUMP)が記録を送り、このサイトが順位を付けて表示します。
部員どうしでゲームの zip を受け渡す、配布の機能も載せています。

本番: <https://2026.uucactus.com>(<https://gakusai2026.uucactus-share.workers.dev> でも同じものが開きます。ゲームはこちらへ記録を送っています)

## ページ

- `/` : 入口。各ランキングとサイネージ表示へ進みます。
- `/water-shooting` : WaterShooting のスコアランキング。
- `/uu-jump` : UU-JUMP のタイムランキング(マップごと)。
- `/signage` : 会場のモニター向け。全画面で、ランキングを自動で送ります。
- `/games` : 部員向けの、ゲームの zip の配布。合言葉を入れるとダウンロードできます。トップの端に、小さいリンク(「部員用」)があります。仕組みは [docs/games.md](docs/games.md) にあります。
- `/admin` : 管理画面(制限付き)。記録をランキングから外す・消す操作、PC の表示名の変更、配布する zip のアップロードができます。Cloudflare Access の GitHub ログインを通った org のメンバーだけが開けます。設定は [docs/access-setup.md](docs/access-setup.md) にあります。

画面の詳細は [docs/screens.md](docs/screens.md) にあります。

## Stack

- React 19、TanStack Router、TanStack Query
- Tailwind CSS 4、shadcn/ui(Base UI)
- Hono、Zod(Worker の API)
- Cloudflare Workers、D1、R2、Drizzle ORM
- Cloudflare Access(管理画面のログイン。JWT の検証は jose)
- Vite+(`vp`)、pnpm
