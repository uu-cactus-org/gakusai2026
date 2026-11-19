CREATE TABLE `uu_jump_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`device_id` text NOT NULL,
	`map_name` text NOT NULL,
	`clear_seconds` real NOT NULL,
	`jump_count` integer NOT NULL,
	`is_test` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uu_jump_runs_run_id_unique` ON `uu_jump_runs` (`run_id`);