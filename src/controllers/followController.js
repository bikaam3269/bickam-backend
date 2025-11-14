import followService from '../services/followService.js';

export const followVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followerId = req.user.id;

    await followService.followVendor(followerId, parseInt(vendorId));

    res.status(201).json({
      success: true,
      message: 'Successfully followed vendor'
    });
  } catch (error) {
    if (error.message === 'Vendor not found' || 
        error.message === 'Can only follow vendors' ||
        error.message === 'Already following this vendor' ||
        error.message === 'Cannot follow yourself') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const unfollowVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followerId = req.user.id;

    const result = await followService.unfollowVendor(followerId, parseInt(vendorId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Not following this vendor') {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followers = await followService.getFollowers(parseInt(vendorId));

    res.json({
      success: true,
      data: followers
    });
  } catch (error) {
    if (error.message === 'Vendor not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const following = await followService.getFollowing(userId);

    res.json({
      success: true,
      data: following
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowCount = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const count = await followService.getFollowCount(parseInt(vendorId));

    res.json({
      success: true,
      data: { followerCount: count }
    });
  } catch (error) {
    next(error);
  }
};

export const checkIsFollowing = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const followerId = req.user.id;
    const isFollowing = await followService.isFollowing(followerId, parseInt(vendorId));

    res.json({
      success: true,
      data: { isFollowing }
    });
  } catch (error) {
    next(error);
  }
};

export const getVendorStats = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const stats = await followService.getVendorStats(parseInt(vendorId));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

