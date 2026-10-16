const express = require('express');
const User = require('../models/user');
const Task = require('../models/task');
const resourceRoutes = require('./resources');
const { saveUser, saveTask, deleteUser, deleteTask } = require('../services/resources');

module.exports = function (app) {
  const router = express.Router();
  router.use('/users', resourceRoutes(User, saveUser, deleteUser, 0));
  router.use('/tasks', resourceRoutes(Task, saveTask, deleteTask, 100));
  require('./home')(router);
  app.use('/api', router);
};
