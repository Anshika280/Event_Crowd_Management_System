import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Route protection middleware (Logged in users only)
export const protect = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
    return res.status(500).json({ message: 'Server configuration error: JWT secret not defined.' });
  }

  let token;

  // 1. Check HTTP-Only Cookie
  if (req.cookies && req.cookies.jwtToken) {
    token = req.cookies.jwtToken;
  }
  // 2. Check Authorization Header fallback
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    next();
  } catch (error) {
    console.error('Auth verification error:', error.message);
    return res.status(401).json({ message: 'Not authorized, token validation failed' });
  }
};

// Admin access check middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};
