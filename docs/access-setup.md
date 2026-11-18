# Cloudflare Access の設定

管理画面と管理用の API は、Cloudflare Access の GitHub ログインで守っています。設定は済んでいます(2026-11-19)。

## 守る範囲

| 経路                | 守り方                          |
| ------------------- | ------------------------------- |
| `/admin` とその下   | Access                          |
| `/api/admin/*`      | Access と、Worker での JWT 検証 |
| `POST /api/devices` | `GAME_TOKEN`                    |
| それ以外            | なし(公開)                      |
| プレビューの全経路  | Access                          |

本番の全体には Access をかけません。ゲームと中継は GitHub のログインを通れないので、登録と問い合わせが止まります。

## Access 側の設定

アプリケーションは 1 つです。**Zero Trust** > **Access controls** > **Applications** にあります。

- **宛先**
  - `gakusai2026.uucactus-share.workers.dev` / `admin*`
  - `gakusai2026.uucactus-share.workers.dev` / `api/admin/*`
  - Workers: `gakusai2026` の「Worker のプレビュー URL」
- **ポリシー**: `GitHub Organization Members`(許可)

変えるときの注意:

- 経路は `admin/*` ではなく `admin*` と書きます。前者は `/admin` そのものを含みません。
- 独自ドメインを当てたら、そのホストでも `admin*` と `api/admin/*` を足します。
- Worker の **Access** タブで範囲を「すべてのトラフィック」にしません。本番の全体にかかります。

## Worker 側の設定

`cloudflare.config.ts` に次の 2 つを書いています。どちらも秘密ではありません。

| 定数                 | 値                                                               |
| -------------------- | ---------------------------------------------------------------- |
| `ACCESS_TEAM_DOMAIN` | `https://<チーム名>.cloudflareaccess.com`(末尾に `/` を付けない) |
| `ACCESS_AUD`         | アプリケーションの AUD タグ(**Edit** > **Additional settings**)  |

Access のアプリケーションを作り直すと AUD タグが変わるので、書き換えてデプロイします。

Worker(`src/worker/auth.ts` の `requireAccess`)は、`/api/admin/*` で Access が付けた JWT(`Cf-Access-Jwt-Assertion`)の署名、発行者、宛先、期限を確かめます。Access の設定が外れても、管理用の API は開きません。

| 状況                   | 応答 |
| ---------------------- | ---- |
| 上の 2 つの値が空      | 503  |
| JWT が無い、または無効 | 403  |

ローカル(`vp dev`)では検証を飛ばします。`cf deploy --mode development` のようにモードを指定してデプロイすると、検証が外れたまま公開されるので、モードは指定しません。

## 確かめ方

シークレットウィンドウで `https://<ホスト>/api/admin/me` を開きます。GitHub のログインに進み、ログイン後に `{"email":"..."}` が出れば通っています。ログイン後の確認はまだしていません。

ログイン画面が出ずに 403 が返る場合は、その経路が Access の宛先に入っていません。

## プレビュー

- 全経路がログイン必須です。ゲームや中継をプレビューの URL に向けて試すことはできません。
- 本番と同じ D1 につながります。プレビューでの登録や改名は本番に反映されます。
- 本番の secret を引き継ぎません。`GAME_TOKEN` を設定するまで、`POST /api/devices` は 503 を返します。
