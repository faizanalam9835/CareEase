import mongoose, { type HydratedDocument, type InferSchemaType } from 'mongoose';

// One document per (scope, tenant) pair, e.g. `_id: "patient_TDEMO001"`.
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    default: 0
  }
});

export type ICounter = InferSchemaType<typeof counterSchema>;
export type CounterDoc = HydratedDocument<ICounter>;

export default mongoose.model('Counter', counterSchema);
