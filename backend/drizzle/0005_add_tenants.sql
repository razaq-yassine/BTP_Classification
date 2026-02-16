CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `organization_id` int NOT NULL,
  `created_at` datetime,
  `updated_at` datetime,
  CONSTRAINT `tenants_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
);
