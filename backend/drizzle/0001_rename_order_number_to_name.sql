-- Drop orderitems first (references orders), then orders. Recreated by ensure-tables with correct schema (name field).
DROP TABLE IF EXISTS `orderitems`;
DROP TABLE IF EXISTS `orders`;
