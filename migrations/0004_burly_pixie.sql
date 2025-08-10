DROP INDEX `users_clerk_id_unique`;--> statement-breakpoint
DROP INDEX `clerk_user_index`;--> statement-breakpoint
ALTER TABLE `users` ADD `username` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `image_url` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `username_index` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `clerk_id`;