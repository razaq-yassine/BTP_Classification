CREATE TABLE IF NOT EXISTS `files` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `object_name` varchar(255) NOT NULL,
  `record_id` int NOT NULL,
  `filename` varchar(255) NOT NULL,
  `storage_path` varchar(512) NOT NULL,
  `mime_type` varchar(128),
  `size` int NOT NULL,
  `is_public` boolean DEFAULT false NOT NULL,
  `uploaded_by_id` int,
  `uploaded_at` datetime,
  `organization_id` int,
  `tenant_id` int,
  CONSTRAINT `files_uploaded_by_id_users_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `files_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL,
  CONSTRAINT `files_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
);
