export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed; // replace with parsed & sanitized data
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors)) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return res.status(400).json({ status: 'error', message: `Validation Error: ${messages}` });
    }
    return res.status(400).json({ status: 'error', message: error.message || 'Invalid input payload' });
  }
};
