import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createBannersTable() {
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

    // Check if banners table already exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'banners'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('ℹ️  banners table already exists');
      return;
    }

    // Create banners table
    console.log('📦 Creating banners table...');
    await connection.execute(`
      CREATE TABLE \`banners\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`image\` VARCHAR(255) NOT NULL COMMENT 'Banner image filename',
        \`text\` TEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Banner text content',
        \`action\` VARCHAR(255) NULL COMMENT 'Action for vendor (e.g., vendor_id, link, etc.)',
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`order\` INT NOT NULL DEFAULT 0 COMMENT 'Display order',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_is_active\` (\`is_active\`),
        INDEX \`idx_order\` (\`order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ banners table created successfully');

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
createBannersTable()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });



