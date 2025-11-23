export const dbConfig = {
  development: {
    username: 'bikaam_bikaam',
    password: 'eO{p2IB;O@@y',
    database: 'bikaam_marketplace',
    host: '65.21.208.232',
    port: 3306,
    dialect: 'mysql',
    logging: console.log,
    dialectOptions: {
      connectTimeout: 60000,
      charset: 'utf8mb4'
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  },
  production: {
    username: 'bikaam_bikaam',
    password: 'eO{p2IB;O@@y',
    database: 'bikaam_marketplace',
    host: '65.21.208.232',
    port: 3306,
    dialect: 'mysql',
    logging: console.log,
    dialectOptions: {
      connectTimeout: 60000,
      charset: 'utf8mb4'
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
};
