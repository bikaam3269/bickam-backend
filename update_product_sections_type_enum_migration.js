import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

const updateProductSectionsTypeEnum = async () => {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    console.log('✅ Connected to database');

    // Update ENUM to include bestSellers and lastAdded
    console.log('🔄 Updating type ENUM...');
    await connection.query(`
      ALTER TABLE \`product_sections\` 
      MODIFY COLUMN \`type\` ENUM('vendor', 'category', 'bestSellers', 'lastAdded') NOT NULL COMMENT 'Section type: vendor, category, bestSellers, or lastAdded'
    `);

    console.log('✅ Type ENUM updated successfully');

    // Check if display_type column exists and remove it if it does (we merged it into type)
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'product_sections' 
      AND COLUMN_NAME = 'display_type'
    `, [config.database]);

    if (columns.length > 0) {
      console.log('🔄 Removing display_type column (merged into type)...');
      await connection.query(`
        ALTER TABLE \`product_sections\` 
        DROP COLUMN \`display_type\`
      `);
      console.log('✅ display_type column removed successfully');
    } else {
      console.log('ℹ️  display_type column does not exist, skipping');
    }

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating table:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
};

// Run migration
updateProductSectionsTypeEnum()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
