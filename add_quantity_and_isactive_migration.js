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

    // Check if quantity column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'quantity'
    `, [dbConfig.database]);

    if (columns.length === 0) {
      console.log('📦 Adding quantity column...');
      await connection.query(`
        ALTER TABLE \`products\` 
        ADD COLUMN \`quantity\` INT DEFAULT 0 COMMENT 'Product quantity in stock' AFTER \`discount\`
      `);
      console.log('✅ quantity column added successfully');
    } else {
      console.log('ℹ️  quantity column already exists');
    }

    // Check if is_active column exists
    const [isActiveColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'is_active'
    `, [dbConfig.database]);

    if (isActiveColumns.length === 0) {
      console.log('📦 Adding is_active column...');
      await connection.query(`
        ALTER TABLE \`products\` 
        ADD COLUMN \`is_active\` TINYINT(1) DEFAULT 1 COMMENT 'Whether the product is active/available' AFTER \`quantity\`
      `);
      console.log('✅ is_active column added successfully');
    } else {
      console.log('ℹ️  is_active column already exists');
    }

    // Update existing products to be active by default
    console.log('🔄 Updating existing products...');
    const [updateResult] = await connection.query(`
      UPDATE \`products\` 
      SET \`is_active\` = 1 
      WHERE \`is_active\` IS NULL OR \`is_active\` = 0
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} products`);

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

