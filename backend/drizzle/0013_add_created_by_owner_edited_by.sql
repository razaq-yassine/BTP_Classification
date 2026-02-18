ALTER TABLE `organizations` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `organizations` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `organizations` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `tenants` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `tenants` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `tenants` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `categories` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `deploytests` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `deploytests` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `deploytests` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `deploytests` ADD CONSTRAINT `deploytests_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `deploytests` ADD CONSTRAINT `deploytests_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `deploytests` ADD CONSTRAINT `deploytests_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `opportunities` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `opportunities` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `opportunities` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `opportunities` ADD CONSTRAINT `opportunities_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `orderitems` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `orderitems` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `orderitems` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `orderitems` ADD CONSTRAINT `orderitems_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `orderitems` ADD CONSTRAINT `orderitems_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `orderitems` ADD CONSTRAINT `orderitems_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `warehouses` ADD COLUMN `created_by_id` int
--> statement-breakpoint
ALTER TABLE `warehouses` ADD COLUMN `owner_id` int
--> statement-breakpoint
ALTER TABLE `warehouses` ADD COLUMN `edited_by_id` int
--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_edited_by_id_users_id_fk` FOREIGN KEY (`edited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
