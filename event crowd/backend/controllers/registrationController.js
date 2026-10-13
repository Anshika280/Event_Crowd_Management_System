import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Helper to generate a clean, short, unique ticket code (e.g. EC-TEC-K9A7)
const generateUniqueTicketCode = async (event, RegistrationModel) => {
  const cleanTitle = (event.title || 'EVT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const eventCode = (cleanTitle.substring(0, 3) || 'EVT').padEnd(3, 'X');

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const getSecureRandomString = (length) => {
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
  };

  let ticketCode;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomPart = getSecureRandomString(4);
    ticketCode = `EC-${eventCode}-${randomPart}`;

    const existing = await RegistrationModel.findOne({ ticketCode });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    ticketCode = `EC-${eventCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  return ticketCode;
};

// Helper to generate cryptographically signed JWT passport token for gate verification
const generateSignedTicketToken = (ticketId, ticketCode, eventId) => {
  if (!process.env.JWT_SECRET) return null;
  return jwt.sign(
    {
      ticketId,
      ticketCode,
      eventId,
      type: 'EVENT_TICKET',
    },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );
};

// @desc    Register logged in user for an event
// @route   POST /api/registrations/register/:eventId
// @access  Private
export const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      user: req.user._id,
      event: eventId,
    });

    if (existingRegistration) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // Atomic capacity check and reservation increment
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: {
          $lte: [{ $add: [{ $ifNull: ['$reservedCount', 0] }, 1] }, '$capacityLimit'],
        },
      },
      { $inc: { reservedCount: 1, confirmedCount: 1 } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Registration closed. Event capacity limit reached!' });
    }

    const ticketCode = await generateUniqueTicketCode(event, Registration);

    const registration = new Registration({
      user: req.user._id,
      event: eventId,
      ticketCode,
    });

    registration.ticketToken = generateSignedTicketToken(registration._id, ticketCode, eventId);
    await registration.save();

    res.status(201).json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user's registrations
// @route   GET /api/registrations/my-registrations
// @access  Private
export const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate('event')
      .sort({ createdAt: -1 });

    // Backfill signed ticket tokens for existing tickets if missing
    for (const reg of registrations) {
      if (!reg.ticketToken && reg.event) {
        reg.ticketToken = generateSignedTicketToken(reg._id, reg.ticketCode, reg.event._id);
        await reg.save();
      }
    }

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all registrations for a specific event
// @route   GET /api/registrations/event/:eventId
// @access  Private/Admin
export const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.createdBy && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: You did not create this event.' });
    }

    const registrations = await Registration.find({ event: req.params.eventId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Scan a QR ticket (or signed JWT passport) and lookup/check-in/check-out attendee
// @route   POST /api/registrations/scan
// @access  Private/Admin
export const scanTicket = async (req, res) => {
  try {
    const { ticketCode, action = 'lookup' } = req.body;

    if (!ticketCode) {
      return res.status(400).json({ status: 'error', message: 'No ticket code or QR payload provided' });
    }

    // Security Check: Verify if input is a signed JWT ticket token
    let query = { ticketCode };
    if (typeof ticketCode === 'string' && ticketCode.split('.').length === 3) {
      try {
        const decoded = jwt.verify(ticketCode, process.env.JWT_SECRET);
        if (decoded && decoded.ticketCode) {
          query = { $or: [{ _id: decoded.ticketId }, { ticketCode: decoded.ticketCode }] };
        }
      } catch (err) {
        return res.status(400).json({ status: 'invalid', message: 'Invalid or tampered ticket QR signature!' });
      }
    }

    // Find registration and populate user and event
    const registration = await Registration.findOne(query)
      .populate('user', 'name email')
      .populate('event');

    if (!registration) {
      return res.status(404).json({ status: 'invalid', message: 'Ticket does not exist in database' });
    }

    const event = registration.event;

    if (event.createdBy && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Access denied: This ticket belongs to an event created by another Admin.' });
    }

    const attendeeName = registration.attendeeName || registration.user?.name || 'Attendee';
    const activeCount = event.checkedInCount ?? event.currentCount ?? 0;

    if (action === 'lookup') {
      return res.json({
        status: 'valid',
        message: registration.checkedIn ? 'Attendee is currently Checked In.' : 'Attendee is currently Checked Out.',
        checkedIn: registration.checkedIn,
        checkInTime: registration.checkInTime,
        attendee: attendeeName,
        eventTitle: event.title,
        currentCount: activeCount,
        capacityLimit: event.capacityLimit,
        ticketCode: registration.ticketCode,
      });
    }

    if (action === 'checkin') {
      if (registration.checkedIn) {
        return res.status(400).json({
          status: 'already_scanned',
          message: 'Attendee is already checked in!',
          attendee: attendeeName,
          checkInTime: registration.checkInTime,
          eventTitle: event.title,
        });
      }

      // Atomic Check-in Race-Condition Fix:
      // Increment event checkedInCount ONLY if current checkedInCount < capacityLimit
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: event._id,
          $expr: {
            $lt: [{ $ifNull: ['$checkedInCount', '$currentCount'] }, '$capacityLimit'],
          },
        },
        { $inc: { checkedInCount: 1, currentCount: 1 } },
        { new: true }
      );

      if (!updatedEvent) {
        return res.status(400).json({
          status: 'capacity_reached',
          message: 'Capacity full! Gate entry restricted.',
          eventTitle: event.title,
          capacityLimit: event.capacityLimit,
          currentCount: activeCount,
        });
      }

      // Perform check-in on registration record
      registration.checkedIn = true;
      registration.checkInTime = new Date();
      await registration.save();

      const newCount = updatedEvent.checkedInCount ?? updatedEvent.currentCount;

      // Socket.IO Real-Time Broadcast
      const io = req.app.get('io');
      if (io) {
        io.to(event._id.toString()).emit('attendanceUpdated', {
          eventId: event._id.toString(),
          currentCount: newCount,
          capacityLimit: event.capacityLimit,
          registration: {
            _id: registration._id,
            ticketCode: registration.ticketCode,
            checkedIn: true,
            checkInTime: registration.checkInTime,
            user: registration.user ? {
              _id: registration.user._id,
              name: registration.user.name || registration.attendeeName || 'Attendee',
              email: registration.user.email || registration.attendeeEmail || '',
            } : {
              name: registration.attendeeName || 'Attendee',
              email: registration.attendeeEmail || '',
            },
          },
        });
      }

      return res.json({
        status: 'success',
        message: 'Access Allowed! Welcome to the event.',
        checkedIn: true,
        attendee: attendeeName,
        eventTitle: event.title,
        currentCount: newCount,
        capacityLimit: event.capacityLimit,
        ticketCode: registration.ticketCode,
      });
    }

    if (action === 'checkout') {
      if (!registration.checkedIn) {
        return res.status(400).json({
          status: 'error',
          message: 'Attendee is not checked in yet!',
          attendee: attendeeName,
          eventTitle: event.title,
        });
      }

      // Atomic Check-out decrement
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: event._id,
          $expr: {
            $gt: [{ $ifNull: ['$checkedInCount', '$currentCount'] }, 0],
          },
        },
        { $inc: { checkedInCount: -1, currentCount: -1 } },
        { new: true }
      );

      registration.checkedIn = false;
      await registration.save();

      const newCount = updatedEvent ? (updatedEvent.checkedInCount ?? updatedEvent.currentCount) : 0;

      // Socket.IO Real-Time Broadcast
      const io = req.app.get('io');
      if (io) {
        io.to(event._id.toString()).emit('attendanceUpdated', {
          eventId: event._id.toString(),
          currentCount: newCount,
          capacityLimit: event.capacityLimit,
          registration: {
            _id: registration._id,
            ticketCode: registration.ticketCode,
            checkedIn: false,
            user: registration.user ? {
              _id: registration.user._id,
              name: registration.user.name || registration.attendeeName || 'Attendee',
              email: registration.user.email || registration.attendeeEmail || '',
            } : {
              name: registration.attendeeName || 'Attendee',
              email: registration.attendeeEmail || '',
            },
          },
        });
      }

      return res.json({
        status: 'success',
        message: 'Check-out successful. Goodbye!',
        checkedIn: false,
        attendee: attendeeName,
        eventTitle: event.title,
        currentCount: newCount,
        capacityLimit: event.capacityLimit,
        ticketCode: registration.ticketCode,
      });
    }

    return res.status(400).json({ status: 'error', message: 'Invalid scan action specified.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Create Razorpay Order (with atomic capacity reservation check)
// @route   POST /api/registrations/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  try {
    const { eventId, numberOfTickets } = req.body;

    if (!eventId || !numberOfTickets || numberOfTickets < 1) {
      return res.status(400).json({ message: 'Invalid event or number of tickets' });
    }

    // Atomic reservation check
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: {
          $lte: [{ $add: [{ $ifNull: ['$reservedCount', 0] }, numberOfTickets] }, '$capacityLimit'],
        },
      },
      { $inc: { reservedCount: numberOfTickets } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Capacity limit reached! Overbooking prevented.' });
    }

    const price = updatedEvent.price || 0;
    const totalAmount = price * numberOfTickets;

    if (totalAmount === 0) {
      return res.json({
        isFree: true,
        amount: 0,
        currency: 'INR',
        eventId,
      });
    }

    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!rzpKeyId || !rzpKeySecret) {
      return res.status(500).json({ message: 'Razorpay keys are not configured on the server.' });
    }

    const rzpInstance = new Razorpay({
      key_id: rzpKeyId,
      key_secret: rzpKeySecret,
    });

    const options = {
      amount: totalAmount * 100,
      currency: 'INR',
      receipt: `receipt_ev_${eventId.substring(eventId.length - 6)}_${Date.now()}`,
    };

    const order = await rzpInstance.orders.create(options);

    res.json({
      isFree: false,
      isMock: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: rzpKeyId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Razorpay Payment and finalize booking (Idempotent)
// @route   POST /api/registrations/verify-payment
// @access  Private
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId, attendees } = req.body;

    if (!eventId || !attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: 'Missing event ID or attendee details' });
    }

    // Payment Idempotency Check: Prevent duplicate processing if payment already verified
    if (razorpay_payment_id && razorpay_payment_id !== 'FREE' && !razorpay_payment_id.startsWith('mock_')) {
      const existingRegistrations = await Registration.find({ paymentId: razorpay_payment_id });
      if (existingRegistrations.length > 0) {
        return res.status(200).json(existingRegistrations);
      }
    }

    // Signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const rzpKeyId = process.env.RAZORPAY_KEY_ID;

    if (!rzpKeyId || !secret) {
      return res.status(500).json({ message: 'Razorpay keys are not configured on the server.' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isVerified = expectedSignature === razorpay_signature;

    if (!isVerified) {
      return res.status(400).json({ message: 'Payment signature verification failed!' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Create individual registrations with signed ticket tokens
    const registrations = [];
    for (const attendee of attendees) {
      const ticketCode = await generateUniqueTicketCode(event, Registration);

      const reg = new Registration({
        user: req.user._id,
        event: eventId,
        ticketCode,
        attendeeName: attendee.name,
        attendeeEmail: attendee.email,
        attendeePhone: attendee.phone,
        paymentId: razorpay_payment_id || 'mock_payment_id',
        orderId: razorpay_order_id || 'mock_order_id',
        status: 'confirmed',
      });

      reg.ticketToken = generateSignedTicketToken(reg._id, ticketCode, eventId);
      await reg.save();
      registrations.push(reg);
    }

    // Increment confirmed ticket count
    await Event.updateOne({ _id: eventId }, { $inc: { confirmedCount: attendees.length } });

    res.status(201).json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register for free event (with atomic capacity check)
// @route   POST /api/registrations/register-free
// @access  Private
export const registerFree = async (req, res) => {
  try {
    const { eventId, attendees } = req.body;

    if (!eventId || !attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: 'Missing event ID or attendee details' });
    }

    // Atomic capacity check and reservation
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: {
          $lte: [{ $add: [{ $ifNull: ['$reservedCount', 0] }, attendees.length] }, '$capacityLimit'],
        },
      },
      { $inc: { reservedCount: attendees.length, confirmedCount: attendees.length } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ message: 'Event capacity full!' });
    }

    const registrations = [];
    for (const attendee of attendees) {
      const ticketCode = await generateUniqueTicketCode(updatedEvent, Registration);

      const reg = new Registration({
        user: req.user._id,
        event: eventId,
        ticketCode,
        attendeeName: attendee.name,
        attendeeEmail: attendee.email,
        attendeePhone: attendee.phone,
        paymentId: `FREE_PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        orderId: `FREE_ORD_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'confirmed',
      });

      reg.ticketToken = generateSignedTicketToken(reg._id, ticketCode, eventId);
      await reg.save();
      registrations.push(reg);
    }

    res.status(201).json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
