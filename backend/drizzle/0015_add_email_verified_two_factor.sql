ALTER TABLE `users`
  ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE,
  ADD COLUMN `email_verification_token` VARCHAR(255),
  ADD COLUMN `email_verification_token_expires` DATETIME,
  ADD COLUMN `two_factor_enabled` BOOLEAN DEFAULT FALSE;
