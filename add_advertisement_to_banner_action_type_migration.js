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

    // Update ENUM to include 'advertisement'
    console.log('📦 Updating action_type ENUM to include advertisement...');
    await connection.query(`
      ALTER TABLE \`banners\` 
      MODIFY COLUMN \`action_type\` ENUM('vendor', 'product', 'link', 'advertisement') NULL 
      COMMENT 'Type of action: vendor, product, link, or advertisement (image only)'
    `);
    console.log('✅ action_type ENUM updated successfully');

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
