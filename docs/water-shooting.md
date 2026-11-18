# WaterShooting のスコアとランキング

WaterShooting は、クリアしたときと、やられたときに、そのプレイの結果を 1 件送ります。ランキングは、その記録をスコアの高い順に並べたものです。

PC の ID と表示名は [devices.md](devices.md) に、ランキングの画面は [screens.md](screens.md) にあります。

## 決めたこと

- **1 行は 1 回のプレイです**。PC ごとの最高記録ではありません。会場の PC は何人もが遊ぶので、PC ごとにまとめると 1 台につき 1 行しか残りません。
- **順位は最終スコアで決めます**。ゲームのリザルトに出るのと同じ、難易度の倍率を掛けたあとの値です。難易度をまたいで 1 つのランキングに並べます。
- **同点は、先に記録したほうが上です**。
- **プレイヤーの名前は取りません**。誰の記録かは、PC の表示名と時刻で見分けます。
- **やられたプレイも載ります**。クリアしたかどうかは `result` で分かります。
- **テストの記録はランキングに出しません**。エディターとデバッグ用のビルドからの記録は、ゲームが `test: true` を付けて送ります。デバッグ用のビルドはステージを飛ばせるためです。
- **未登録の PC からでも受け付けます**。その場で登録して、表示名を付けます。起動時の登録が失敗していても、スコアは落としません。

## API

| 経路                                        | 用途             | 守り方            |
| ------------------------------------------- | ---------------- | ----------------- |
| `POST /api/water-shooting/runs`             | プレイを記録する | `GAME_TOKEN`      |
| `GET /api/water-shooting/ranking`           | ランキング       | なし              |
| `GET /api/admin/water-shooting/runs`        | 記録の一覧(管理) | Cloudflare Access |
| `PATCH /api/admin/water-shooting/runs/:id`  | テスト扱いの切替 | Cloudflare Access |
| `DELETE /api/admin/water-shooting/runs/:id` | 記録を 1 件消す  | Cloudflare Access |

### `POST /api/water-shooting/runs`

ゲームが呼びます。`Authorization: Bearer <GAME_TOKEN>` を付けます。

```json
{
  "runId": "5f0c…",
  "deviceId": "<PC の ID>",
  "result": "cleared",
  "difficulty": "hard",
  "player": "medium",
  "score": 18750,
  "baseScore": 12500,
  "playSeconds": 312.4,
  "reachedStage": 5,
  "totalStages": 5,
  "test": false
}
```

| 項目                          | 内容                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `runId`                       | ゲームがプレイごとに作る ID。同じ値を送り直しても 2 行になりません |
| `result`                      | `cleared`(全ステージをクリア)か `game_over`(やられた)              |
| `difficulty`                  | `easy`、`normal`、`hard`、`extreme`                                |
| `player`                      | `slim`、`medium`、`heavy`                                          |
| `score`                       | 倍率を掛けたあとの最終スコア。順位はこの値で決めます               |
| `baseScore`                   | 倍率を掛ける前のスコア                                             |
| `playSeconds`                 | プレイ時間(秒)。ポーズ中は含みません                               |
| `reachedStage`、`totalStages` | 到達したステージ(1 始まり)と、全ステージ数                         |
| `test`                        | テストの記録なら `true`。省くと `false`                            |

応答は `{ "id": 12, "rank": 3, "total": 40, "test": false }` です。新しく記録したときは 201、送り直しのときは 200 です。

- `rank` は今の順位、`total` はランキングに載っている記録の数です。
- テストの記録の `rank` は、「本番の記録の中に入れたら何位か」です。`total` には数えません。
- `difficulty` と `player` は、上の値以外でも受け付けます。ゲームに難易度やキャラが増えても、記録が落ちないようにするためです。

### `GET /api/water-shooting/ranking`

| 引数          | 既定    | 内容                                                                             |
| ------------- | ------- | -------------------------------------------------------------------------------- |
| `limit`       | 20      | 件数。100 まで                                                                   |
| `offset`      | 0       | 何件目から返すか                                                                 |
| `sort`        | `score` | 並べ替える項目。`score`、`baseScore`、`playSeconds`、`reachedStage`、`createdAt` |
| `order`       | 下記    | `asc`(小さい順)か `desc`(大きい順)                                               |
| `difficulty`  | なし    | その難易度だけに絞る                                                             |
| `player`      | なし    | そのキャラだけに絞る                                                             |
| `result`      | なし    | `cleared` か `game_over` だけに絞る                                              |
| `includeTest` | 0       | 1 にするとテストの記録も混ぜる(動作確認用)                                       |

- `order` を省くと、`playSeconds` だけ短い順、ほかは大きい順(`createdAt` は新しい順)になります。
- 並べ替えた項目が同じ値の記録どうしは、順位の順に並びます。
- 「クリアした人の速い順」は `sort=playSeconds&result=cleared` です。

```json
{
  "total": 40,
  "runs": [
    {
      "rank": 1,
      "id": 7,
      "score": 52300,
      "baseScore": 26150,
      "result": "cleared",
      "difficulty": "extreme",
      "player": "slim",
      "playSeconds": 298.1,
      "reachedStage": 5,
      "totalStages": 5,
      "test": false,
      "deviceName": "PC3",
      "createdAt": "2026-11-21T04:12:09.000Z"
    }
  ]
}
```

`rank` は、絞り込んだ記録の中での、スコアの順位です。並べ替えやページ送りをしても変わりません。たとえば新しい順に並べても、各行にはスコアで何位かが入ります。絞り込みを付けたときは、その中での順位になります。

### `GET /api/admin/water-shooting/runs`

管理画面が使います。ランキングと違い、テストの記録も返し、各行に `runId` と `deviceId` が付きます。`rank` は付きません。

| 引数       | 既定        | 内容                                                                   |
| ---------- | ----------- | ---------------------------------------------------------------------- |
| `limit`    | 50          | 件数。200 まで                                                         |
| `offset`   | 0           | 何件目から返すか                                                       |
| `sort`     | `createdAt` | `createdAt` か `score`                                                 |
| `order`    | `desc`      | `asc` か `desc`                                                        |
| `test`     | `all`       | `all`(混ぜる)、`only`(テストだけ)、`exclude`(ランキングに出るものだけ) |
| `deviceId` | なし        | その PC の記録だけに絞る                                               |
| `result`   | なし        | `cleared` か `game_over` だけに絞る                                    |

応答は `{ "total": 45, "runs": [...] }` です。

### `PATCH /api/admin/water-shooting/runs/:id`

本文は `{ "test": true }` です。`true` にすると、その記録はランキングに出なくなります。`false` で戻せます。
消すのと違って元に戻せるので、疑わしい記録はまずこちらで外します。応答は `{ "id": 12, "test": true }` です。

### `DELETE /api/admin/water-shooting/runs/:id`

いたずらや誤送信の記録を消します。`:id` は、ランキングの各行にある `id` です。

## まだ無いもの

- ゲームの中での順位の表示。ゲームは、応答の順位を受け取って保持するところまでしています。
- プレイの履歴や集計(プレイ数、難易度ごとのクリア率など)の API。
