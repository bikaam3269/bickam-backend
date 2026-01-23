import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addCanMakeLiveStreamColumn() {
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

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'can_make_live_stream'
    `, [config.database]);

    if (columns.length > 0) {
      console.log('✅ can_make_live_stream column already exists in users table');
      return;
    }

    // Add can_make_live_stream column
    console.log('Adding can_make_live_stream column to users table...');
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN can_make_live_stream BOOLEAN DEFAULT TRUE
    `);

    console.log('✅ Successfully added can_make_live_stream column to users table');

  } catch (error) {
    console.error('❌ Error adding can_make_live_stream column:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists (duplicate field name error)');
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

addCanMakeLiveStreamColumn()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
