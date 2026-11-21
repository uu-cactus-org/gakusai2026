# gakusai2026

2026峰ヶ丘祭の特設サイトです。会場の PC で動くゲーム(WaterShooting、UU-JUMP)が記録を送り、このサイトが順位を付けて表示します。

URL: https://2026.uucactus.com

## Pages

- `/` : トップページ
- `/water-shooting` : WaterShooting のスコアランキング
- `/uu-jump` : UU-JUMP のタイムランキング
- `/signage` : サイネージ用
- `/past-games` : 過去に作ったゲームの紹介
- `/licenses` : このサイトが使っているライブラリとフォントのライセンス
- `/games` : 当日ゲームを配布するのに使う部員向けページ。詳しくは [docs/games.md](docs/games.md)
- `/admin` : プレイ記録・デバイス名の管理、配布する zip のアップロード用ページ。Cloudflare Access認証付き。詳細: [docs/access-setup.md](docs/access-setup.md)

### docs

- 画面の詳細: [docs/screens.md](docs/screens.md)
- ゲームが記録を送る API
  - [docs/water-shooting.md](docs/water-shooting.md)
  - [docs/uu-jump.md](docs/uu-jump.md)
- PC の登録API: [docs/devices.md](docs/devices.md)

## Stack

- pnpm
- Vite+ (build, lint, format)
- Cloudflare Workers
  - D1 + Drizzle ORM
  - R2
- Hono + Zod
- React 19, TanStack Router
- Tailwind CSS 4, shadcn/ui(Base UI)
- TanStack Query, TanStack Charts
- Cloudflare Access(管理画面のログイン)

## 開発

```sh
pn install
cp .dev.vars.example .dev.vars   # GAME_TOKEN などを入れる
pn run db:migrate:local          # ローカルの D1 に表を作る
pn run dev                       # http://localhost:3000
pn exec vpx scripts/seed-local.ts        # 画面の確認用の記録を入れる(開発サーバーを動かしたまま)
```

コミットの前に `vp check`(整形、lint、型)と `vp test` を通します。

## ライセンス

- コード: [MIT License](LICENSE)
- 絵(`src/assets/` と `public/` の画像): MIT の対象外で再利用はできません。詳しくは [src/assets/README.md](src/assets/README.md)
- フォント(`src/assets/fonts/`): それぞれのライセンスに従います(M+ FONT LICENSE、SIL Open Font License 1.1)。
