const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  pendingTasks: { type: [String], default: [] },
  dateCreated: { type: Date, default: Date.now, immutable: true }
}, {
  toJSON: { versionKey: false },
  toObject: { versionKey: false }
});

module.exports = mongoose.model('User', userSchema);
