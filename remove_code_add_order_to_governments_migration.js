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

    // Check if code column exists
    const [codeColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'governments' 
      AND COLUMN_NAME = 'code'
    `, [dbConfig.database]);

    if (codeColumns.length > 0) {
      console.log('📦 Removing code column...');
      
      // Drop unique index on code if exists
      try {
        await connection.query(`
          ALTER TABLE \`governments\` 
          DROP INDEX \`code\`
        `);
        console.log('✅ Dropped code unique index');
      } catch (error) {
        if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('⚠️  Could not drop code index (may not exist)');
        }
      }
      
      // Drop code column
      await connection.query(`
        ALTER TABLE \`governments\` 
        DROP COLUMN \`code\`
      `);
      console.log('✅ code column removed successfully');
    } else {
      console.log('ℹ️  code column does not exist');
    }

    // Check if order column exists
    const [orderColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'governments' 
      AND COLUMN_NAME = 'order'
    `, [dbConfig.database]);

    if (orderColumns.length === 0) {
      console.log('📦 Adding order column...');
      await connection.query(`
        ALTER TABLE \`governments\` 
        ADD COLUMN \`order\` INT NOT NULL DEFAULT 0 
        COMMENT 'Display order' 
        AFTER \`name\`
      `);
      console.log('✅ order column added successfully');
    } else {
      console.log('ℹ️  order column already exists');
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
