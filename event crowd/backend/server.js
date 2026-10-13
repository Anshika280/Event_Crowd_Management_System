import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Load environmental variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create HTTP server for Express and Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO engine with dynamic CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests from all origins (localhost:5173, localhost:5000, 127.0.0.1, etc.)
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach Socket.IO instance to app context
app.set('io', io);

// Socket.IO Connection & Room Event Listeners
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Real-time client connected: ${socket.id}`);

  socket.on('joinEventRoom', (eventId) => {
    if (eventId) {
      socket.join(eventId.toString());
      console.log(`[Socket.IO] Socket ${socket.id} joined event room: ${eventId}`);
    }
  });

  socket.on('leaveEventRoom', (eventId) => {
    if (eventId) {
      socket.leave(eventId.toString());
      console.log(`[Socket.IO] Socket ${socket.id} left event room: ${eventId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Security & Parsing Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // allow loading dev assets/external fonts & videos
}));
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Serve static client landing page (HTML, CSS, JS, Video) at http://localhost:5000
app.use(express.static(path.join(__dirname, '../client')));

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts
  message: { status: 'error', message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes Mounting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);

// Base route fallback for landing page status
app.get('/api-status', (req, res) => {
  res.send('Event Crowd Management Real-Time API is running...');
});

// Error handling middleware (fallback)
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  Event Crowd Management Real-Time System Active`);
  console.log(`  - Landing Page: http://localhost:5000`);
  console.log(`  - API Endpoint: http://localhost:5000/api`);
  console.log(`===================================================`);
});
