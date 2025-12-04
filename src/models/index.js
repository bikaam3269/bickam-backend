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
import Notification from './Notification.js';
import LiveStream from './LiveStream.js';
import LiveStreamViewer from './LiveStreamViewer.js';
import LiveStreamMessage from './LiveStreamMessage.js';
import LiveStreamLike from './LiveStreamLike.js';

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
  Notification,
  LiveStream,
  LiveStreamViewer,
  LiveStreamMessage,
  LiveStreamLike,
  sequelize
};

// Test database connection
export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync models with database (creates tables if they don't exist)
    // NOTE: alter: false to avoid exceeding free tier query limits
    // For schema changes, manually run SQL or use migrations
    // Set SYNC_ALTER=true in .env if you need automatic schema updates (use with caution on free tiers)
    if (process.env.NODE_ENV !== 'production') {
      const shouldAlter = process.env.SYNC_ALTER === 'true';
      await sequelize.sync({ alter: shouldAlter });
      console.log(`Database models synchronized. (alter: ${shouldAlter})`);
    }
    
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    
    // Handle query limit exceeded error
    if (error.original && error.original.code === 'ER_USER_LIMIT_REACHED') {
      console.error('\n⚠️  Database query limit exceeded!');
      console.error('This is common on free database tiers.');
      console.error('Solutions:');
      console.error('1. Wait for the limit to reset (usually hourly)');
      console.error('2. Upgrade to a paid database plan');
      console.error('3. Reduce database operations (disable alter: true)');
      console.error('\nThe server will continue but database operations may fail.\n');
      // Don't throw - allow server to start but warn user
      return false;
    }
    
    throw error;
  }
};

export default models;

