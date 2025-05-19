import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import { errorHandler } from './middleware/error';

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173', // Vite default port
  'http://localhost:3000', // Create React App default port
  'https://glow-invoice.vercel.app', // Production frontend
  'https://glow-invoice.onrender.com' // Production backend
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
