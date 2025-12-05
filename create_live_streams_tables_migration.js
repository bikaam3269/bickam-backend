import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createLiveStreamsTables() {
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

    // Create live_streams table
    console.log('Creating live_streams table...');
    const [tables1] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_streams'
    `, [config.database]);

    if (tables1.length === 0) {
      await connection.execute(`
        CREATE TABLE live_streams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vendor_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NULL,
          channel_name VARCHAR(255) NOT NULL UNIQUE,
          agora_token TEXT NULL,
          status ENUM('scheduled', 'live', 'ended', 'cancelled') NOT NULL DEFAULT 'scheduled',
          scheduled_at DATETIME NULL,
          started_at DATETIME NULL,
          ended_at DATETIME NULL,
          viewer_count INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_live_streams_vendor_id (vendor_id),
          INDEX idx_live_streams_status (status),
          INDEX idx_live_streams_channel_name (channel_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created live_streams table');
    } else {
      console.log('✅ live_streams table already exists');
    }

    // Create live_stream_viewers table
    console.log('Creating live_stream_viewers table...');
    const [tables2] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_stream_viewers'
    `, [config.database]);

    if (tables2.length === 0) {
      await connection.execute(`
        CREATE TABLE live_stream_viewers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          live_stream_id INT NOT NULL,
          user_id INT NOT NULL,
          joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          left_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (live_stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          UNIQUE KEY unique_viewer (live_stream_id, user_id),
          INDEX idx_live_stream_viewers_live_stream_id (live_stream_id),
          INDEX idx_live_stream_viewers_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created live_stream_viewers table');
    } else {
      console.log('✅ live_stream_viewers table already exists');
    }

    // Create live_stream_messages table
    console.log('Creating live_stream_messages table...');
    const [tables3] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_stream_messages'
    `, [config.database]);

    if (tables3.length === 0) {
      await connection.execute(`
        CREATE TABLE live_stream_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          live_stream_id INT NOT NULL,
          user_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (live_stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_live_stream_messages_live_stream_id (live_stream_id),
          INDEX idx_live_stream_messages_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created live_stream_messages table');
    } else {
      console.log('✅ live_stream_messages table already exists');
    }

    // Create live_stream_likes table
    console.log('Creating live_stream_likes table...');
    const [tables4] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'live_stream_likes'
    `, [config.database]);

    if (tables4.length === 0) {
      await connection.execute(`
        CREATE TABLE live_stream_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          live_stream_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (live_stream_id) REFERENCES live_streams(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          UNIQUE KEY unique_like (live_stream_id, user_id),
          INDEX idx_live_stream_likes_live_stream_id (live_stream_id),
          INDEX idx_live_stream_likes_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created live_stream_likes table');
    } else {
      console.log('✅ live_stream_likes table already exists');
    }

    console.log('\n✅ All live stream tables created successfully');

  } catch (error) {
    console.error('❌ Error creating live stream tables:', error.message);
    
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

createLiveStreamsTables()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

