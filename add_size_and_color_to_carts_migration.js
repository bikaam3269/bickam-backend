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
      AND TABLE_NAME = 'carts' 
      AND COLUMN_NAME = 'size'
    `, [dbConfig.database]);

    if (sizeColumns.length === 0) {
      console.log('📦 Adding size column...');
      await connection.query(`
        ALTER TABLE \`carts\` 
        ADD COLUMN \`size\` VARCHAR(255) NULL COMMENT 'Selected size for the product (optional)' AFTER \`quantity\`
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
      AND TABLE_NAME = 'carts' 
      AND COLUMN_NAME = 'color'
    `, [dbConfig.database]);

    if (colorColumns.length === 0) {
      console.log('📦 Adding color column...');
      await connection.query(`
        ALTER TABLE \`carts\` 
        ADD COLUMN \`color\` VARCHAR(255) NULL COMMENT 'Selected color for the product (optional)' AFTER \`size\`
      `);
      console.log('✅ color column added successfully');
    } else {
      console.log('ℹ️  color column already exists');
    }

    // Check and update unique index
    console.log('🔄 Checking unique index...');
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'carts'
      AND INDEX_NAME LIKE '%user_id%'
    `, [dbConfig.database]);

    // Find old unique index on user_id and product_id only
    const oldUniqueIndex = indexes.find(idx => 
      idx.INDEX_NAME.includes('user_id') && 
      indexes.filter(i => i.INDEX_NAME === idx.INDEX_NAME).length === 2 &&
      !indexes.find(i => i.INDEX_NAME === idx.INDEX_NAME && i.COLUMN_NAME === 'size')
    );

    if (oldUniqueIndex) {
      const indexName = oldUniqueIndex.INDEX_NAME;
      console.log(`🗑️  Dropping old unique index: ${indexName}...`);
      await connection.query(`
        ALTER TABLE \`carts\` 
        DROP INDEX \`${indexName}\`
      `);
      console.log('✅ Old unique index dropped');
    }

    // Check if new unique index exists
    const [newIndexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'carts'
      AND INDEX_NAME = 'unique_user_product_size_color'
    `, [dbConfig.database]);

    if (newIndexes.length === 0) {
      console.log('📦 Creating new unique index with size and color...');
      await connection.query(`
        ALTER TABLE \`carts\` 
        ADD UNIQUE INDEX \`unique_user_product_size_color\` (\`user_id\`, \`product_id\`, \`size\`, \`color\`)
      `);
      console.log('✅ New unique index created successfully');
    } else {
      console.log('ℹ️  Unique index already exists');
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
