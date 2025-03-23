const mongoose = require('mongoose');

const practiceMarkSchema = new mongoose.Schema({
    student_id: { type: String, required: true },
    question: { type: String, required: true },
    user_answer: { type: String, required: true },
    correct_answer: { type: String, required: true },
    mark: { type: Number, required: true },
    level_id: { type: String },
    program_id: { type: String }
});

const PracticeMark = mongoose.model("PracticeScore", practiceMarkSchema);
module.exports = PracticeMark;
