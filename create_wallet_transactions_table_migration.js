import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function createWalletTransactionsTable() {
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
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'wallet_transactions'
    `, [config.database]);

    if (tables.length > 0) {
      console.log('✅ wallet_transactions table already exists');
      return;
    }
    
    console.log('Creating wallet_transactions table...');
    await connection.execute(`
      CREATE TABLE wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('deposit', 'withdrawal', 'payment', 'refund', 'transfer_in', 'transfer_out') NOT NULL COMMENT 'Transaction type',
        amount DECIMAL(10, 2) NOT NULL COMMENT 'Transaction amount (always positive)',
        balance_before DECIMAL(10, 2) NOT NULL COMMENT 'Wallet balance before transaction',
        balance_after DECIMAL(10, 2) NOT NULL COMMENT 'Wallet balance after transaction',
        description TEXT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Transaction description',
        reference_id INT NULL COMMENT 'Reference to related entity (e.g., order_id, wallet_request_id)',
        reference_type VARCHAR(50) NULL COMMENT 'Type of reference (e.g., order, wallet_request)',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_wallet_transactions_user_id (user_id),
        INDEX idx_wallet_transactions_type (type),
        INDEX idx_wallet_transactions_created_at (created_at),
        INDEX idx_wallet_transactions_reference (reference_id, reference_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Successfully created wallet_transactions table');
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'wallet_transactions'
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
    console.error('❌ Error creating wallet_transactions table:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists (table exists error)');
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.error('⚠️  Error: users table does not exist. Please create users table first.');
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

createWalletTransactionsTable()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });


