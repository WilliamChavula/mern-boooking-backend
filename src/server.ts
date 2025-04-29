import express from 'express';
import type {Request, Response, NextFunction, Express} from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connect } from 'mongoose';


// Initialize express app
const app: Express = express();
const port = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
  });
});

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB if connection string is provided
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      await connect(mongoUri);
      console.log('Connected to MongoDB');
    } else {
      console.warn('MongoDB connection string (MONGODB_URI) not provided');
    }

    app.listen(port, (error) => {
      if (error) {
        console.log(error);
      }
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

export { app, startServer };
