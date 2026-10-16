require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const app = require('./app');
const User = require('./models/user');
const Task = require('./models/task');

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI in .env or the Render environment.');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  // Build the unique email index before accepting requests, including on a new DB.
  await Promise.all([User.init(), Task.init()]);
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`MP3 API listening on port ${server.address().port}; database connected.`);
  });
  const stop = () => server.close(() => {
    mongoose.disconnect().finally(() => process.exit(0));
  });
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return server;
}

if (require.main === module) {
  start().catch(() => {
    console.error('Server startup failed. Check MONGODB_URI, Atlas credentials, and network access.');
    mongoose.disconnect().finally(() => { process.exitCode = 1; });
  });
}

module.exports = { start };
