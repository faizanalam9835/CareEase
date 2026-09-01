const Counter = require('../models/Counter');

/**
 * Atomically produces the next human-readable business id for a tenant,
 * e.g. nextId('patient', 'TDEMO001', 'P') -> "TDEMO001-P-0007".
 *
 * The previous implementation used countDocuments(), which produced duplicate
 * ids as soon as two records were created concurrently or a record was deleted.
 * findOneAndUpdate($inc) is atomic, so the sequence never repeats.
 */
const nextId = async (scope, tenantId, prefix, pad = 4) => {
  const counter = await Counter.findByIdAndUpdate(
    `${scope}_${tenantId}`,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `${tenantId}-${prefix}-${String(counter.sequence_value).padStart(pad, '0')}`;
};

/** Rewinds/primes a counter - used by the seeder so ids stay tidy on re-seed. */
const setSequence = async (scope, tenantId, value) => {
  await Counter.findByIdAndUpdate(
    `${scope}_${tenantId}`,
    { $set: { sequence_value: value } },
    { upsert: true }
  );
};

module.exports = { nextId, setSequence };
