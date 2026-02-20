ALTER TABLE `organizations` ADD COLUMN `max_storage_bytes` DECIMAL(10, 2) NULL
--> statement-breakpoint
ALTER TABLE `tenants` ADD COLUMN `max_storage_bytes` DECIMAL(10, 2) NULL
