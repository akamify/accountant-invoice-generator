import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import { errorHandler } from './middleware/error';

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://glow-invoice.vercel.app',
  'https://glow-invoice.onrender.com'
];

// Create CORS middleware function
const corsMiddleware: express.RequestHandler = (req, res, next) => {
  const origin = req.headers.origin || '';
  
  // Check if the origin is in the allowed list
  if (allowedOrigins.some(allowedOrigin => 
    origin === allowedOrigin || 
    origin.startsWith(allowedOrigin.replace(/\/$/, ''))
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
    res.header('Access-Control-Max-Age', '600');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};

// Apply CORS middleware to all routes
app.use(corsMiddleware);

// Other middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
