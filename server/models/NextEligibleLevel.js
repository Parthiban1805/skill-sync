const mongoose = require('mongoose');

const nextEligibleLevelSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  eligibleLevels: [
    {
      program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram', required: true },
      ProgramName: { type: String, required: true },
      currentLevelNo: { type: Number, required: true },
      currentLevelName: { type: String, required: true },
      nextLevelNo: { type: Number },
      nextLevelName: { type: String },
    }
  ],
  updatedAt: { type: Date, default: Date.now },
});

const NextEligibleLevel = mongoose.model('NextEligibleLevel', nextEligibleLevelSchema);
module.exports = NextEligibleLevel;
