import vendorService from './src/services/vendorService.js';
import User from './src/models/User.js';
import sequelize from './src/config/sequelize.js';

async function verify() {
    try {
        console.log('Finding a vendor...');
        const vendor = await User.findOne({ where: { type: 'vendor' } });

        if (!vendor) {
            console.log('No vendor found to test with.');
            return;
        }

        console.log(`Testing with vendor ID: ${vendor.id}`);

        const fromDate = '2024-01-01';
        const toDate = '2024-12-31';

        console.log(`Getting revenue from ${fromDate} to ${toDate}...`);
        const result = await vendorService.getVendorRevenue(vendor.id, new Date(fromDate), new Date(toDate));

        console.log('Result Summary:', JSON.stringify(result.summary, null, 2));
        console.log('Daily Breakdown Length:', result.dailyBreakdown.length);

        if (result.dailyBreakdown.length > 0) {
            console.log('First 3 days:', JSON.stringify(result.dailyBreakdown.slice(0, 3), null, 2));
            console.log('Last 3 days:', JSON.stringify(result.dailyBreakdown.slice(-3), null, 2));
        }

        // Verify total matches sum of daily
        const sumRevenue = result.dailyBreakdown.reduce((sum, day) => sum + day.revenue, 0);
        const sumOrders = result.dailyBreakdown.reduce((sum, day) => sum + day.orders, 0);

        console.log(`Sum of Daily Revenue: ${sumRevenue}`);
        console.log(`Total Revenue from Summary: ${result.summary.totalRevenue}`);
        console.log(`Sum of Daily Orders: ${sumOrders}`);
        console.log(`Total Orders from Summary: ${result.summary.totalOrders}`);

        if (Math.abs(sumRevenue - result.summary.totalRevenue) < 0.01 && sumOrders === result.summary.totalOrders) {
            console.log('VERIFICATION SUCCESS: Totals match!');
        } else {
            console.log('VERIFICATION FAILED: Totals do not match.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

verify();
