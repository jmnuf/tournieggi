CREATE TABLE `game_data` (
	`id` text NOT NULL,
	`played` integer DEFAULT false NOT NULL,
	`tournie_id` text NOT NULL,
	`goals` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`tournie_id`) REFERENCES `tournies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tournie_index` ON `game_data` (`tournie_id`);--> statement-breakpoint
CREATE INDEX `played_tournie_index` ON `game_data` (`played`,`tournie_id`);--> statement-breakpoint
CREATE TABLE `tournies` (
	`id` text NOT NULL,
	`name` text NOT NULL,
	`teams` text DEFAULT '[]' NOT NULL,
	`groups` text DEFAULT '[]' NOT NULL,
	`ladders` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `owner_index` ON `tournies` (`id`);--> statement-breakpoint
CREATE INDEX `tournie_name_index` ON `tournies` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `owner_and_tournie_unique_index` ON `tournies` (`id`,`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text NOT NULL,
	`username` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);