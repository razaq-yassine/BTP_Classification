-- Fix: resultatSimulations.details was VARCHAR(255), too short for classification HTML.
-- Alter to MEDIUMTEXT to store full details from computeClassification.
ALTER TABLE `resultatSimulations` MODIFY COLUMN `details` MEDIUMTEXT;
