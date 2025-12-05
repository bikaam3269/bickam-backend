import mysql from 'mysql2/promise';
import dbConfig from './src/config/database.js';

async function createWalletInfoTable() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to database');

    // Create wallet_info table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS wallet_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'Wallet name (e.g., Vodafone Cash, InstaPay, Bank Name)',
        wallet_id VARCHAR(255) NOT NULL COMMENT 'Wallet identifier (phone number, account number, etc.)',
        is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether this wallet info is active and visible to users',
        display_order INT NOT NULL DEFAULT 0 COMMENT 'Order for displaying wallet info in lists',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableQuery);
    console.log('✅ wallet_info table created successfully');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run migration
createWalletInfoTable();

