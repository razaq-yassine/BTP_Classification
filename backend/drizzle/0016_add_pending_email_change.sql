ALTER TABLE `users`
  ADD COLUMN `pending_email` VARCHAR(255),
  ADD COLUMN `pending_email_token` VARCHAR(255),
  ADD COLUMN `pending_email_token_expires` DATETIME;
