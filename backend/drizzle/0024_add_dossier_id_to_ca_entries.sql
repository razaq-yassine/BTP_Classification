ALTER TABLE `caEntries` ADD COLUMN `dossier_id` INT NULL;
--> statement-breakpoint
ALTER TABLE `caEntries` ADD CONSTRAINT `caEntries_dossier_id_dossiers_id_fk` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
