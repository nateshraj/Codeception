const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  testCases: {
    type: [{
      input: {},
      output: {}
    }],
    // required: true
  },
  difficulty: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Problem', problemSchema);