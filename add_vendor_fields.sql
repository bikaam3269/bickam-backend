-- Migration: Add vendor location and contact fields
-- Date: 2025-11-29
-- Description: Adds latitude, longitude, whatsapp_number, and address columns to users table

-- Add latitude column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL 
COMMENT 'Vendor location latitude';

-- Add longitude column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL 
COMMENT 'Vendor location longitude';

-- Add whatsapp_number column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(255) NULL 
COMMENT 'Vendor WhatsApp contact number';

-- Add address column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT NULL 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci 
COMMENT 'Vendor physical address';
