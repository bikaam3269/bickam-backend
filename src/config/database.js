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
      connectTimeout: 60000
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
      connectTimeout: 60000
    }
  }
};
