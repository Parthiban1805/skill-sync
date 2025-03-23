const mongoose = require('mongoose');

const ProgramSchema = new mongoose.Schema({
  ProgramName: { type: String, required: true },
  ProgramDescription: { type: String, required: true },
  noOfLevels: { type: Number, required: true },
  levels: [
    {
      levelNo: { type: Number, required: true },
      levelName: { type: String, required: true },
    },
  ],
});

const  ProgrammingLanguage= mongoose.model('AvailableProgram',ProgramSchema);

module.exports = ProgrammingLanguage;
