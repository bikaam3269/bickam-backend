import dashboardService from '../services/dashboardService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const { governmentId } = req.query;
    
    const stats = await dashboardService.getDashboardStats(governmentId && governmentId !== 'all' ? governmentId : null);

    return sendSuccess(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    next(error);
  }
};

export const getGovernorates = async (req, res, next) => {
  try {
    const governorates = await dashboardService.getGovernorates();

    return sendSuccess(res, governorates, 'Governorates retrieved successfully');
  } catch (error) {
    next(error);
  }
};
