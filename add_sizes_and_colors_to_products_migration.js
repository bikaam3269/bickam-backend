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

    // Check if sizes column exists
    const [sizesColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'sizes'
    `, [dbConfig.database]);

    if (sizesColumns.length === 0) {
      console.log('📦 Adding sizes column...');
      await connection.query(`
        ALTER TABLE \`products\` 
        ADD COLUMN \`sizes\` JSON DEFAULT ('[]') COMMENT 'Available sizes for the product (e.g., ["S", "M", "L", "XL"])' AFTER \`is_active\`
      `);
      console.log('✅ sizes column added successfully');
    } else {
      console.log('ℹ️  sizes column already exists');
    }

    // Check if colors column exists
    const [colorsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'colors'
    `, [dbConfig.database]);

    if (colorsColumns.length === 0) {
      console.log('📦 Adding colors column...');
      await connection.query(`
        ALTER TABLE \`products\` 
        ADD COLUMN \`colors\` JSON DEFAULT ('[]') COMMENT 'Available colors for the product (e.g., ["Red", "Blue", "Green"] or ["#FF0000", "#0000FF"])' AFTER \`sizes\`
      `);
      console.log('✅ colors column added successfully');
    } else {
      console.log('ℹ️  colors column already exists');
    }

    // Update existing products to have empty arrays for sizes and colors if they are NULL
    console.log('🔄 Updating existing products...');
    const [updateResult] = await connection.query(`
      UPDATE \`products\` 
      SET \`sizes\` = '[]' 
      WHERE \`sizes\` IS NULL
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} products with empty sizes array`);

    const [updateColorsResult] = await connection.query(`
      UPDATE \`products\` 
      SET \`colors\` = '[]' 
      WHERE \`colors\` IS NULL
    `);
    console.log(`✅ Updated ${updateColorsResult.affectedRows} products with empty colors array`);

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();







