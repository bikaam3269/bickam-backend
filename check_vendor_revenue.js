import sequelize from './src/config/sequelize.js';
import Order from './src/models/Order.js';
import { Op } from 'sequelize';

async function checkVendorRevenue() {
    try {
        // Get vendor ID from command line or use default
        const vendorId = process.argv[2] || 10; // Default vendor ID
        const fromDate = process.argv[3] || '2024-01-01';
        const toDate = process.argv[4] || '2024-12-31';

        console.log(`\nChecking revenue for vendor ${vendorId} from ${fromDate} to ${toDate}\n`);

        // Build where clause
        const where = { vendorId };
        
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        
        where.createdAt = {
            [Op.gte]: startDate,
            [Op.lte]: endDate
        };

        console.log('Query where clause:', JSON.stringify(where, null, 2));

        // Get all orders for this vendor in date range
        const orders = await Order.findAll({
            where,
            attributes: ['id', 'total', 'vendorId', 'createdAt', 'paymentStatus', 'status'],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        console.log(`\nFound ${orders.length} orders (showing first 10):`);
        orders.forEach(order => {
            const orderData = order.toJSON();
            console.log(`- Order #${orderData.id}: Total=${orderData.total}, Date=${orderData.createdAt}, Status=${orderData.status}, Payment=${orderData.paymentStatus}`);
        });

        // Get total count and revenue
        const totalResult = await Order.findOne({
            where,
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
            ],
            raw: true
        });

        console.log('\nSummary:');
        console.log(`Total Orders: ${totalResult.totalOrders || 0}`);
        console.log(`Total Revenue: ${totalResult.totalRevenue || 0}`);

        // Check if vendor exists in any order
        const vendorOrders = await Order.findAll({
            where: { vendorId },
            attributes: ['id', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        console.log(`\nAll orders for vendor ${vendorId} (any date):`, vendorOrders.length);
        vendorOrders.forEach(order => {
            const orderData = order.toJSON();
            console.log(`- Order #${orderData.id}: ${orderData.createdAt}`);
        });

        // Get all unique vendor IDs that have orders
        const vendorsWithOrders = await Order.findAll({
            attributes: [
                'vendorId',
                [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount']
            ],
            group: ['vendorId'],
            raw: true,
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 10
        });

        console.log('\nVendors with orders (top 10):');
        vendorsWithOrders.forEach(vendor => {
            console.log(`- Vendor ${vendor.vendorId}: ${vendor.orderCount} orders`);
        });

        await sequelize.close();
    } catch (error) {
        console.error('Error:', error.message);
        await sequelize.close();
        process.exit(1);
    }
}

checkVendorRevenue();



