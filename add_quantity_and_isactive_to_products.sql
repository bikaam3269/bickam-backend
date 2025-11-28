-- Migration: Add quantity and is_active fields to products table
-- Run this script to update your database schema

-- Add quantity column
ALTER TABLE `products` 
ADD COLUMN `quantity` INT DEFAULT 0 COMMENT 'Product quantity in stock' AFTER `discount`;

-- Add is_active column
ALTER TABLE `products` 
ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Whether the product is active/available' AFTER `quantity`;

-- Update existing products to be active by default (if needed)
UPDATE `products` SET `is_active` = 1 WHERE `is_active` IS NULL;

