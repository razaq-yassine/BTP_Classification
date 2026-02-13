CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`location` text,
	`description` text,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_slug_unique` ON `warehouses` (`slug`);