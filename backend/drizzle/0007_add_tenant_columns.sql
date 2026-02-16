INSERT INTO `tenants` (`name`, `organization_id`, `created_at`, `updated_at`) SELECT 'Default', id, NOW(), NOW() FROM `organizations` WHERE slug = 'default' LIMIT 1
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `organization_id` int
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `tenant_id` int
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`)
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `organization_id` int
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `tenant_id` int
--> statement-breakpoint
UPDATE `customers` SET `organization_id` = 1, `tenant_id` = 1
--> statement-breakpoint
ALTER TABLE `customers` MODIFY `organization_id` int NOT NULL
--> statement-breakpoint
ALTER TABLE `customers` MODIFY `tenant_id` int NOT NULL
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `organization_id` int
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `tenant_id` int
--> statement-breakpoint
UPDATE `orders` SET `organization_id` = 1, `tenant_id` = 1
--> statement-breakpoint
ALTER TABLE `orders` MODIFY `organization_id` int NOT NULL
--> statement-breakpoint
ALTER TABLE `orders` MODIFY `tenant_id` int NOT NULL
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
--> statement-breakpoint
ALTER TABLE `orderitems` ADD COLUMN `organization_id` int
--> statement-breakpoint
ALTER TABLE `orderitems` ADD COLUMN `tenant_id` int
--> statement-breakpoint
UPDATE `orderitems` SET `organization_id` = 1, `tenant_id` = 1
--> statement-breakpoint
ALTER TABLE `orderitems` MODIFY `organization_id` int NOT NULL
--> statement-breakpoint
ALTER TABLE `orderitems` MODIFY `tenant_id` int NOT NULL
--> statement-breakpoint
ALTER TABLE `orderitems` ADD CONSTRAINT `orderitems_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
--> statement-breakpoint
ALTER TABLE `orderitems` ADD CONSTRAINT `orderitems_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
