import { Op } from 'sequelize';
import sequelize from '../config/sequelize.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import City from '../models/City.js';
import Government from '../models/Government.js';

class DashboardService {
  async getDashboardStats(governmentId = null) {
    try {
      // Build where conditions based on governmentId
      const userWhere = {};
      const productWhere = {};
      const orderWhere = {};
      let vendorIds = [];

      if (governmentId && governmentId !== 'all') {
      // Get all cities in this government
      const cities = await City.findAll({
        where: { governmentId: parseInt(governmentId) },
        attributes: ['id']
      });
      const cityIds = cities.map(city => city.id);

      // Filter users by governmentId
      userWhere.governmentId = parseInt(governmentId);

      // Filter products by vendor's city (vendors in cities of this government)
      const vendorsInGovernment = await User.findAll({
        where: {
          type: 'vendor',
          cityId: { [Op.in]: cityIds }
        },
        attributes: ['id']
      });
      vendorIds = vendorsInGovernment.map(v => v.id);
      productWhere.vendorId = { [Op.in]: vendorIds };

      // Filter orders by vendor's city
      orderWhere.vendorId = { [Op.in]: vendorIds };
    }

    // Count users by type (excluding admin)
    const totalUsers = await User.count({
      where: {
        ...userWhere,
        type: { [Op.ne]: 'admin' }
      }
    });

    const regularUsers = await User.count({
      where: {
        ...userWhere,
        type: 'user'
      }
    });

    const marketingUsers = await User.count({
      where: {
        ...userWhere,
        type: 'marketing'
      }
    });

    // Count vendors
    const totalVendors = await User.count({
      where: {
        ...userWhere,
        type: 'vendor'
      }
    });

    // Get vendor activities (unique activities) - using raw query
    const activitiesWhere = Object.keys(userWhere).length > 0
      ? { ...userWhere, type: 'vendor', activity: { [Op.ne]: null } }
      : { type: 'vendor', activity: { [Op.ne]: null } };
    
    const vendors = await User.findAll({
      where: activitiesWhere,
      attributes: ['activity'],
      raw: true
    });
    
    // Get unique activities
    const uniqueActivities = [...new Set(vendors.map(v => v.activity).filter(Boolean))];
    const activities = uniqueActivities;

    // Count products
    const productWhereClause = Object.keys(productWhere).length > 0 ? productWhere : {};
    const totalProducts = await Product.count({
      where: productWhereClause
    });

    const activeProducts = await Product.count({
      where: {
        ...productWhereClause,
        isActive: true
      }
    });

    const inactiveProducts = await Product.count({
      where: {
        ...productWhereClause,
        isActive: false
      }
    });

    // Count orders
    const orderWhereClause = Object.keys(orderWhere).length > 0 ? orderWhere : {};
    const totalOrders = await Order.count({
      where: orderWhereClause
    });

    const pendingOrders = await Order.count({
      where: {
        ...orderWhereClause,
        status: 'pending'
      }
    });

    const confirmedOrders = await Order.count({
      where: {
        ...orderWhereClause,
        status: 'confirmed'
      }
    });

    const processingOrders = await Order.count({
      where: {
        ...orderWhereClause,
        status: 'processing'
      }
    });

    const shippedOrders = await Order.count({
      where: {
        ...orderWhereClause,
        status: 'shipped'
      }
    });

    const deliveredOrders = await Order.count({
      where: {
        ...orderWhereClause,
        status: 'delivered'
      }
    });

    const cancelledOrders = await Order.count({
      where: {
        ...orderWhereClause,
        status: 'cancelled'
      }
    });

    // Calculate total revenue (sum of all order totals) - using raw query for better performance
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;

    try {
      if (Object.keys(orderWhereClause).length > 0 && orderWhereClause.vendorId && orderWhereClause.vendorId[Op.in]) {
        const vendorIdsArray = orderWhereClause.vendorId[Op.in];
        if (vendorIdsArray.length > 0) {
          const [revenueResults] = await sequelize.query(`
            SELECT 
              COALESCE(SUM(total), 0) as totalRevenue,
              COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as paidRevenue,
              COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'remaining') THEN total ELSE 0 END), 0) as pendingRevenue
            FROM orders
            WHERE vendor_id IN (${vendorIdsArray.join(',')})
          `);
          if (revenueResults && revenueResults.length > 0 && revenueResults[0]) {
            totalRevenue = parseFloat(revenueResults[0].totalRevenue || 0) || 0;
            paidRevenue = parseFloat(revenueResults[0].paidRevenue || 0) || 0;
            pendingRevenue = parseFloat(revenueResults[0].pendingRevenue || 0) || 0;
          }
        }
      } else {
        const [revenueResults] = await sequelize.query(`
          SELECT 
            COALESCE(SUM(total), 0) as totalRevenue,
            COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as paidRevenue,
            COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'remaining') THEN total ELSE 0 END), 0) as pendingRevenue
          FROM orders
        `);
        if (revenueResults && revenueResults.length > 0 && revenueResults[0]) {
          totalRevenue = parseFloat(revenueResults[0].totalRevenue || 0) || 0;
          paidRevenue = parseFloat(revenueResults[0].paidRevenue || 0) || 0;
          pendingRevenue = parseFloat(revenueResults[0].pendingRevenue || 0) || 0;
        }
      }
    } catch (error) {
      console.error('Error calculating revenue:', error);
      // Continue with default values (0)
    }

    // Get orders by vendor (for vendor activity) - using raw query for better performance
    let ordersByVendor = [];
    try {
      if (orderWhereClause.vendorId && orderWhereClause.vendorId[Op.in]) {
        const vendorIdsArray = Array.isArray(orderWhereClause.vendorId[Op.in]) 
          ? orderWhereClause.vendorId[Op.in] 
          : [];
        
        if (vendorIdsArray.length > 0) {
          const [results] = await sequelize.query(`
            SELECT 
              o.vendor_id as vendorId,
              COUNT(o.id) as orderCount,
              COALESCE(SUM(o.total), 0) as totalRevenue
            FROM orders o
            WHERE o.vendor_id IN (${vendorIdsArray.join(',')})
            GROUP BY o.vendor_id
            ORDER BY orderCount DESC
            LIMIT 10
          `);

          // Get vendor details for each result
          for (const result of results) {
            try {
              const vendor = await User.findByPk(result.vendorId, {
                attributes: ['id', 'name', 'activity']
              });
              if (vendor) {
                ordersByVendor.push({
                  id: vendor.id,
                  name: vendor.name || 'غير معروف',
                  activity: vendor.activity || null,
                  orderCount: parseInt(result.orderCount || 0) || 0,
                  revenue: parseFloat(result.totalRevenue || 0) || 0
                });
              }
            } catch (error) {
              console.error(`Error fetching vendor ${result.vendorId}:`, error);
              // Continue with next vendor
            }
          }
        }
      } else {
        // For all governorates, get top vendors
        const [results] = await sequelize.query(`
          SELECT 
            o.vendor_id as vendorId,
            COUNT(o.id) as orderCount,
            COALESCE(SUM(o.total), 0) as totalRevenue
          FROM orders o
          GROUP BY o.vendor_id
          ORDER BY orderCount DESC
          LIMIT 10
        `);

        for (const result of results) {
          try {
            const vendor = await User.findByPk(result.vendorId, {
              attributes: ['id', 'name', 'activity']
            });
            if (vendor) {
              ordersByVendor.push({
                id: vendor.id,
                name: vendor.name || 'غير معروف',
                activity: vendor.activity || null,
                orderCount: parseInt(result.orderCount || 0) || 0,
                revenue: parseFloat(result.totalRevenue || 0) || 0
              });
            }
          } catch (error) {
            console.error(`Error fetching vendor ${result.vendorId}:`, error);
            // Continue with next vendor
          }
        }
      }
    } catch (error) {
      console.error('Error getting orders by vendor:', error);
      // Continue with empty array
    }

    // Calculate percentage changes (comparing with previous period)
    // For now, we'll return 0% change. You can implement actual comparison later
    const previousPeriodUsers = 0;
    const previousPeriodVendors = 0;
    const previousPeriodProducts = 0;
    const previousPeriodOrders = 0;

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
    };

    return {
      users: {
        total: totalUsers,
        regular: regularUsers,
        marketing: marketingUsers,
        change: calculateChange(totalUsers, previousPeriodUsers)
      },
      vendors: {
        total: totalVendors,
        activities: activities,
        topVendors: ordersByVendor,
        change: calculateChange(totalVendors, previousPeriodVendors)
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts,
        change: calculateChange(totalProducts, previousPeriodProducts)
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        confirmed: confirmedOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        change: calculateChange(totalOrders, previousPeriodOrders)
      },
      revenue: {
        total: totalRevenue,
        paid: paidRevenue,
        pending: pendingRevenue,
        currency: 'EGP'
      }
    };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }

  async getGovernorates() {
    const governorates = await Government.findAll({
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });

    return governorates;
  }
}

export default new DashboardService();
