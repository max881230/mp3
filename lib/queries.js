const { ApiError } = require('./errors');

function parse(query, name, fallback) {
  if (query[name] === undefined) return fallback;
  if (typeof query[name] !== 'string') throw new ApiError(400, `${name} must be supplied once as JSON.`);
  try {
    return JSON.parse(query[name]);
  } catch {
    throw new ApiError(400, `${name} must contain valid JSON.`);
  }
}

function objectParameter(query, name) {
  const value = parse(query, name, {});
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, `${name} must be a JSON object.`);
  }
  return value;
}

function selection(query) {
  const select = objectParameter(query, 'select');
  if (Object.entries(select).some(([key, value]) => key.startsWith('$') || ![0, 1].includes(value))) {
    throw new ApiError(400, 'select values must be 1 (include) or 0 (exclude).');
  }
  const modes = new Set(Object.entries(select).filter(([key]) => key !== '_id').map(([, value]) => value));
  if (modes.size > 1) {
    throw new ApiError(400, 'select cannot mix included and excluded fields, except _id.');
  }
  return select;
}

function integerParameter(query, name, fallback) {
  const value = parse(query, name, fallback);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ApiError(400, `${name} must be a non-negative integer.`);
  }
  return value;
}

async function listResources(Model, query, defaultLimit) {
  const where = objectParameter(query, 'where');
  const sort = objectParameter(query, 'sort');
  if (Object.values(sort).some(value => ![1, -1].includes(value))) {
    throw new ApiError(400, 'sort values must be 1 (ascending) or -1 (descending).');
  }
  const select = selection(query);
  const skip = integerParameter(query, 'skip', 0);
  const limit = integerParameter(query, 'limit', defaultLimit);
  const count = parse(query, 'count', false);
  if (typeof count !== 'boolean') throw new ApiError(400, 'count must be true or false.');
  // Count all matching documents, independent of pagination and projection.
  if (count) return Model.countDocuments(where).exec();
  return Model.find(where).sort(sort).select(select).skip(skip).limit(limit).exec();
}

module.exports = { listResources, selection };
