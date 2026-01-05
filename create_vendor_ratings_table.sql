-- Create vendor_ratings table
CREATE TABLE IF NOT EXISTS `vendor_ratings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT 'User who is rating the vendor',
  `vendor_id` INT NOT NULL COMMENT 'Vendor being rated',
  `rating` INT NOT NULL COMMENT 'Rating value from 1 to 5',
  `comment` TEXT NULL COMMENT 'Optional comment/review text',
  `order_id` INT NULL COMMENT 'Optional: Related order ID if rating is for a specific order',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `unique_user_vendor_rating` (`user_id`, `vendor_id`),
  INDEX `idx_vendor_id` (`vendor_id`),
  INDEX `idx_user_id` (`user_id`),
  CONSTRAINT `fk_vendor_rating_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vendor_rating_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



