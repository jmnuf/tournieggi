PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tournies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`teams` text DEFAULT '[]' NOT NULL,
	`groups` text DEFAULT '[]' NOT NULL,
	`ladders` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tournies`("id", "name", "owner_id", "teams", "groups", "ladders") SELECT "id", "name", "owner_id", "teams", "groups", "ladders" FROM `tournies`;--> statement-breakpoint
DROP TABLE `tournies`;--> statement-breakpoint
ALTER TABLE `__new_tournies` RENAME TO `tournies`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `owner_index` ON `tournies` (`owner_id`);--> statement-breakpoint
CREATE INDEX `tournie_name_index` ON `tournies` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `owner_and_tournie_unique_index` ON `tournies` (`owner_id`,`name`);