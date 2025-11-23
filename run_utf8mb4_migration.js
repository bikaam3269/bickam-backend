import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbConfig } from './src/config/database.js';
import { config } from './src/config/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = config.env || 'development';
const databaseConfig = dbConfig[env] || dbConfig.development;

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.username,
      password: databaseConfig.password,
      database: databaseConfig.database,
      multipleStatements: true // Allow multiple SQL statements
    });

    console.log('Connected successfully!');
    console.log('Reading migration file...');
    
    const migrationFile = path.join(__dirname, 'fix_utf8mb4_encoding.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Split by semicolon and filter out comments and empty statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => 
        stmt.length > 0 && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('=') &&
        !stmt.startsWith('SELECT') &&
        !stmt.startsWith('FROM') &&
        (stmt.toLowerCase().startsWith('alter') || stmt.toLowerCase().startsWith('modify'))
      );

    console.log(`Found ${statements.length} ALTER statements to execute`);
    console.log('Starting migration...\n');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`);
        await connection.execute(statement + ';');
        console.log('✓ Success\n');
      } catch (error) {
        // If column doesn't exist or already converted, skip
        if (error.code === 'ER_BAD_FIELD_ERROR' || 
            error.message.includes('Duplicate column name') ||
            error.message.includes('Unknown column')) {
          console.log(`⚠ Skipped (column may not exist or already converted)\n`);
        } else {
          console.error(`✗ Error: ${error.message}\n`);
          // Continue with other statements
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('All text columns should now support Arabic characters.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the migration
runMigration();

