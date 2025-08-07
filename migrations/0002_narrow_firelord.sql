DROP INDEX `users_username_unique`;--> statement-breakpoint
CREATE INDEX `clerk_user_index` ON `users` (`clerk_id`);--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;