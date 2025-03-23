const mongoose = require('mongoose');
const AvailableProgram = require('./ProgrammingLang'); // Import AvailableProgram model

const courseSchema = new mongoose.Schema({
  program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram' }, // Reference AvailableProgram
  ProgramName: { type: String, required: true, unique: true },
  ProgramDescription: { type: String },
  noOfLevels: { type: Number },
  levels: [
    {
      level_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram.levels' }, // Reference levels within AvailableProgram
      levelNo: { type: Number, required: true },
      levelName: { type: String, required: true },
      videos: [
        {
          levelDescription: { type: String, required: true },
          videoLink: { type: String, required: true },
        },
      ],
    },
  ],
});

// Middleware to populate `program_id` and retain videos
courseSchema.pre('validate', async function (next) {
  try {
    if (!this.ProgramName) {
      return next(new Error('ProgramName is required'));
    }

    // Find the program in AvailableProgram
    const program = await AvailableProgram.findOne({ ProgramName: this.ProgramName });

    if (!program) {
      return next(new Error('No program found with this name'));
    }

    this.program_id = program._id; // Store AvailableProgram ObjectId
    this.ProgramDescription = program.ProgramDescription;
    this.noOfLevels = program.noOfLevels;

    // Populate levels while retaining videos
    this.levels = this.levels.map(inputLevel => {
      const programLevel = program.levels.find(pl => pl.levelNo === inputLevel.levelNo);
      if (programLevel) {
        return {
          level_id: programLevel._id,
          levelNo: programLevel.levelNo,
          levelName: programLevel.levelName,
          videos: inputLevel.videos || [], // Retain videos or default to an empty array
        };
      }
      return inputLevel; // Fallback to the original input level if no match found
    });
  } catch (error) {
    console.error('Error in pre-validate middleware:', error);
    next(error);
  }

  next();
});

const Course = mongoose.model('learningmaterial', courseSchema);

module.exports = Course;
