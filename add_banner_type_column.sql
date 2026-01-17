-- Migration: Add type column to banners table
-- Date: 2026-01-17
-- Description: Adds type column to distinguish between interactive and advertisement banners
-- 
-- Run this script in your MySQL database to add the type column
-- Note: If column already exists, you may get an error - this is normal, just continue

-- Step 1: Add type column (with default value)
-- If column already exists, comment out this line
ALTER TABLE banners 
ADD COLUMN type ENUM('interactive', 'advertisement') NOT NULL DEFAULT 'interactive' 
COMMENT 'Banner type: interactive (has action) or advertisement (image only)';

-- Step 2: Update existing banners based on their current actionType and action
-- If actionType is 'advertisement', set type to 'advertisement'
UPDATE banners 
SET type = 'advertisement' 
WHERE action_type = 'advertisement';

-- If banner has actionType in ('vendor', 'product', 'link'), set type to 'interactive'
UPDATE banners 
SET type = 'interactive' 
WHERE action_type IN ('vendor', 'product', 'link');

-- If banner has action (non-null) and action_type is not 'advertisement', set type to 'interactive'
UPDATE banners 
SET type = 'interactive' 
WHERE action IS NOT NULL 
  AND (action_type IS NULL OR action_type != 'advertisement');

-- Verify the migration
-- SELECT id, image, type, action_type, action FROM banners LIMIT 10;
