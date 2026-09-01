const mongoose = require('mongoose');

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

module.exports = mongoose.model('Counter', counterSchema);
