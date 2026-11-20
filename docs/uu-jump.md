# UU-JUMP のタイムとランキング

UU-JUMP は、ゴールしたときに、そのプレイの結果を 1 件送ります。ランキングは、その記録をマップごとに、ゴールまでが短い順に並べたものです。

PC の ID と表示名は [devices.md](devices.md) に、ランキングの画面は [screens.md](screens.md) にあります。

## 決めたこと

去年のランキング(`hqru2637/uu-jump-dashboard`)の形をもとに、WaterShooting と同じ作りに寄せました。

- **1 行は 1 回のプレイです**。PC ごとの最高記録ではありません。
- **ランキングはマップごとです**。マップをまたいだ順位は付けません。
- **順位はゴールまでの秒数で決めます**。短いほうが上で、同じタイムは先に記録したほうが上です。
- **ゴールしたプレイだけ載ります**。ゲームは、途中でやめたプレイを送りません。
- **プレイヤーの名前は取りません**。誰の記録かは、PC の表示名と時刻で見分けます。
- **テストの記録はランキングに出しません**。エディターとデバッグ用のビルドからの記録は、ゲームが `test: true` を付けて送ります。
- **未登録の PC からでも受け付けます**。その場で登録して、表示名を付けます。
- **鍵は WaterShooting と同じ `GAME_TOKEN` です**。
- **去年の記録は取り込んでいません**。
- **去年あった統計(プレイ数の推移、タイムの分布)は、入れていません**。

去年の送信(`deviceId`、`mapName`、`clearTime`、`jumpCount` を `uu-jump-dashboard.vercel.app` へ送る処理)は、ゲームにそのまま残っています。送り先はもう受け付けていません。こちらの API とは別物です。

## 表

`uu_jump_runs`(`src/worker/db/schema.ts` の `uuJumpRuns`)

| 列              | 内容                                                         |
| --------------- | ------------------------------------------------------------ |
| `id`            | 連番                                                         |
| `run_id`        | ゲームがプレイごとに作る ID。重複なし。送り直しを 1 行にする |
| `device_id`     | `devices.id`                                                 |
| `map_name`      | マップの名前(「マップ0」など)。ゲームが送る名前そのまま      |
| `clear_seconds` | ゴールまでの秒数                                             |
| `jump_count`    | ジャンプの回数                                               |
| `is_test`       | テストの記録か                                               |
| `created_at`    | 記録した時刻                                                 |

## API

| 経路                                 | 用途                   | 守り方            |
| ------------------------------------ | ---------------------- | ----------------- |
| `POST /api/uu-jump/runs`             | プレイを記録する       | `GAME_TOKEN`      |
| `GET /api/uu-jump/maps`              | 記録があるマップ       | なし              |
| `GET /api/uu-jump/ranking`           | マップごとのランキング | なし              |
| `GET /api/admin/uu-jump/runs`        | 記録の一覧(管理)       | Cloudflare Access |
| `PATCH /api/admin/uu-jump/runs/:id`  | テスト扱いの切替       | Cloudflare Access |
| `DELETE /api/admin/uu-jump/runs/:id` | 記録を 1 件消す        | Cloudflare Access |

### `POST /api/uu-jump/runs`

ゲームが呼びます。`Authorization: Bearer <GAME_TOKEN>` を付けます。

```json
{
  "runId": "5f0c…",
  "deviceId": "<PC の ID>",
  "mapName": "マップ0",
  "clearSeconds": 48.21,
  "jumpCount": 61,
  "test": false
}
```

- `runId` は、ゲームがプレイごとに 1 つ作ります。同じ `runId` を送り直しても 2 行にはなりません(1 回目は 201、2 回目からは 200)。
- `test` は省けます。省くと `false` です。

応答は `{ "id": 12, "rank": 3, "total": 14, "test": false }` です。`rank` はそのマップでの順位、`total` はそのマップのランキングに載っている記録の数です。テストの記録の `rank` は、「本番の記録の中に入れたら何位か」です。

### `GET /api/uu-jump/maps`

応答は、Cloudflare のキャッシュに 5 秒だけ置きます(`src/worker/cache.ts`)。記録を送った直後や、管理画面で消した直後は、最大 5 秒古い内容が返ります。

記録があるマップと、その件数です。名前の順に返します。テストの記録だけのマップは出ません。

```json
{
  "maps": [
    { "name": "マップ0", "count": 14 },
    { "name": "マップ1", "count": 15 }
  ]
}
```

### `GET /api/uu-jump/ranking`

応答は、Cloudflare のキャッシュに 5 秒だけ置きます(`src/worker/cache.ts`)。記録を送った直後や、管理画面で消した直後は、最大 5 秒古い内容が返ります。

| 引数          | 既定           | 内容                                                                                                  |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `map`         | 必須           | マップの名前                                                                                          |
| `limit`       | 20             | 件数。100 まで                                                                                        |
| `offset`      | 0              | 何件目から返すか                                                                                      |
| `sort`        | `clearSeconds` | `clearSeconds`(短い順)、`jumpCount`(少ない順)、`createdAt`(新しい順)。`rank` はどれでもタイム順のまま |
| `includeTest` | `0`            | `1` で、テストの記録も混ぜる(動作確認用)                                                              |

```json
{
  "total": 14,
  "runs": [
    {
      "rank": 1,
      "id": 39,
      "mapName": "マップ0",
      "clearSeconds": 44.64,
      "jumpCount": 49,
      "test": false,
      "deviceName": "PC4",
      "createdAt": "2026-11-21T03:12:00.000Z"
    }
  ]
}
```

### `GET /api/admin/uu-jump/runs`

管理画面が使います。テストの記録も返し、各行に `runId` と `deviceId` が付きます。`rank` は付きません。

| 引数       | 既定        | 内容                                                           |
| ---------- | ----------- | -------------------------------------------------------------- |
| `limit`    | 50          | 件数。200 まで                                                 |
| `offset`   | 0           | 何件目から返すか                                               |
| `sort`     | `createdAt` | `createdAt`(新しい順)か `clearSeconds`(短い順)                 |
| `test`     | `all`       | `all`、`only`(テストだけ)、`exclude`(ランキングに出るものだけ) |
| `deviceId` | なし        | その PC の記録だけに絞る                                       |
| `map`      | なし        | そのマップの記録だけに絞る                                     |

応答は `{ "total": 45, "maps": ["マップ0", "マップ1"], "runs": [...] }` です。`maps` は絞り込みの選択肢で、テストの記録だけのマップも含みます。

### `PATCH /api/admin/uu-jump/runs/:id`、`DELETE /api/admin/uu-jump/runs/:id`

WaterShooting のもの([water-shooting.md](water-shooting.md))と同じです。`PATCH` の本文は `{ "test": true }` です。

## ゲーム側

送信は、ゲームのリポジトリ(`uu-cactus-org/2025-team3-jump-game`)の **`2026` ブランチ**の `Assets/Scripts/Leaderboard/` にあります。
今年の分は `2026` ブランチの中だけで完結させ、`main` にはマージしません。当日のビルドは `2026` ブランチから作ります。
WaterShooting の `LeaderboardClient` と同じ作りです。

- 起動時に、PC を登録します(`POST /api/devices`)。
- ゴールしたときに、記録を送ります。つながらないときは 5 回まで試し、あきらめてもゲームは止まりません。
- URL と鍵は `Assets/Resources/LeaderboardSettings.asset` に置きます。鍵が空のビルドは、何も送りません。
- WebGL のビルドは PC の ID を取れないので、何も送りません。
