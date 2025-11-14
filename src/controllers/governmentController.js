import governmentService from '../services/governmentService.js';

export const getAllGovernments = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search
    };

    const governments = await governmentService.getAllGovernments(filters);

    res.json({
      success: true,
      data: governments
    });
  } catch (error) {
    next(error);
  }
};

export const getGovernmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const government = await governmentService.getGovernmentById(id);

    res.json({
      successi : true,
      data: government
    });
  } catch (error) {
    if (error.message === 'Government not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const getGovernmentByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const government = await governmentService.getGovernmentByCode(code);

    res.json({
      success: true,
      data: government
    });
  } catch (error) {
    if (error.message === 'Government not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

export const createGovernment = async (req, res, next) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name and code are required' }
      });
    }

    const government = await governmentService.createGovernment({
      name,
      code
    });

    res.status(201).json({
      success: true,
      data: government
    });
  } catch (error) {
    if (error.message === 'Government code already exists') {
      return res.status(409).json({
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

export const updateGovernment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const government = await governmentService.updateGovernment(id, req.body);

    res.json({
      success: true,
      data: government
    });
  } catch (error) {
    if (error.message === 'Government not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    if (error.message === 'Government code already exists') {
      return res.status(409).json({
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

export const deleteGovernment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await governmentService.deleteGovernment(id);

    res.json({
      success: true,
      message: 'Government deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Government not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};


