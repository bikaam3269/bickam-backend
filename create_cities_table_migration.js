import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createCitiesTable() {
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

    // Check if cities table exists
    console.log('Checking if cities table exists...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'cities'
    `, [config.database]);

    if (tables.length === 0) {
      console.log('Creating cities table...');
      await connection.execute(`
        CREATE TABLE cities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          government_id INT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (government_id) REFERENCES governments(id) ON DELETE CASCADE,
          
          UNIQUE KEY unique_city_government (name, government_id),
          INDEX idx_cities_government_id (government_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Successfully created cities table');
    } else {
      console.log('✅ cities table already exists');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error creating cities table:', error.message);
    
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists (table exists error)');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('⚠️  Error: governments table does not exist. Please create governments table first.');
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

createCitiesTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

