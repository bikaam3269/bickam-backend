import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addPhoneToOrders() {
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

    // Check if phone column exists
    console.log('Checking phone column...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'phone'
    `, [config.database]);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN phone VARCHAR(20) NOT NULL COMMENT 'Customer phone number for order delivery'
      `);
      console.log('✅ Added phone column to orders');
    } else {
      console.log('✅ phone column already exists in orders');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error adding phone to orders:', error.message);
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
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });


