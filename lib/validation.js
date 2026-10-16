const { ApiError } = require('./errors');

const isId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'The request body must be an object.');
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${field} must be a non-empty string.`);
  }
  return value.trim();
}

function userFields(body) {
  requireBody(body);
  const name = requiredString(body.name, 'name');
  const email = requiredString(body.email, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'email must be a valid email address.');
  }
  const pendingTasks = body.pendingTasks === undefined ? [] : body.pendingTasks;
  if (!Array.isArray(pendingTasks) || !pendingTasks.every(isId)) {
    throw new ApiError(400, 'pendingTasks must be a list of valid task IDs.');
  }
  return { name, email, pendingTasks: [...new Set(pendingTasks.map(id => id.toLowerCase()))] };
}

function taskFields(body) {
  requireBody(body);
  const name = requiredString(body.name, 'name');
  if (!['string', 'number'].includes(typeof body.deadline) ||
      (typeof body.deadline === 'string' && !body.deadline.trim()) ||
      !Number.isFinite(new Date(body.deadline).getTime())) {
    throw new ApiError(400, 'deadline must be a valid date.');
  }
  const description = body.description === undefined ? '' : body.description;
  const completed = body.completed === undefined ? false : body.completed;
  const assignedUser = body.assignedUser === undefined ? '' : body.assignedUser;
  if (typeof description !== 'string') throw new ApiError(400, 'description must be a string.');
  if (typeof completed !== 'boolean') throw new ApiError(400, 'completed must be a boolean.');
  if (assignedUser !== '' && !isId(assignedUser)) {
    throw new ApiError(400, 'assignedUser must be a valid user ID or an empty string.');
  }
  if (body.assignedUserName !== undefined && typeof body.assignedUserName !== 'string') {
    throw new ApiError(400, 'assignedUserName must be a string.');
  }
  if (assignedUser === '' && body.assignedUserName !== undefined && body.assignedUserName !== 'unassigned') {
    throw new ApiError(400, 'An unassigned task must use assignedUserName "unassigned".');
  }
  return {
    name, description, deadline: new Date(body.deadline), completed,
    assignedUser: assignedUser.toLowerCase(), assignedUserName: body.assignedUserName
  };
}

async function findResource(Model, id, session) {
  const message = `${Model.modelName} not found.`;
  if (!isId(id)) throw new ApiError(404, message);
  const resource = await Model.findById(id).session(session || null);
  if (!resource) throw new ApiError(404, message);
  return resource;
}

module.exports = { isId, userFields, taskFields, findResource };
