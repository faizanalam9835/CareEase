import mongoose from 'mongoose';

/**
 * English copy of a finished call's transcript, so a call is translated once
 * rather than every time someone opens it. The original text is kept alongside.
 */
const callTranscriptSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    interactionId: { type: String, required: true },
    messages: [{ _id: false, role: String, text: String, original: String }]
  },
  { timestamps: true }
);

callTranscriptSchema.index({ tenantId: 1, interactionId: 1 }, { unique: true });

export default mongoose.model('CallTranscript', callTranscriptSchema);
