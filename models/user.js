const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    default: 'normal'
  }, 
  isVerified: {
    type: Boolean,
    default: false
  },
  problems: [{
    problemId: {
      type: String,
      required: true
    }
  }],
  verificationToken: String,
  resetToken: String
});

module.exports = mongoose.model('User', userSchema);