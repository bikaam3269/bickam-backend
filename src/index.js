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

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    await connectDatabase();
    
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
