import express from 'express';
import { voiceAuth, voiceDoctors, voiceAvailability, voiceBook, voiceBookSchema } from '../controllers/voiceController';
import { validate } from '../middleware/validate';

const router = express.Router();

router.use(voiceAuth);

router.get('/doctors', voiceDoctors);
router.get('/availability', voiceAvailability);
router.post('/book', validate(voiceBookSchema), voiceBook);

export default router;
