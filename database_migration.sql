-- Database Migration Script
-- Run this SQL script manually in your database to add missing columns
-- This avoids using alter: true which can exceed free tier query limits

-- Add category_id column to users table (for vendors)
ALTER TABLE users 
ADD COLUMN category_id INT NULL,
ADD INDEX idx_users_category_id (category_id);

-- Add foreign key constraint (optional, if categories table exists)
-- ALTER TABLE users 
-- ADD CONSTRAINT fk_users_category 
-- FOREIGN KEY (category_id) REFERENCES categories(id) 
-- ON DELETE SET NULL;

-- Add background_image column to users table (for vendors)
ALTER TABLE users 
ADD COLUMN background_image VARCHAR(255) NULL;

-- Add verification columns (if not already added)
ALTER TABLE users 
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_code VARCHAR(10) NULL,
ADD COLUMN verification_code_expiry DATETIME NULL;

-- Verify columns were added
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'users' 
-- AND COLUMN_NAME IN ('category_id', 'background_image', 'is_verified', 'verification_code', 'verification_code_expiry');

-- Fix UTF8MB4 encoding for Arabic characters
-- Convert users table columns to utf8mb4
ALTER TABLE users 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE users 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Also update other text fields that might contain Arabic
ALTER TABLE users 
MODIFY COLUMN email VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE users 
MODIFY COLUMN phone VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN activity VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN logo_image VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE users 
MODIFY COLUMN background_image VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- Convert the entire table to utf8mb4 (optional but recommended)
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix UTF8MB4 encoding for other tables that might contain Arabic text
-- Categories table
ALTER TABLE categories 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE categories 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Subcategories table
ALTER TABLE subcategories 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE subcategories 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE subcategories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Products table
ALTER TABLE products 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE products 
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE products CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Governments table
ALTER TABLE governments 
MODIFY COLUMN name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE governments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Orders table
ALTER TABLE orders 
MODIFY COLUMN shipping_address TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add FCM token column to users table (for Firebase push notifications)
ALTER TABLE users 
ADD COLUMN fcm_token VARCHAR(255) NULL;

