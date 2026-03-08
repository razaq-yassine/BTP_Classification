-- Drop legacy 'dossier' column (we use dossier_id) - run only if column exists
ALTER TABLE `caEntries` DROP COLUMN `dossier`;
--> statement-breakpoint
ALTER TABLE `materielItems` DROP COLUMN `dossier`;
--> statement-breakpoint
ALTER TABLE `membreEncadrements` DROP COLUMN `dossier`;
