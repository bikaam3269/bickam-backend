import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addUpdatedAtColumns() {
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

    // Check and add updated_at to live_stream_viewers
    console.log('Checking live_stream_viewers table...');
    const [columns1] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_stream_viewers'
      AND COLUMN_NAME = 'updated_at'
    `, [config.database]);

    if (columns1.length === 0) {
      await connection.execute(`
        ALTER TABLE live_stream_viewers 
        ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at to live_stream_viewers');
    } else {
      console.log('✅ updated_at already exists in live_stream_viewers');
    }

    // Check and add updated_at to live_stream_messages
    console.log('Checking live_stream_messages table...');
    const [columns2] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_stream_messages'
      AND COLUMN_NAME = 'updated_at'
    `, [config.database]);

    if (columns2.length === 0) {
      await connection.execute(`
        ALTER TABLE live_stream_messages 
        ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at to live_stream_messages');
    } else {
      console.log('✅ updated_at already exists in live_stream_messages');
    }

    // Check and add updated_at to live_stream_likes
    console.log('Checking live_stream_likes table...');
    const [columns3] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_stream_likes'
      AND COLUMN_NAME = 'updated_at'
    `, [config.database]);

    if (columns3.length === 0) {
      await connection.execute(`
        ALTER TABLE live_stream_likes 
        ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at to live_stream_likes');
    } else {
      console.log('✅ updated_at already exists in live_stream_likes');
    }

    console.log('\n✅ All updated_at columns added successfully');

  } catch (error) {
    console.error('❌ Error adding updated_at columns:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addUpdatedAtColumns()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

