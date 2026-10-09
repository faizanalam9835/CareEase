import express, { type ErrorRequestHandler } from 'express';
import { voiceAuth, voiceDoctors, voiceAvailability, voiceBook, voiceBookSchema } from '../controllers/voiceController';
import { validate } from '../middleware/validate';

const router = express.Router();

router.use(voiceAuth);

// GET or POST, params in the query string or a JSON body: whatever the voice tool is set to send.
router.route('/doctors').get(voiceDoctors).post(voiceDoctors);
router.route('/availability').get(voiceAvailability).post(voiceAvailability);
router.post('/book', validate(voiceBookSchema), voiceBook);

// Voice platforms treat any non-2xx as "tool failed" and the bot goes silent.
// Recoverable mistakes (bad input, unknown doctor, slot taken) go back as a
// 200 with an `error` the bot can read and act on; auth and 5xx stay real errors.
const toolErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (![400, 404, 409].includes(err.statusCode)) return next(err);
  res.json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
};
router.use(toolErrors);

export default router;
