import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// PC の登録簿。全ゲーム共通で、表示名(PC1, PC2...)はここで管理する。
export const devices = sqliteTable('devices', {
  // Unity の SystemInfo.deviceUniqueIdentifier
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// WaterShooting の 1 回のプレイ。クリアしたときと、やられたときに、ゲームが 1 行ずつ送ってくる。
export const waterShootingRuns = sqliteTable('water_shooting_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // ゲームがプレイごとに作る ID。送り直しで同じプレイが 2 行にならないようにする
  runId: text('run_id').notNull().unique(),
  deviceId: text('device_id')
    .notNull()
    .references(() => devices.id),
  // 'cleared'(全ステージをクリア)か 'game_over'(やられた)
  result: text('result').notNull(),
  // 'easy' | 'normal' | 'hard' | 'extreme'
  difficulty: text('difficulty').notNull(),
  // 'slim' | 'medium' | 'heavy'
  player: text('player').notNull(),
  // 難易度の倍率を掛けたあとの最終スコア。順位はこの値で決める
  score: integer('score').notNull(),
  // 倍率を掛ける前のスコア
  baseScore: integer('base_score').notNull(),
  playSeconds: real('play_seconds').notNull(),
  // 到達したステージ(1 始まり)と、全ステージ数
  reachedStage: integer('reached_stage').notNull(),
  totalStages: integer('total_stages').notNull(),
  // エディターやデバッグ用のビルドからの記録。ランキングには出さない
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// UU-JUMP の 1 回のプレイ。ゴールしたときに、ゲームが 1 行送ってくる(途中でやめたプレイは来ない)。
export const uuJumpRuns = sqliteTable('uu_jump_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // ゲームがプレイごとに作る ID。送り直しで同じプレイが 2 行にならないようにする
  runId: text('run_id').notNull().unique(),
  deviceId: text('device_id')
    .notNull()
    .references(() => devices.id),
  // ゲームのマップの名前(「マップ0」など)。ランキングはマップごとに分ける
  mapName: text('map_name').notNull(),
  // ゴールまでの秒数。順位はこの値で決める(短いほうが上)
  clearSeconds: real('clear_seconds').notNull(),
  jumpCount: integer('jump_count').notNull(),
  // エディターやデバッグ用のビルドからの記録。ランキングには出さない
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
