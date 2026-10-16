const express = require('express');
const { listResources, selection } = require('../lib/queries');
const { findResource } = require('../lib/validation');
const { ApiError } = require('../lib/errors');

function resourceRoutes(Model, save, remove, defaultLimit) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const data = await listResources(Model, req.query, defaultLimit);
    res.json({ message: 'OK', data });
  });
  router.post('/', async (req, res) => {
    const data = await save(req.body);
    res.status(201).json({ message: `${Model.modelName} created.`, data });
  });
  router.get('/:id', async (req, res) => {
    const resource = await findResource(Model, req.params.id);
    const select = selection(req.query);
    const data = await Model.findById(resource._id).select(select);
    if (!data) throw new ApiError(404, `${Model.modelName} not found.`);
    res.json({ message: 'OK', data });
  });
  router.put('/:id', async (req, res) => {
    const data = await save(req.body, req.params.id);
    res.json({ message: `${Model.modelName} updated.`, data });
  });
  router.delete('/:id', async (req, res) => {
    await remove(req.params.id);
    res.status(204).end();
  });
  return router;
}

module.exports = resourceRoutes;
