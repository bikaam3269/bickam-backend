import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createNotificationsTable() {
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
      AND TABLE_NAME = 'notifications'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('✅ notifications table already exists');
      return;
    }

    // Create notifications table
    console.log('Creating notifications table...');
    await connection.execute(`
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        body TEXT NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        type VARCHAR(100) NULL,
        data JSON NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at DATETIME NULL,
        sent_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
        fcm_sent BOOLEAN NOT NULL DEFAULT FALSE,
        fcm_error TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_notifications_user_id (user_id),
        INDEX idx_notifications_is_read (is_read),
        INDEX idx_notifications_type (type),
        INDEX idx_notifications_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Successfully created notifications table');

    // Verify table was created
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'notifications'
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
    console.error('❌ Error creating notifications table:', error.message);
    
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

createNotificationsTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

