-- =====================================================
-- UTF8MB4 Encoding Fix Migration Script
-- =====================================================
-- This script converts all text columns to utf8mb4
-- to support Arabic and other Unicode characters
-- 
-- Run this script on your MySQL database to fix encoding issues
-- =====================================================

-- Fix users table
ALTER TABLE users 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE users 
MODIFY COLUMN email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE users 
MODIFY COLUMN phone VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN activity VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN logo_image VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN background_image VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN verification_code VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Convert entire users table
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix categories table
ALTER TABLE categories 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE categories 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE categories 
MODIFY COLUMN image VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Convert entire categories table
ALTER TABLE categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix subcategories table
ALTER TABLE subcategories 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE subcategories 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE subcategories 
MODIFY COLUMN image VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Convert entire subcategories table
ALTER TABLE subcategories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix products table
ALTER TABLE products 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE products 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Convert entire products table
ALTER TABLE products CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix governments table
ALTER TABLE governments 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE governments 
MODIFY COLUMN code VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Convert entire governments table
ALTER TABLE governments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix orders table
ALTER TABLE orders 
MODIFY COLUMN shipping_address TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Convert entire orders table
ALTER TABLE orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- Verification Query (Optional - run to check)
-- =====================================================
-- SELECT 
--     TABLE_NAME,
--     COLUMN_NAME,
--     CHARACTER_SET_NAME,
--     COLLATION_NAME
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = 'bikaam_marketplace'
--     AND CHARACTER_SET_NAME IS NOT NULL
--     AND TABLE_NAME IN ('users', 'categories', 'subcategories', 'products', 'governments', 'orders')
-- ORDER BY TABLE_NAME, COLUMN_NAME;
-- =====================================================

