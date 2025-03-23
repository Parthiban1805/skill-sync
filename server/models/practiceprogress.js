const mongoose = require('mongoose');

const PracticeProgressSchema = new mongoose.Schema({
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
    }],
    status:{type:String,enum:["completed","not-completed"]}
});
module.exports = mongoose.model('practiceProgress',  PracticeProgressSchema);
