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

/**
 * Migration: Add type column to banners table
 * Date: 2026-01-17
 * Description: Adds type column to distinguish between interactive and advertisement banners
 */

const addBannerTypeColumn = async () => {
  let connection;

  try {
    // Create database connection using config from database.js
    connection = await mysql.createConnection(dbConfig);

    console.log('✅ Connected to database');

    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const [rows] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = ?
      `, [tableName, columnName]);
      return rows.length > 0;
    };

    // Check if type column already exists
    if (await columnExists('banners', 'type')) {
      console.log('ℹ️  type column already exists in banners table');
      return;
    }

    // Step 1: Add type column
    console.log('📝 Adding type column to banners table...');
    await connection.query(`
      ALTER TABLE banners 
      ADD COLUMN type ENUM('interactive', 'advertisement') NOT NULL DEFAULT 'interactive' 
      COMMENT 'Banner type: interactive (has action) or advertisement (image only)'
    `);
    console.log('✅ Added type column');

    // Step 2: Update existing banners based on actionType
    console.log('🔄 Updating existing banners...');

    // Update banners where action_type is 'advertisement'
    const [result1] = await connection.query(`
      UPDATE banners 
      SET type = 'advertisement' 
      WHERE action_type = 'advertisement'
    `);
    console.log(`✅ Updated ${result1.affectedRows} banners to type 'advertisement'`);

    // Update banners where action_type is in ('vendor', 'product', 'link')
    const [result2] = await connection.query(`
      UPDATE banners 
      SET type = 'interactive' 
      WHERE action_type IN ('vendor', 'product', 'link')
    `);
    console.log(`✅ Updated ${result2.affectedRows} banners to type 'interactive' (from actionType)`);

    // Update banners where action is not null and action_type is not 'advertisement'
    const [result3] = await connection.query(`
      UPDATE banners 
      SET type = 'interactive' 
      WHERE action IS NOT NULL 
        AND (action_type IS NULL OR action_type != 'advertisement')
    `);
    console.log(`✅ Updated ${result3.affectedRows} banners to type 'interactive' (from action)`);

    // Verify migration
    const [banners] = await connection.query(`
      SELECT id, type, action_type, action 
      FROM banners 
      LIMIT 5
    `);
    console.log('\n📊 Sample of updated banners:');
    console.table(banners);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes(process.argv[1])) {
  addBannerTypeColumn()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default addBannerTypeColumn;
