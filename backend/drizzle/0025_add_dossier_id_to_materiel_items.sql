ALTER TABLE `materielItems` ADD COLUMN `dossier_id` INT NULL;
--> statement-breakpoint
ALTER TABLE `materielItems` ADD CONSTRAINT `materielItems_dossier_id_dossiers_id_fk` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
