import cron from 'node-cron';
import marketplaceProductService from '../services/marketplaceProductService.js';
import discountService from '../services/discountService.js';

/**
 * Cron job to delete expired marketplace products
 * Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
 */
export const startMarketplaceCleanupJob = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Cron Job] Starting marketplace products cleanup...');
      const result = await marketplaceProductService.deleteExpiredProducts();
      
      if (result.deletedCount > 0) {
        console.log(`[Cron Job] ✅ Deleted ${result.deletedCount} expired marketplace products`);
        console.log(`[Cron Job] ✅ Deleted ${result.deletedFiles} associated files`);
        console.log(`[Cron Job] Products deleted:`, result.products.map(p => `${p.name} (ID: ${p.id})`).join(', '));
      } else {
        console.log('[Cron Job] No expired products to delete');
      }
    } catch (error) {
      console.error('[Cron Job] ❌ Error during marketplace cleanup:', error.message);
    }
  });

  console.log('✅ Marketplace cleanup cron job started (runs every hour)');
};

/**
 * Cron job to delete expired discounts
 * Runs every hour at minute 5 (e.g., 1:05, 2:05, 3:05, etc.)
 */
export const startDiscountCleanupJob = () => {
  // Run every hour at minute 5 (5 minutes after marketplace cleanup)
  cron.schedule('5 * * * *', async () => {
    try {
      console.log('[Cron Job] Starting expired discounts cleanup...');
      const result = await discountService.deleteExpiredDiscounts();
      
      if (result.deletedCount > 0) {
        console.log(`[Cron Job] ✅ Deleted ${result.deletedCount} expired discounts`);
        console.log(`[Cron Job] ✅ Deleted ${result.deletedProductsCount} associated discount products`);
        console.log(`[Cron Job] Discounts deleted:`, result.discounts.map(d => `${d.title} (ID: ${d.id}, Ended: ${d.endDate})`).join(', '));
      } else {
        console.log('[Cron Job] No expired discounts to delete');
      }
    } catch (error) {
      console.error('[Cron Job] ❌ Error during discount cleanup:', error.message);
    }
  });

  console.log('✅ Discount cleanup cron job started (runs every hour at minute 5)');
};

/**
 * Alternative: Run cleanup every day at 2:00 AM
 * Uncomment this and comment the above if you prefer daily cleanup
 */
/*
export const startMarketplaceCleanupJob = () => {
  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Cron Job] Starting marketplace products cleanup...');
      const result = await marketplaceProductService.deleteExpiredProducts();
      
      if (result.deletedCount > 0) {
        console.log(`[Cron Job] ✅ Deleted ${result.deletedCount} expired marketplace products`);
        console.log(`[Cron Job] ✅ Deleted ${result.deletedFiles} associated files`);
      } else {
        console.log('[Cron Job] No expired products to delete');
      }
    } catch (error) {
      console.error('[Cron Job] ❌ Error during marketplace cleanup:', error.message);
    }
  });

  console.log('✅ Marketplace cleanup cron job started (runs daily at 2:00 AM)');
};
*/

