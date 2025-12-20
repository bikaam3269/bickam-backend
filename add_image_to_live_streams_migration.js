import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addImageToLiveStreams() {
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
    console.log('Checking if image column exists...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_streams'
      AND COLUMN_NAME = 'image'
    `, [config.database]);

    if (columns.length === 0) {
      console.log('Adding image column to live_streams table...');
      await connection.execute(`
        ALTER TABLE live_streams 
        ADD COLUMN image VARCHAR(255) NULL 
        COMMENT 'Live stream thumbnail/image'
        AFTER viewer_count
      `);
      console.log('✅ Successfully added image column to live_streams table');
    } else {
      console.log('✅ image column already exists in live_streams table');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error adding image column:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addImageToLiveStreams()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

