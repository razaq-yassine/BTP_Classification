CREATE TABLE IF NOT EXISTS `record_history` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `object_name` varchar(255) NOT NULL,
  `record_id` int NOT NULL,
  `field_key` varchar(255) NOT NULL,
  `old_value` text,
  `new_value` text,
  `changed_by_id` int,
  `changed_at` datetime,
  `organization_id` int,
  `tenant_id` int,
  CONSTRAINT `record_history_changed_by_id_users_id_fk` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `record_history_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL,
  CONSTRAINT `record_history_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL
);
