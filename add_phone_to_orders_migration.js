import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addPhoneToOrders() {
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

    // Check if column already exists
    console.log('📊 Checking if phone column exists in orders table...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'phone'
    `, [config.database]);

    if (columns.length === 0) {
      console.log('🔄 Adding phone column to orders table...');
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '' 
        COMMENT 'Customer phone number for order delivery'
        AFTER remaining_amount
      `);
      console.log('✅ Successfully added phone column to orders table');
    } else {
      console.log('✅ phone column already exists in orders table');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error adding phone column:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addPhoneToOrders()
  .then(() => {
    console.log('\n✅ All operations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
