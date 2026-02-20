-- Add must_change_password column for forced password reset on first login
ALTER TABLE `users`
  ADD COLUMN `must_change_password` TINYINT(1) DEFAULT 0;
