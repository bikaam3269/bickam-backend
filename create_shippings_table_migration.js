import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createShippingsTable() {
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

    // Check if shippings table exists
    console.log('Checking if shippings table exists...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'shippings'
    `, [config.database]);

    if (tables.length === 0) {
      console.log('Creating shippings table...');
      await connection.execute(`
        CREATE TABLE shippings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          from_city_id INT NOT NULL,
          to_city_id INT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (from_city_id) REFERENCES cities(id) ON DELETE CASCADE,
          FOREIGN KEY (to_city_id) REFERENCES cities(id) ON DELETE CASCADE,
          
          UNIQUE KEY unique_shipping_route (from_city_id, to_city_id),
          INDEX idx_shippings_from_city_id (from_city_id),
          INDEX idx_shippings_to_city_id (to_city_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created shippings table');
    } else {
      console.log('✅ shippings table already exists');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error creating shippings table:', error.message);
    
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists (table exists error)');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('⚠️  Error: cities table does not exist. Please create cities table first.');
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

createShippingsTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

