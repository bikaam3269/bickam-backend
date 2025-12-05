import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env] || dbConfig.development;

async function addCityIdToUsers() {
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

    // Check if city_id column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'city_id'
    `, [config.database]);

    if (columns.length > 0) {
      console.log('✅ city_id column already exists in users table');
    } else {
      console.log('Adding city_id column to users table...');
      
      // Add city_id column
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN city_id INT NULL AFTER government_id
      `);
      console.log('✅ Added city_id to users');

      // Add foreign key constraint
      console.log('Adding foreign key constraint...');
      await connection.execute(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_city 
        FOREIGN KEY (city_id) 
        REFERENCES cities(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key for city_id');
    }

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ city_id column already exists');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('✅ Foreign key already exists');
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

addCityIdToUsers()
  .then(() => {
    console.log('✅ All operations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

