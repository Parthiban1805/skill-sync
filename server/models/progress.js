const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    ProgramName: { type: String, required: true },
    LevelName: { type: String, required: true },
    LevelNo: { type: Number, required: true },
    level_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram.levels' },
    Date: { type: Date, required: true },
    question: [{
        title: { type: String, required: true },
        description: { type: String, required: true },
        code:{ type: String, required: true },
        testCases: [{
            status: { type: String, enum: ["passed", "not-passed"], required: true }
        }]
    }]
});
module.exports = mongoose.model('Progress', ProgressSchema);
