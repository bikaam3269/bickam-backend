import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env] || dbConfig.development;

async function createMarketingProductsTable() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });
    console.log('✅ Connected to database successfully');

    // Check if table already exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'marketing_products'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('✅ marketing_products table already exists');
    } else {
      console.log('🔄 Creating marketing_products table...');
      
      await connection.execute(`
        CREATE TABLE marketing_products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          images JSON NULL,
          price DECIMAL(10, 2) NULL,
          is_price BOOLEAN DEFAULT FALSE,
          description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
          category_id INT NOT NULL,
          subcategory_id INT NOT NULL,
          discount DECIMAL(5, 2) DEFAULT 0,
          quantity INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          government_id INT NOT NULL,
          city_id INT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_id (category_id),
          INDEX idx_subcategory_id (subcategory_id),
          INDEX idx_government_id (government_id),
          INDEX idx_city_id (city_id),
          INDEX idx_is_active (is_active),
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE,
          FOREIGN KEY (government_id) REFERENCES governments(id) ON DELETE CASCADE,
          FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ marketing_products table created successfully');
    }

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✅ marketing_products table already exists');
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

createMarketingProductsTable()
  .then(() => {
    console.log('✅ All operations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

