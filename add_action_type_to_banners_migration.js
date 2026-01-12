import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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

    // Check if action_type column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'banners' 
      AND COLUMN_NAME = 'action_type'
    `, [dbConfig.database]);

    if (columns.length === 0) {
      console.log('📦 Adding action_type column...');
      await connection.query(`
        ALTER TABLE \`banners\` 
        ADD COLUMN \`action_type\` ENUM('vendor', 'product', 'link') NULL 
        COMMENT 'Type of action: vendor, product, or link' 
        AFTER \`text\`
      `);
      console.log('✅ action_type column added successfully');
    } else {
      console.log('ℹ️  action_type column already exists');
    }

    // Update action column comment to be more descriptive
    console.log('🔄 Updating action column comment...');
    await connection.query(`
      ALTER TABLE \`banners\` 
      MODIFY COLUMN \`action\` VARCHAR(255) NULL 
      COMMENT 'Action value: vendor_id, product_id, or link URL based on action_type'
    `);
    console.log('✅ action column comment updated');

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
