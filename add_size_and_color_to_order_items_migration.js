import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dbConfig as sequelizeConfig } from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database config from sequelize config file
const env = process.env.NODE_ENV || 'development';
const sequelizeDbConfig = sequelizeConfig[env];

const dbConfig = {
  host: sequelizeDbConfig.host,
  user: sequelizeDbConfig.username,
  password: sequelizeDbConfig.password,
  database: sequelizeDbConfig.database,
  port: sequelizeDbConfig.port || 3306,
  multipleStatements: true
};

console.log(`📊 Using database: ${dbConfig.database} on ${dbConfig.host}`);

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if size column exists
    const [sizeColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'order_items' 
      AND COLUMN_NAME = 'size'
    `, [dbConfig.database]);

    if (sizeColumns.length === 0) {
      console.log('📦 Adding size column to order_items...');
      await connection.query(`
        ALTER TABLE \`order_items\` 
        ADD COLUMN \`size\` VARCHAR(255) NULL COMMENT 'Selected size for the product (optional)' AFTER \`subtotal\`
      `);
      console.log('✅ size column added successfully');
    } else {
      console.log('ℹ️  size column already exists');
    }

    // Check if color column exists
    const [colorColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'order_items' 
      AND COLUMN_NAME = 'color'
    `, [dbConfig.database]);

    if (colorColumns.length === 0) {
      console.log('📦 Adding color column to order_items...');
      await connection.query(`
        ALTER TABLE \`order_items\` 
        ADD COLUMN \`color\` VARCHAR(255) NULL COMMENT 'Selected color for the product (optional)' AFTER \`size\`
      `);
      console.log('✅ color column added successfully');
    } else {
      console.log('ℹ️  color column already exists');
    }

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();

