const express = require('express');
const { errorHandler } = require('./lib/errors');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  res.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/', (req, res) => res.json({ message: 'MP3 API is running.', data: { api: '/api' } }));
require('./routes')(app);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.', data: null }));
app.use(errorHandler);

module.exports = app;
