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

    // Check if is_market_percentage_enabled column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'app_settings' 
      AND COLUMN_NAME = 'is_market_percentage_enabled'
    `, [dbConfig.database]);

    if (columns.length === 0) {
      console.log('📦 Adding is_market_percentage_enabled column...');
      await connection.query(`
        ALTER TABLE \`app_settings\` 
        ADD COLUMN \`is_market_percentage_enabled\` TINYINT(1) DEFAULT 1 COMMENT 'Enable or disable market percentage feature' AFTER \`is_login_enabled\`
      `);
      console.log('✅ is_market_percentage_enabled column added successfully');
      
      // Update existing records to have default value
      console.log('🔄 Updating existing app settings...');
      const [updateResult] = await connection.query(`
        UPDATE \`app_settings\` 
        SET \`is_market_percentage_enabled\` = 1 
        WHERE \`is_market_percentage_enabled\` IS NULL
      `);
      console.log(`✅ Updated ${updateResult.affectedRows} app settings records`);
    } else {
      console.log('ℹ️  is_market_percentage_enabled column already exists');
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
