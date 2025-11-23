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
      charset: 'utf8mb4'
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ...(databaseConfig.define || {})
    },
    pool: {
      max: 2, // Reduced for free tier limits
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export default sequelize;


