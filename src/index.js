import express from 'express';
import { config } from './config/app.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { connectDatabase } from './models/index.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(config.api.prefix, routes);

import path from 'path';
app.use('/files', express.static(path.resolve(process.cwd(), 'files')));


// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.warn('⚠️  Server starting with limited database functionality due to query limits.');
      console.warn('⚠️  Some database operations may fail. Please wait for limit reset or upgrade your plan.\n');
    }

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
      console.log(`Environment: ${config.env}`);
      console.log(`API available at http://localhost:${config.port}${config.api.prefix}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
