PRAGMA foreign_keys=OFF;--> statement-breakpoint
UPDATE `warehouses` SET `description` = '' WHERE `description` IS NULL;--> statement-breakpoint
CREATE TABLE `__new_warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`location` text,
	`capacity` real,
	`description` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_warehouses`("id", "name", "slug", "location", "capacity", "description", "is_active", "created_at", "updated_at") SELECT "id", "name", "slug", "location", "capacity", "description", "is_active", "created_at", "updated_at" FROM `warehouses`;--> statement-breakpoint
DROP TABLE `warehouses`;--> statement-breakpoint
ALTER TABLE `__new_warehouses` RENAME TO `warehouses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_slug_unique` ON `warehouses` (`slug`);