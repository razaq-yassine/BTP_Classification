CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255),
  `created_at` datetime,
  `updated_at` datetime
);
