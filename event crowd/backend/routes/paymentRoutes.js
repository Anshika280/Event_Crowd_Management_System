import express from 'express';
import crypto from 'crypto';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import { verifyRazorpayPayment } from '../controllers/registrationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { paymentVerifySchema } from '../utils/schemas.js';

const router = express.Router();

// Clean REST route: POST /api/payments/verify
router.post('/verify', protect, validate(paymentVerifySchema), verifyRazorpayPayment);

// Razorpay Webhook Endpoint: POST /api/payments/webhook
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!webhookSecret) {
      return res.status(500).json({ status: 'error', message: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ status: 'error', message: 'Missing Razorpay signature header' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ status: 'error', message: 'Invalid Razorpay webhook signature' });
    }

    const eventPayload = req.body.event;
    if (eventPayload === 'payment.captured') {
      const paymentEntity = req.body.payload.payment.entity;
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;

      // Update existing pending registrations to confirmed
      const updatedRegs = await Registration.updateMany(
        { $or: [{ paymentId }, { orderId }] },
        { $set: { status: 'confirmed' } }
      );

      console.log(`[Razorpay Webhook] Successfully verified payment ${paymentId}. Updated ${updatedRegs.modifiedCount} records.`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Razorpay Webhook Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
