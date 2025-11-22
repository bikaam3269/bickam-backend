import productService from '../services/productService.js';

export const getAllProducts = async (req, res, next) => {
  try {
    const filters = {
      vendorId: req.query.vendorId,
      categoryId: req.query.categoryId,
      subcategoryId: req.query.subcategoryId,
      search: req.query.search,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
    };

    const products = await productService.getAllProducts(filters);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    // Only vendors can create products
    if (req.user.type !== 'vendor' && req.user.type !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only vendors can create products' }
      });
    }

    const productData = { ...req.body };
    // Attach vendorId based on user role
    if (req.user.type === 'vendor') {
      productData.vendorId = req.user.id;
    } else if (req.user.type === 'admin' && !productData.vendorId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Admin must specify vendorId for the product' }
      });
    }
    // Attach uploaded image filenames (if any)
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(f => f.filename);
    }
    const product = await productService.createProduct(productData);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0].message }
      });
    }
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.body, req.user);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Unauthorized to update this product') {
      return res.status(403).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0].message }
      });
    }
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id, req.user);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Unauthorized to delete this product') {
      return res.status(403).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getProductsByVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const products = await productService.getProductsByVendor(vendorId);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

