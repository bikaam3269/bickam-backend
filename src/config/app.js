import 'dotenv/config';

export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  api: {
    prefix: '/api/v1'
  }
};

