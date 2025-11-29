import mysql from 'mysql2/promise';

const addLatLongColumns = async () => {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: '65.21.208.232',
            user: 'bikaam_bikaam',
            password: 'eO{p2IB;O@@y',
            database: 'bikaam_marketplace'
        });

        console.log('Connected to database');

        // Helper function to check if column exists
        const columnExists = async (columnName) => {
            const [rows] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = ?
      `, ['bikaam_marketplace', columnName]);
            return rows.length > 0;
        };

        // Add latitude column
        if (!await columnExists('latitude')) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN latitude DECIMAL(10, 8) NULL 
        COMMENT 'Vendor location latitude'
      `);
            console.log('✓ Added latitude column');
        } else {
            console.log('ℹ️  latitude column already exists');
        }

        // Add longitude column
        if (!await columnExists('longitude')) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN longitude DECIMAL(11, 8) NULL 
        COMMENT 'Vendor location longitude'
      `);
            console.log('✓ Added longitude column');
        } else {
            console.log('ℹ️  longitude column already exists');
        }

        // Add whatsapp_number column
        if (!await columnExists('whatsapp_number')) {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN whatsapp_number VARCHAR(255) NULL 
        COMMENT 'Vendor WhatsApp contact number'
      `);
            console.log('✓ Added whatsapp_number column');
        } else {
            console.log('ℹ️  whatsapp_number column already exists');
        }

        // Add address column
        if (!await columnExists('address')) {
            // Simplified syntax without explicit charset/collate to avoid syntax errors
            // It will inherit from table default which should be utf8mb4
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN address TEXT NULL 
        COMMENT 'Vendor physical address'
      `);
            console.log('✓ Added address column');
        } else {
            console.log('ℹ️  address column already exists');
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
};

// Run migration
addLatLongColumns()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
