-- Add order_id, product_id, quantity, unit_price to orderitems
-- Note: Run only if table is empty; otherwise provide defaults
ALTER TABLE `orderitems` ADD `order_id` integer REFERENCES orders(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE `orderitems` ADD `product_id` integer REFERENCES products(id);
--> statement-breakpoint
ALTER TABLE `orderitems` ADD `quantity` real;
--> statement-breakpoint
ALTER TABLE `orderitems` ADD `unit_price` real;
