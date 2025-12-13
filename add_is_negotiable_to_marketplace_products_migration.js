import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addIsNegotiableToMarketplaceProducts() {
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
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'marketplace_products'
      AND COLUMN_NAME = 'is_negotiable'
    `, [config.database]);

    if (columns.length > 0) {
      console.log('✅ is_negotiable column already exists in marketplace_products table');
      return;
    }
    
    console.log('Adding is_negotiable column to marketplace_products table...');
    await connection.execute(`
      ALTER TABLE marketplace_products 
      ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether the price is negotiable'
    `);
    console.log('✅ Successfully added is_negotiable column to marketplace_products table');
    
    const [newColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'marketplace_products'
      AND COLUMN_NAME = 'is_negotiable'
    `, [config.database]);
    
    console.log('\n📋 Column structure:');
    console.table(newColumns.map(col => ({
      Column: col.COLUMN_NAME,
      Type: col.DATA_TYPE,
      Nullable: col.IS_NULLABLE,
      Default: col.COLUMN_DEFAULT || 'N/A'
    })));
  } catch (error) {
    console.error('❌ Error adding is_negotiable column:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists (duplicate field name error)');
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

addIsNegotiableToMarketplaceProducts()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });





