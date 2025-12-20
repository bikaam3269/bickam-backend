import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createAppSettingsTable() {
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

    // Create app_settings table
    console.log('Creating app_settings table...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'app_settings'
    `, [config.database]);

    if (tables.length === 0) {
      await connection.execute(`
        CREATE TABLE app_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT NULL,
          value TEXT NULL,
          is_live_stream_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          is_login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          is_under_development BOOLEAN NOT NULL DEFAULT FALSE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_app_settings_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created app_settings table');

      // Insert default settings
      console.log('Inserting default app settings...');
      await connection.execute(`
        INSERT INTO app_settings (name, description, value, is_live_stream_enabled, is_login_enabled, is_under_development)
        VALUES 
        ('app_main', 'Main App Settings', '{}', TRUE, TRUE, FALSE)
      `);
      console.log('✅ Successfully inserted default app settings');
    } else {
      console.log('✅ app_settings table already exists');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error creating app_settings table:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

createAppSettingsTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

