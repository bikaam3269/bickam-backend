import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createMarketplaceProductsTable() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    console.log('Connected to database successfully');

    // Check if table already exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'marketplace_products'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('✅ marketplace_products table already exists');
      return;
    }

    // Create marketplace_products table
    console.log('Creating marketplace_products table...');
    await connection.execute(`
      CREATE TABLE marketplace_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        description TEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        files JSON NULL COMMENT 'Array of file paths (images or videos)',
        phone VARCHAR(20) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        admin_id INT NULL COMMENT 'Admin who approved/rejected',
        approved_at DATETIME NULL,
        expires_at DATETIME NULL COMMENT 'Auto-delete date based on admin settings',
        rejection_reason TEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_marketplace_products_user_id (user_id),
        INDEX idx_marketplace_products_status (status),
        INDEX idx_marketplace_products_expires_at (expires_at),
        INDEX idx_marketplace_products_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Successfully created marketplace_products table');

    // Verify table was created
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'marketplace_products'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    console.log('\n📋 Table structure:');
    console.table(columns.map(col => ({
      Column: col.COLUMN_NAME,
      Type: col.DATA_TYPE,
      Nullable: col.IS_NULLABLE,
      Default: col.COLUMN_DEFAULT || 'N/A'
    })));

  } catch (error) {
    console.error('❌ Error creating marketplace_products table:', error.message);
    
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists (table exists error)');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('⚠️  Error: users table does not exist. Please create users table first.');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

createMarketplaceProductsTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

