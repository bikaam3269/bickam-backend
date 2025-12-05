import mysql from 'mysql2/promise';
import { dbConfig } from './src/config/database.js';
import 'dotenv/config';

const config = dbConfig[process.env.NODE_ENV || 'development'];

async function addOrderShippingFields() {
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

    // Check and add from_city_id
    console.log('Checking from_city_id column...');
    const [columns1] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'from_city_id'
    `, [config.database]);

    if (columns1.length === 0) {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN from_city_id INT NULL
      `);
      console.log('✅ Added from_city_id to orders');
    } else {
      console.log('✅ from_city_id already exists in orders');
    }

    // Check and add to_city_id
    console.log('Checking to_city_id column...');
    const [columns2] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'to_city_id'
    `, [config.database]);

    if (columns2.length === 0) {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN to_city_id INT NULL
      `);
      console.log('✅ Added to_city_id to orders');
    } else {
      console.log('✅ to_city_id already exists in orders');
    }

    // Check and add shipping_price
    console.log('Checking shipping_price column...');
    const [columns3] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'shipping_price'
    `, [config.database]);

    if (columns3.length === 0) {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN shipping_price DECIMAL(10, 2) NOT NULL DEFAULT 0
      `);
      console.log('✅ Added shipping_price to orders');
    } else {
      console.log('✅ shipping_price already exists in orders');
    }

    // Check and update payment_status ENUM to include 'remaining'
    console.log('Checking payment_status ENUM...');
    const [columns4] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'payment_status'
    `, [config.database]);

    if (columns4.length > 0) {
      const columnType = columns4[0].COLUMN_TYPE;
      if (!columnType.includes('remaining')) {
        await connection.execute(`
          ALTER TABLE orders 
          MODIFY COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'remaining') NOT NULL DEFAULT 'pending'
        `);
        console.log('✅ Updated payment_status ENUM to include remaining');
      } else {
        console.log('✅ payment_status ENUM already includes remaining');
      }
    }

    // Check and add remaining_amount
    console.log('Checking remaining_amount column...');
    const [columns5] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'remaining_amount'
    `, [config.database]);

    if (columns5.length === 0) {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN remaining_amount DECIMAL(10, 2) NULL DEFAULT 0
      `);
      console.log('✅ Added remaining_amount to orders');
    } else {
      console.log('✅ remaining_amount already exists in orders');
    }

    // Add foreign keys if they don't exist
    console.log('Checking foreign keys...');
    const [fks] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME IN ('from_city_id', 'to_city_id')
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [config.database]);

    const existingFks = fks.map(fk => fk.CONSTRAINT_NAME);

    if (!existingFks.some(name => name.includes('from_city'))) {
      try {
        await connection.execute(`
          ALTER TABLE orders 
          ADD CONSTRAINT fk_orders_from_city 
          FOREIGN KEY (from_city_id) REFERENCES cities(id) ON DELETE SET NULL
        `);
        console.log('✅ Added foreign key for from_city_id');
      } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') {
          console.warn('⚠️  Could not add foreign key for from_city_id:', error.message);
        }
      }
    }

    if (!existingFks.some(name => name.includes('to_city'))) {
      try {
        await connection.execute(`
          ALTER TABLE orders 
          ADD CONSTRAINT fk_orders_to_city 
          FOREIGN KEY (to_city_id) REFERENCES cities(id) ON DELETE SET NULL
        `);
        console.log('✅ Added foreign key for to_city_id');
      } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') {
          console.warn('⚠️  Could not add foreign key for to_city_id:', error.message);
        }
      }
    }

    console.log('\n✅ All order shipping fields added successfully');

  } catch (error) {
    console.error('❌ Error adding order shipping fields:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

addOrderShippingFields()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

