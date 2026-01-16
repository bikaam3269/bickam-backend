import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

const createProductSectionsTable = async () => {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    console.log('✅ Connected to database');

    // Create product_sections table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`product_sections\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(255) NOT NULL COMMENT 'Section name',
        \`type\` ENUM('vendor', 'category') NOT NULL COMMENT 'Section type: vendor or category',
        \`vendor_id\` INT NULL COMMENT 'Vendor ID (required if type is vendor)',
        \`category_id\` INT NULL COMMENT 'Category ID (required if type is category)',
        \`display_type\` ENUM('bestSellers', 'lastAdded') NOT NULL DEFAULT 'lastAdded' COMMENT 'Display type: bestSellers or lastAdded',
        \`image\` VARCHAR(255) NULL COMMENT 'Section image (optional)',
        \`rows\` INT NOT NULL DEFAULT 1 COMMENT 'Number of rows to display (1-10)',
        \`order\` INT NOT NULL DEFAULT 0 COMMENT 'Display order',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Section active status',
        \`app_setting_id\` INT NOT NULL DEFAULT 1 COMMENT 'App Settings ID (links to app_settings table)',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_type\` (\`type\`),
        INDEX \`idx_vendor_id\` (\`vendor_id\`),
        INDEX \`idx_category_id\` (\`category_id\`),
        INDEX \`idx_order\` (\`order\`),
        INDEX \`idx_app_setting_id\` (\`app_setting_id\`),
        CONSTRAINT \`fk_product_section_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_product_section_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_product_section_app_setting\` FOREIGN KEY (\`app_setting_id\`) REFERENCES \`app_settings\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Table product_sections created successfully');

  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
};

// Run migration
createProductSectionsTable()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
