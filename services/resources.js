const mongoose = require('mongoose');
const User = require('../models/user');
const Task = require('../models/task');
const { ApiError } = require('../lib/errors');
const { userFields, taskFields, findResource } = require('../lib/validation');

// Every write and its reference updates commit together or are all rolled back.
const transaction = work => mongoose.connection.transaction(work, {
  readPreference: 'primary', readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }
});

async function saveUser(body, id) {
  return transaction(async session => {
    // URL resource errors take precedence over errors in the body.
    const user = id === undefined ? new User() : await findResource(User, id, session);
    const fields = userFields(body);
    const duplicate = await User.exists({ email: fields.email, _id: { $ne: user._id } }).session(session);
    if (duplicate) throw new ApiError(400, 'This email is already used by another user.');
    const tasks = await Task.find({ _id: { $in: fields.pendingTasks } }).session(session);
    if (tasks.length !== fields.pendingTasks.length) {
      throw new ApiError(404, 'One or more tasks in pendingTasks do not exist.');
    }
    if (tasks.some(task => task.completed)) {
      throw new ApiError(400, 'Completed tasks cannot be included in pendingTasks.');
    }

    const userId = user._id.toString();
    const removed = user.pendingTasks.filter(taskId => !fields.pendingTasks.includes(taskId));
    user.set(fields);
    await user.save({ session });
    if (removed.length) {
      await Task.updateMany({ _id: { $in: removed }, assignedUser: userId }, {
        $set: { assignedUser: '', assignedUserName: 'unassigned' }, $inc: { __v: 1 }
      }, { session });
    }
    if (fields.pendingTasks.length) {
      await User.updateMany({ _id: { $ne: user._id }, pendingTasks: { $in: fields.pendingTasks } }, {
        $pull: { pendingTasks: { $in: fields.pendingTasks } }, $inc: { __v: 1 }
      }, { session });
      await Task.updateMany({ _id: { $in: fields.pendingTasks } }, {
        $set: { assignedUser: userId, assignedUserName: fields.name }, $inc: { __v: 1 }
      }, { session });
    }
    // Completed tasks stay assigned and must reflect name changes too.
    await Task.updateMany({ assignedUser: userId }, {
      $set: { assignedUserName: fields.name }, $inc: { __v: 1 }
    }, { session });
    return user.toObject();
  });
}

async function saveTask(body, id) {
  return transaction(async session => {
    const task = id === undefined ? new Task() : await findResource(Task, id, session);
    const fields = taskFields(body);
    let user = null;
    if (fields.assignedUser) {
      user = await User.findById(fields.assignedUser).session(session);
      if (!user) throw new ApiError(404, 'The assigned user does not exist.');
      if (fields.assignedUserName !== undefined && fields.assignedUserName !== user.name) {
        throw new ApiError(400, 'assignedUserName does not match the assigned user.');
      }
    }
    fields.assignedUserName = user ? user.name : 'unassigned';
    const taskId = task._id.toString();
    const previousUser = task.assignedUser;
    task.set(fields);
    await task.save({ session });
    if (previousUser && previousUser !== fields.assignedUser) {
      await User.updateOne({ _id: previousUser }, {
        $pull: { pendingTasks: taskId }, $inc: { __v: 1 }
      }, { session });
    }
    if (user) {
      const membership = task.completed ? { $pull: { pendingTasks: taskId } } :
        { $addToSet: { pendingTasks: taskId } };
      // Force a write even if membership is unchanged, so a concurrent rename
      // or deletion conflicts and retries instead of leaving stale references.
      await User.updateOne({ _id: user._id }, { ...membership, $inc: { __v: 1 } }, { session });
    }
    return task.toObject();
  });
}

async function deleteUser(id) {
  return transaction(async session => {
    const user = await findResource(User, id, session);
    await Task.updateMany({ assignedUser: user._id.toString() }, {
      $set: { assignedUser: '', assignedUserName: 'unassigned' }, $inc: { __v: 1 }
    }, { session });
    await user.deleteOne({ session });
  });
}

async function deleteTask(id) {
  return transaction(async session => {
    const task = await findResource(Task, id, session);
    if (task.assignedUser) {
      await User.updateOne({ _id: task.assignedUser }, {
        $pull: { pendingTasks: task._id.toString() }, $inc: { __v: 1 }
      }, { session });
    }
    await task.deleteOne({ session });
  });
}

module.exports = { saveUser, saveTask, deleteUser, deleteTask };
