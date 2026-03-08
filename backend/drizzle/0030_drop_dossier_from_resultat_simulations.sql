-- Drop legacy 'dossier' column from resultatSimulations (we use dossier_id)
-- Same pattern as 0026 for other tables
ALTER TABLE `resultatSimulations` DROP COLUMN `dossier`;
