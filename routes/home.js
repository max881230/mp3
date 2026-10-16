module.exports = function (router) {
  router.get('/', (req, res) => {
    res.json({ message: 'MP3 API is running.', data: { users: '/api/users', tasks: '/api/tasks' } });
  });
  return router;
};
