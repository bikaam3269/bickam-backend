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

