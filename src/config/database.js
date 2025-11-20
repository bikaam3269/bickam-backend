export const dbConfig = {
  development: {
    username: 'freedb_bikkam_user',
    password: 'BCbaWgWRP3@#PJZ',
    database: 'freedb_bikaam',
    host: 'sql.freedb.tech',
    port: 3306,
    dialect: 'mysql',
    logging: console.log,
    dialectOptions: {
      connectTimeout: 60000
    }
  },
  production: {
    username: 'freedb_bikkam_user',
    password: 'BCbaWgWRP3@#PJZ',
    database: 'freedb_bikaam',
    host: 'sql.freedb.tech',
    port: 3306,
    dialect: 'mysql',
    logging: console.log,
    dialectOptions: {
      connectTimeout: 60000
    }
  }
};
