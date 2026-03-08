-- Add dossier_id to membreEncadrements (ensure-tables previously only handled "reference", not "masterDetail")
ALTER TABLE `membreEncadrements` ADD COLUMN `dossier_id` INT;
--> statement-breakpoint
ALTER TABLE `membreEncadrements` ADD CONSTRAINT `membreEncadrements_dossier_id_dossiers_id_fk` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
