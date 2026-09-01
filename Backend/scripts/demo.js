/* eslint-disable no-console */
/**
 * Zero-configuration demo: `npm run demo`
 *
 * Starts a throw-away in-memory MongoDB, seeds it and runs the API against it,
 * so the whole system can be reviewed without installing or configuring a
 * database. Data lives only for as long as the process does.
 *
 * For anything persistent, set MONGO_URI in .env and use `npm run seed`
 * followed by `npm start`.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const start = async () => {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    console.error('');
    console.error('  `npm run demo` needs the optional in-memory database package.');
    console.error('  Install it once with:  npm install --save-dev mongodb-memory-server');
    console.error('');
    console.error('  Or point MONGO_URI in Backend/.env at a real MongoDB and use');
    console.error('  `npm run seed` followed by `npm start`.');
    console.error('');
    process.exit(1);
  }

  console.log('\n  starting a temporary in-memory MongoDB...');
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('careease');
  process.env.MONGO_URI = uri;
  process.env.DEMO_MODE = 'true';
  console.log(`  ready: ${uri}\n`);

  console.log('  loading demo data...');
  const seed = spawnSync(process.execPath, [path.join(__dirname, '..', 'seed', 'seed.js'), '--reset'], {
    stdio: 'inherit',
    env: { ...process.env, MONGO_URI: uri }
  });

  if (seed.status !== 0) {
    await mongo.stop();
    process.exit(seed.status || 1);
  }

  const stop = async () => {
    await mongo.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // Requiring the server after MONGO_URI is set makes it connect to the
  // temporary instance.
  await require('../Server').start();
};

start().catch((error) => {
  console.error('  demo failed to start:', error.message);
  process.exit(1);
});
