import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const eventSchema = z.object({
  title: z.string().min(3, 'Event title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: z.string().or(z.date()),
  time: z.string().min(1, 'Time is required'),
  venue: z.string().min(2, 'Venue is required'),
  capacityLimit: z.number().int().positive('Capacity limit must be a positive integer'),
  category: z.string().optional(),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  bannerUrl: z.string().optional(),
});

export const scanSchema = z.object({
  ticketCode: z.string().min(1, 'Ticket code or QR token is required'),
  action: z.enum(['lookup', 'checkin', 'checkout']).optional().default('lookup'),
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Payment signature is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  attendees: z.array(z.object({
    name: z.string().min(1, 'Attendee name is required'),
    email: z.string().email('Valid attendee email is required').optional(),
    phone: z.string().optional(),
  })).min(1, 'At least one attendee is required'),
});
