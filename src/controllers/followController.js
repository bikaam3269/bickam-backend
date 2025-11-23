import followService from '../services/followService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const followVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followerId = req.user.id;

    await followService.followVendor(followerId, parseInt(vendorId));

    return sendSuccess(res, null, 'Successfully followed vendor', 201);
  } catch (error) {
    if (error.message === 'Vendor not found' || 
        error.message === 'Can only follow vendors' ||
        error.message === 'Already following this vendor' ||
        error.message === 'Cannot follow yourself') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const unfollowVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followerId = req.user.id;

    const result = await followService.unfollowVendor(followerId, parseInt(vendorId));

    return sendSuccess(res, result, 'Successfully unfollowed vendor');
  } catch (error) {
    if (error.message === 'Not following this vendor') {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followers = await followService.getFollowers(parseInt(vendorId));

    return sendSuccess(res, followers, 'Followers retrieved successfully');
  } catch (error) {
    if (error.message === 'Vendor not found') {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const following = await followService.getFollowing(userId);

    return sendSuccess(res, following, 'Following list retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getFollowCount = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const count = await followService.getFollowCount(parseInt(vendorId));

    return sendSuccess(res, { followerCount: count }, 'Follower count retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const checkIsFollowing = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followerId = req.user.id;
    const isFollowing = await followService.isFollowing(followerId, parseInt(vendorId));

    return sendSuccess(res, { isFollowing }, 'Follow status retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getVendorStats = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const stats = await followService.getVendorStats(parseInt(vendorId));

    return sendSuccess(res, stats, 'Vendor stats retrieved successfully');
  } catch (error) {
    next(error);
  }

};
 




