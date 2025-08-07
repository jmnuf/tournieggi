PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game_data` (
	`id` text PRIMARY KEY NOT NULL,
	`played` integer DEFAULT false NOT NULL,
	`tournie_id` text NOT NULL,
	`goals` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`tournie_id`) REFERENCES `tournies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_game_data`("id", "played", "tournie_id", "goals") SELECT "id", "played", "tournie_id", "goals" FROM `game_data`;--> statement-breakpoint
DROP TABLE `game_data`;--> statement-breakpoint
ALTER TABLE `__new_game_data` RENAME TO `game_data`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `tournie_index` ON `game_data` (`tournie_id`);--> statement-breakpoint
CREATE INDEX `played_tournie_index` ON `game_data` (`played`,`tournie_id`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_id` text NOT NULL,
	`username` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "clerk_id", "username") SELECT "id", "clerk_id", "username" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);