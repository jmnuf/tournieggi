DROP INDEX "tournie_index";--> statement-breakpoint
DROP INDEX "played_tournie_index";--> statement-breakpoint
DROP INDEX "owner_index";--> statement-breakpoint
DROP INDEX "tournie_name_index";--> statement-breakpoint
DROP INDEX "owner_and_tournie_unique_index";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
DROP INDEX "username_index";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "image_url" TO "image_url" text NOT NULL DEFAULT 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zMTJlV1lVTnFiYXVZaUJKRXpPbHIzemlkenoiLCJyaWQiOiJ1c2VyXzMxNVdNc3h6RDhMZ2xScnBrYko4NWpDVzVNTyJ9';--> statement-breakpoint
CREATE INDEX `tournie_index` ON `game_data` (`tournie_id`);--> statement-breakpoint
CREATE INDEX `played_tournie_index` ON `game_data` (`played`,`tournie_id`);--> statement-breakpoint
CREATE INDEX `owner_index` ON `tournies` (`owner_id`);--> statement-breakpoint
CREATE INDEX `tournie_name_index` ON `tournies` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `owner_and_tournie_unique_index` ON `tournies` (`owner_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `username_index` ON `users` (`username`);