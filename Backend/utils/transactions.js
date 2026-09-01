const mongoose = require('mongoose');

/**
 * MongoDB only supports multi-document transactions on a replica set or a
 * sharded cluster. A plain `mongod` - which is what most people run locally -
 * accepts `startTransaction()` and then fails on the first write with
 * "Transaction numbers are only allowed on a replica set member or mongos".
 *
 * So we ask the server once what it is, and fall back to unsessioned writes
 * when transactions are unavailable rather than failing the request.
 */
let cachedSupport = null;

const supportsTransactions = async () => {
  if (cachedSupport !== null) return cachedSupport;
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    cachedSupport = Boolean(info.setName || info.msg === 'isdbgrid');
  } catch {
    cachedSupport = false;
  }
  if (!cachedSupport) {
    console.warn(
      '[db] this MongoDB deployment is standalone, so multi-document transactions are unavailable. ' +
        'Operations that would use one still run, just without atomic rollback.'
    );
  }
  return cachedSupport;
};

/**
 * Runs `work(options)` inside a transaction where one is available, otherwise
 * plainly. `options` is `{ session }` or `{}`, ready to pass straight to
 * Mongoose queries and `save()`.
 */
const withTransaction = async (work) => {
  if (!(await supportsTransactions())) {
    return work({});
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await work({ session });
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = { withTransaction, supportsTransactions };
