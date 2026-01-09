import vendorService from './src/services/vendorService.js';
import sequelize from './src/config/sequelize.js';
import Order from './src/models/Order.js';

async function testRevenue() {
    try {
        // Test vendor ID 10 
        const vendorId = 10;
        
        console.log('\n=== Testing Revenue for Vendor 10 ===\n');
        
        // First, check if there are ANY orders for this vendor
        const allOrders = await Order.findAll({
            where: { vendorId },
            attributes: ['id', 'total', 'createdAt', 'status', 'paymentStatus'],
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        console.log(`Found ${allOrders.length} orders for vendor ${vendorId}:`);
        allOrders.forEach(order => {
            const data = order.toJSON();
            console.log(`  Order #${data.id}: ${data.total} SAR on ${data.createdAt}`);
        });
        
        // Now test the revenue service
        console.log('\n=== Testing Revenue Service ===\n');
        
        const fromDate = new Date('2024-01-01');
        const toDate = new Date('2024-12-31');
        
        try {
            const revenue = await vendorService.getVendorRevenue(vendorId, fromDate, toDate);
            console.log('Revenue Result:', JSON.stringify(revenue, null, 2));
        } catch (error) {
            console.error('Service Error:', error.message);
        }
        
        // Check for orders in 2025 instead
        console.log('\n=== Checking 2025 Orders ===\n');
        const orders2025 = await Order.findAll({
            where: { 
                vendorId,
                createdAt: {
                    $gte: new Date('2025-01-01'),
                    $lte: new Date('2025-12-31')
                }
            },
            attributes: ['id', 'total', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        console.log(`Found ${orders2025.length} orders in 2025`);
        orders2025.forEach(order => {
            const data = order.toJSON();
            console.log(`  Order #${data.id}: ${data.total} SAR on ${data.createdAt}`);
        });
        
        await sequelize.close();
    } catch (error) {
        console.error('Error:', error);
        await sequelize.close();
    }
}

testRevenue();







