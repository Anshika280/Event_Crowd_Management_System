import express from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { eventSchema } from '../utils/schemas.js';

const router = express.Router();

router.route('/')
  .get(getEvents)
  .post(protect, admin, validate(eventSchema), createEvent);

router.route('/:id')
  .get(getEventById)
  .put(protect, admin, validate(eventSchema), updateEvent)
  .delete(protect, admin, deleteEvent);

export default router;
