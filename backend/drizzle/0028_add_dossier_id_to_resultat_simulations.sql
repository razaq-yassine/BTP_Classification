-- Add dossier_id to resultatSimulations (table may have been created before dossier relationship was added)
ALTER TABLE `resultatSimulations` ADD COLUMN `dossier_id` INT NULL;
--> statement-breakpoint
ALTER TABLE `resultatSimulations` ADD CONSTRAINT `resultatSimulations_dossier_id_dossiers_id_fk` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
