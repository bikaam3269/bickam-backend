import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createDiscountsTable() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    console.log('✅ Connected to database successfully');

    // Check if discounts table already exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'discounts'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('ℹ️  discounts table already exists');
      
      // Check if discount column exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'discounts' 
        AND COLUMN_NAME = 'discount'
      `, [config.database]);

      if (columns.length === 0) {
        console.log('📦 Adding discount column to discounts table...');
        await connection.execute(`
          ALTER TABLE \`discounts\` 
          ADD COLUMN \`discount\` DECIMAL(5, 2) NOT NULL DEFAULT 0 
          COMMENT 'Discount percentage (0-100) - applies to all products in this discount'
          AFTER \`end_date\`
        `);
        console.log('✅ discount column added successfully');
      } else {
        console.log('ℹ️  discount column already exists');
      }
      
      // Check if discount_products table exists
      const [discountProductsTables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'discount_products'
      `, [config.database]);

      if (discountProductsTables.length === 0) {
        console.log('📦 Creating discount_products table...');
        await connection.execute(`
          CREATE TABLE \`discount_products\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`discount_id\` INT NOT NULL,
            \`product_id\` INT NOT NULL,
            \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY \`unique_product_discount\` (\`product_id\`),
            INDEX \`idx_discount_id\` (\`discount_id\`),
            FOREIGN KEY (\`discount_id\`) REFERENCES \`discounts\`(\`id\`) ON DELETE CASCADE,
            FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ discount_products table created successfully');
      } else {
        console.log('ℹ️  discount_products table already exists');
        
        // Check if discounted_price column exists and remove it if it does
        const [discountedPriceColumns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'discount_products' 
          AND COLUMN_NAME = 'discounted_price'
        `, [config.database]);

        if (discountedPriceColumns.length > 0) {
          console.log('📦 Removing discounted_price column from discount_products table...');
          await connection.execute(`
            ALTER TABLE \`discount_products\` 
            DROP COLUMN \`discounted_price\`
          `);
          console.log('✅ discounted_price column removed successfully');
        } else {
          console.log('ℹ️  discounted_price column does not exist (good)');
        }
      }
      
      return;
    }

    // Create discounts table
    console.log('📦 Creating discounts table...');
    await connection.execute(`
      CREATE TABLE \`discounts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`vendor_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        \`body\` TEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        \`image\` VARCHAR(255) NULL COMMENT 'Discount banner image',
        \`start_date\` DATETIME NOT NULL,
        \`end_date\` DATETIME NOT NULL,
        \`discount\` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Discount percentage (0-100) - applies to all products in this discount',
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_vendor_id\` (\`vendor_id\`),
        INDEX \`idx_dates\` (\`start_date\`, \`end_date\`),
        INDEX \`idx_is_active\` (\`is_active\`),
        FOREIGN KEY (\`vendor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`chk_discount_range\` CHECK (\`discount\` >= 0 AND \`discount\` <= 100),
        CONSTRAINT \`chk_date_range\` CHECK (\`end_date\` > \`start_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ discounts table created successfully');

    // Create discount_products table
    console.log('📦 Creating discount_products table...');
    await connection.execute(`
      CREATE TABLE \`discount_products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`discount_id\` INT NOT NULL,
        \`product_id\` INT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_product_discount\` (\`product_id\`),
        INDEX \`idx_discount_id\` (\`discount_id\`),
        FOREIGN KEY (\`discount_id\`) REFERENCES \`discounts\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ discount_products table created successfully');

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL Error:', error.sql);
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
createDiscountsTable()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

