import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addSectionStatusAndOrderFields() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database
    });

    console.log('Connected to database successfully');

    // Check if columns already exist
    console.log('Checking existing columns...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'app_settings'
      AND COLUMN_NAME IN (
        'is_banners_active', 'is_products_active', 'is_category_active',
        'is_vendors_active', 'is_marketplace_active',
        'banners_order', 'products_order', 'category_order',
        'livestream_order', 'vendors_order', 'marketplace_order'
      )
    `, [config.database]);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const allColumns = [
      'is_banners_active', 'is_products_active', 'is_category_active',
      'is_vendors_active', 'is_marketplace_active',
      'banners_order', 'products_order', 'category_order',
      'livestream_order', 'vendors_order', 'marketplace_order'
    ];

    const columnsToAdd = allColumns.filter(col => !existingColumns.includes(col));

    if (columnsToAdd.length === 0) {
      console.log('✅ All columns already exist');
    } else {
      console.log(`Adding ${columnsToAdd.length} new columns...`);

      // Add status columns
      if (!existingColumns.includes('is_banners_active')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN is_banners_active BOOLEAN NOT NULL DEFAULT TRUE
        `);
        console.log('✅ Added is_banners_active');
      }

      if (!existingColumns.includes('is_products_active')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN is_products_active BOOLEAN NOT NULL DEFAULT TRUE
        `);
        console.log('✅ Added is_products_active');
      }

      if (!existingColumns.includes('is_category_active')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN is_category_active BOOLEAN NOT NULL DEFAULT TRUE
        `);
        console.log('✅ Added is_category_active');
      }

      if (!existingColumns.includes('is_vendors_active')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN is_vendors_active BOOLEAN NOT NULL DEFAULT TRUE
        `);
        console.log('✅ Added is_vendors_active');
      }

      if (!existingColumns.includes('is_marketplace_active')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN is_marketplace_active BOOLEAN NOT NULL DEFAULT TRUE
        `);
        console.log('✅ Added is_marketplace_active');
      }

      // Add order columns
      if (!existingColumns.includes('banners_order')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN banners_order INT NOT NULL DEFAULT 1
        `);
        console.log('✅ Added banners_order');
      }

      if (!existingColumns.includes('products_order')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN products_order INT NOT NULL DEFAULT 2
        `);
        console.log('✅ Added products_order');
      }

      if (!existingColumns.includes('category_order')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN category_order INT NOT NULL DEFAULT 3
        `);
        console.log('✅ Added category_order');
      }

      if (!existingColumns.includes('livestream_order')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN livestream_order INT NOT NULL DEFAULT 4
        `);
        console.log('✅ Added livestream_order');
      }

      if (!existingColumns.includes('vendors_order')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN vendors_order INT NOT NULL DEFAULT 5
        `);
        console.log('✅ Added vendors_order');
      }

      if (!existingColumns.includes('marketplace_order')) {
        await connection.execute(`
          ALTER TABLE app_settings 
          ADD COLUMN marketplace_order INT NOT NULL DEFAULT 6
        `);
        console.log('✅ Added marketplace_order');
      }

      // Update existing records with default values
      console.log('Updating existing records with default values...');
      await connection.execute(`
        UPDATE app_settings 
        SET 
          is_banners_active = COALESCE(is_banners_active, TRUE),
          is_products_active = COALESCE(is_products_active, TRUE),
          is_category_active = COALESCE(is_category_active, TRUE),
          is_vendors_active = COALESCE(is_vendors_active, TRUE),
          is_marketplace_active = COALESCE(is_marketplace_active, TRUE),
          banners_order = COALESCE(banners_order, 1),
          products_order = COALESCE(products_order, 2),
          category_order = COALESCE(category_order, 3),
          livestream_order = COALESCE(livestream_order, 4),
          vendors_order = COALESCE(vendors_order, 5),
          marketplace_order = COALESCE(marketplace_order, 6)
      `);
      console.log('✅ Updated existing records');
    }

    console.log('\n✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Error adding section status and order fields:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addSectionStatusAndOrderFields()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });




