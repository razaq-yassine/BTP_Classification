CREATE TABLE IF NOT EXISTS `notification_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `event_key` varchar(255) NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `template_key` varchar(255) NOT NULL,
  CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `notification_settings_event_key_unique` UNIQUE(`event_key`)
);
