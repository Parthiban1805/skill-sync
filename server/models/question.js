const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    ProgramName : { type: String, required: true },
    LevelName : { type: String, required: true },
    LevelNo : { type: Number, required: true },
    level_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailableProgram.levels' }, // Reference levels within AvailableProgram
    title: { type: String, required: true },
    description: { type: String, required: true },
    inputFormat: { type: String, required: true },
    outputFormat: { type: String, required: true },
    constraints: { type: String, required: true },
  
    testCases: [
        {
        input: { type: String, required: true },
        output: { type: String, required: true },
        },
    ],
});

module.exports = mongoose.model("Question", questionSchema);
