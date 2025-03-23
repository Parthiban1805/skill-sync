const mongoose = require('mongoose');
const AvailableProgram = require('./ProgrammingLang');

const studentSchema = new mongoose.Schema({
  student_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  semester: { type: String, required: true },
  year: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, required: true },
  programRegistered: [
    {
      program_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram' },
      ProgramName: { type: String, required: true },
      levelNo: { type: Number, required: true },
      level_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram.levels' },
      levelName: { type: String, required: true },
      statuslevel: { type: String, default: 'not-completed' }
    }
  ],
  programCompleted: [
    {
      program_id_com: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram' },
      ProgramName: { type: String, required: true },
      levelNo: { type: Number, required: true },
      level_id_com: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram.levels' },
      levelName: { type: String, required: true },
      status: { type: String, required: true }
    }
  ]
});

studentSchema.pre('save', async function (next) {
  const student = this;

  // Populate programRegistered fields
  for (const program of student.programRegistered) {
    if (!program.program_id || !program.level_id) {
      const availableProgram = await AvailableProgram.findOne({ ProgramName: program.ProgramName }).lean();
      if (availableProgram) {
        program.program_id = availableProgram._id;

        const level = availableProgram.levels.find(level => level.levelNo === program.levelNo);
        if (level) {
          program.level_id = level._id;
          program.levelName = level.levelName;
        }
      }
    }
  }

  // Populate programCompleted fields
  for (const program of student.programCompleted) {
    if (!program.program_id_com || !program.level_id_com) {
      const availableProgram = await AvailableProgram.findOne({ ProgramName: program.ProgramName }).lean();
      if (availableProgram) {
        program.program_id_com = availableProgram._id;

        const level = availableProgram.levels.find(level => level.levelNo === program.levelNo);
        if (level) {
          program.level_id_com = level._id;
          program.levelName = level.levelName;
        }
      }
    }
  }

  next();
});

module.exports = mongoose.model('Student', studentSchema);
