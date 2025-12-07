import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createMarketplaceSettingsTable() {
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

    // Check if table already exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'marketplace_settings'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('✅ marketplace_settings table already exists');
      
      // Check if default setting exists
      const [settings] = await connection.execute(`
        SELECT * FROM marketplace_settings WHERE \`key\` = 'default_expiration_days'
      `);
      
      if (settings.length === 0) {
        console.log('Creating default setting...');
        await connection.execute(`
          INSERT INTO marketplace_settings (\`key\`, \`value\`, \`description\`) 
          VALUES ('default_expiration_days', '10', 'عدد الأيام الافتراضي لانتهاء المنتجات المستعملة بعد الموافقة عليها')
        `);
        console.log('✅ Default setting created');
      }
      
      return;
    }

    // Create marketplace_settings table
    console.log('Creating marketplace_settings table...');
    await connection.execute(`
      CREATE TABLE marketplace_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NULL,
        description TEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_marketplace_settings_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Successfully created marketplace_settings table');

    // Create default setting
    console.log('Creating default setting...');
    await connection.execute(`
      INSERT INTO marketplace_settings (\`key\`, \`value\`, \`description\`) 
      VALUES ('default_expiration_days', '10', 'عدد الأيام الافتراضي لانتهاء المنتجات المستعملة بعد الموافقة عليها')
    `);
    console.log('✅ Default setting created');

    // Verify table was created
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'marketplace_settings'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    console.log('\n📋 Table structure:');
    console.table(columns.map(col => ({
      Column: col.COLUMN_NAME,
      Type: col.DATA_TYPE,
      Nullable: col.IS_NULLABLE,
      Default: col.COLUMN_DEFAULT || 'N/A'
    })));

  } catch (error) {
    console.error('❌ Error creating marketplace_settings table:', error.message);
    
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists (table exists error)');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

createMarketplaceSettingsTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

