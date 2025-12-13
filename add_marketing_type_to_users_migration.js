import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env] || dbConfig.development;

async function addMarketingTypeToUsers() {
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

    // Check current ENUM values
    const [columns] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'type'
    `, [config.database]);

    if (columns.length > 0) {
      const columnType = columns[0].COLUMN_TYPE;
      console.log(`📊 Current type column: ${columnType}`);
      
      // Check if 'marketing' already exists in ENUM
      if (columnType.includes("'marketing'")) {
        console.log('✅ marketing type already exists in users table');
      } else {
        console.log('🔄 Adding marketing type to users table...');
        
        // Modify ENUM to include 'marketing'
        await connection.execute(`
          ALTER TABLE users 
          MODIFY COLUMN type ENUM('user', 'vendor', 'admin', 'marketing') NOT NULL
        `);
        console.log('✅ Added marketing type to users table');
      }
    } else {
      console.log('⚠️  type column not found in users table');
    }

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ marketing type already exists');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

addMarketingTypeToUsers()
  .then(() => {
    console.log('✅ All operations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

