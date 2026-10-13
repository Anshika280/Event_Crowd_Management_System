import express from 'express';
import {
  registerForEvent,
  getMyRegistrations,
  getEventRegistrations,
  scanTicket,
  createRazorpayOrder,
  verifyRazorpayPayment,
  registerFree,
} from '../controllers/registrationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { scanSchema, paymentVerifySchema } from '../utils/schemas.js';

const router = express.Router();

// User Registration Routes
router.post('/register/:eventId', protect, registerForEvent);
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify-payment', protect, validate(paymentVerifySchema), verifyRazorpayPayment);
router.post('/register-free', protect, registerFree);
router.get('/my-registrations', protect, getMyRegistrations);

// Admin Crowd Control & Gate Scanner Routes
router.get('/event/:eventId', protect, admin, getEventRegistrations);
router.post('/scan', protect, admin, validate(scanSchema), scanTicket);

// Clean RESTful Aliases
router.post('/check-in', protect, admin, validate(scanSchema), scanTicket);
router.post('/check-out', protect, admin, validate(scanSchema), scanTicket);

export default router;
