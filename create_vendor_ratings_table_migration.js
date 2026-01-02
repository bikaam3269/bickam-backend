import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createVendorRatingsTable() {
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

    // Check if vendor_ratings table already exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'vendor_ratings'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('ℹ️  vendor_ratings table already exists');
      return;
    }

    // Create vendor_ratings table
    console.log('📦 Creating vendor_ratings table...');
    await connection.execute(`
      CREATE TABLE \`vendor_ratings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL COMMENT 'User who is rating the vendor',
        \`vendor_id\` INT NOT NULL COMMENT 'Vendor being rated',
        \`rating\` INT NOT NULL COMMENT 'Rating value from 1 to 5',
        \`comment\` TEXT NULL COMMENT 'Optional comment/review text',
        \`order_id\` INT NULL COMMENT 'Optional: Related order ID if rating is for a specific order',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX \`unique_user_vendor_rating\` (\`user_id\`, \`vendor_id\`),
        INDEX \`idx_vendor_id\` (\`vendor_id\`),
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_order_id\` (\`order_id\`),
        CONSTRAINT \`fk_vendor_rating_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_vendor_rating_vendor\` FOREIGN KEY (\`vendor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`chk_rating_range\` CHECK (\`rating\` >= 1 AND \`rating\` <= 5)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ vendor_ratings table created successfully');

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
createVendorRatingsTable()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

