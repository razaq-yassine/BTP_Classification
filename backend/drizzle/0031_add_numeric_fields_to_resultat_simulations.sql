-- Add numeric fields to resultatSimulations for displaying actual values instead of booleans
ALTER TABLE `resultatSimulations` ADD COLUMN `ca_actual_dh` DECIMAL(14, 2) NULL;
--> statement-breakpoint
ALTER TABLE `resultatSimulations` ADD COLUMN `encadrement_score_actual` DECIMAL(10, 2) NULL;
--> statement-breakpoint
ALTER TABLE `resultatSimulations` ADD COLUMN `masse_salariale_ratio_percent` DECIMAL(6, 2) NULL;
