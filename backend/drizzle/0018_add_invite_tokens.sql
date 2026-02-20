CREATE TABLE IF NOT EXISTS `invite_tokens` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `token` varchar(64) NOT NULL UNIQUE,
  `organization_id` int NULL,
  `tenant_id` int NULL,
  `email` varchar(255) NULL,
  `profile` varchar(255) DEFAULT 'standard-user',
  `invited_by_id` int NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime NULL,
  CONSTRAINT `invite_tokens_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `invite_tokens_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  CONSTRAINT `invite_tokens_invited_by_id_users_id_fk` FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
