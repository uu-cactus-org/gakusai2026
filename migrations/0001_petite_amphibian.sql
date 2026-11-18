CREATE TABLE `water_shooting_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`device_id` text NOT NULL,
	`result` text NOT NULL,
	`difficulty` text NOT NULL,
	`player` text NOT NULL,
	`score` integer NOT NULL,
	`base_score` integer NOT NULL,
	`play_seconds` real NOT NULL,
	`reached_stage` integer NOT NULL,
	`total_stages` integer NOT NULL,
	`is_test` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `water_shooting_runs_run_id_unique` ON `water_shooting_runs` (`run_id`);