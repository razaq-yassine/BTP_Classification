ALTER TABLE `dossiers` ADD COLUMN `ca_years` VARCHAR(255) NULL;
--> statement-breakpoint
ALTER TABLE `dossiers` ADD COLUMN `ca_max` DECIMAL(10, 2) NULL;
--> statement-breakpoint
ALTER TABLE `dossiers` ADD COLUMN `ca_max_h_t` DECIMAL(10, 2) NULL;
--> statement-breakpoint
ALTER TABLE `dossiers` DROP COLUMN `ca_year1`;
--> statement-breakpoint
ALTER TABLE `dossiers` DROP COLUMN `ca_year2`;
--> statement-breakpoint
ALTER TABLE `dossiers` DROP COLUMN `ca_year3`;
