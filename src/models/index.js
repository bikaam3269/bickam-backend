import sequelize from '../config/sequelize.js';
import User from './User.js';
import Government from './Government.js';
import Category from './Category.js';
import Subcategory from './Subcategory.js';
import Product from './Product.js';
import Follow from './Follow.js';
import Cart from './Cart.js';
import Favorite from './Favorite.js';
import Wallet from './Wallet.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';

// Define associations
Category.hasMany(Subcategory, {
  foreignKey: 'categoryId',
  as: 'subcategories'
});

// Initialize all models
const models = {
  User,
  Government,
  Category,
  Subcategory,
  Product,
  Follow,
  Cart,
  Favorite,
  Wallet,
  Order,
  OrderItem,
  sequelize
};

// Test database connection
export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync models with database (creates tables if they don't exist)
    // In production, use migrations instead of sync
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('Database models synchronized.');
    }
    
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default models;

