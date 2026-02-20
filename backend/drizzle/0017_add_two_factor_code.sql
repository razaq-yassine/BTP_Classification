-- Add columns for 2FA login flow
ALTER TABLE `users`
  ADD COLUMN `two_factor_code` VARCHAR(10) NULL,
  ADD COLUMN `two_factor_code_expires` DATETIME NULL;
