-- Drop orderitems first (references orders), then orders. Recreated by ensure-tables with correct schema (name field).
DROP TABLE IF EXISTS `orderitems`;
--> statement-breakpoint
DROP TABLE IF EXISTS `orders`;
