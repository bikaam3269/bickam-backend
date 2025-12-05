import { Sequelize } from 'sequelize';
import { dbConfig } from './database.js';
import { config } from './app.js';

const env = config.env;
const databaseConfig = dbConfig[env] || dbConfig.development;

const sequelize = new Sequelize(
  databaseConfig.database,
  databaseConfig.username,
  databaseConfig.password,
  {
    host: databaseConfig.host,
    port: databaseConfig.port,
    dialect: databaseConfig.dialect,
    logging: databaseConfig.logging,
    dialectOptions: {
      ...(databaseConfig.dialectOptions || {}),
      charset: 'utf8mb4',
      connectTimeout: 60000,
      acquireTimeout: 60000,
      timeout: 30000
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ...(databaseConfig.define || {})
    },
    pool: {
      max: 2, // Reduced for free tier limits
      min: 0,
      acquire: 60000, // Increased timeout for acquiring connection
      idle: 10000,
      evict: 1000 // Check for idle connections every second
    },
    retry: {
      max: 3, // Retry failed queries up to 3 times
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ]
    }
  }
);

export default sequelize;


