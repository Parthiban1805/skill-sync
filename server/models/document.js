const mongoose = require('mongoose');
const AvailableProgram = require("./ProgrammingLang"); 



// Image Schema
const imageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    caption: { type: String, default: '' },
});
const Image = mongoose.model('Image', imageSchema);

// Table Schema
const tableSchema = new mongoose.Schema({
    rows: [[{ type: String }]],
});
const Table = mongoose.model('Table', tableSchema);

// Code Schema
const codeSchema = new mongoose.Schema({
    language: { type: String, required: true },
    code: { type: String, required: true },
});
const Code = mongoose.model('Code', codeSchema);

// Subtopic Schema
const subtopicSchema = new mongoose.Schema({
    title: { type: String, required: true },
    paragraphs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paragraph' }],
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Image' }],
    tables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
    code: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Code' }],
});
const Subtopic = mongoose.model('Subtopic', subtopicSchema);

const paragraphSchema = new mongoose.Schema({
  content: { type: String, required: true }
});
const Paragraph = mongoose.model('Paragraph', paragraphSchema);

// Topic Schema
const topicSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtopics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subtopic' }],
});
const Topic = mongoose.model('Topic', topicSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    topics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
});
const Document = mongoose.model('Document', documentSchema);
const LanguageSchema = new mongoose.Schema({
  program_id: { type: mongoose.Schema.Types.ObjectId, ref: "AvailableProgram", required: true }, 
  level_id: { type: mongoose.Schema.Types.ObjectId },
  levelNo: { type: Number, required: true },
  levelName: { type: String }, 
  ProgramName: { type: String, required: true },
  description: { type: String },
  topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],
});

LanguageSchema.pre("save", async function (next) {
  try {
    console.log("Looking for program:", this.ProgramName);
    
    const program = await AvailableProgram.findOne({ ProgramName: this.ProgramName });
    if (!program) {
      console.error("Program not found for ProgramName:", this.ProgramName);
      return next(new Error("Program not found"));
    }

    console.log("Found Program:", program);

    if (!program.levels || !Array.isArray(program.levels)) {
      console.error("Levels not found for program:", program.ProgramName);
      return next(new Error("Levels not found in the program"));
    }

    const level = program.levels.find((lvl) => lvl.levelNo === this.levelNo);
    if (!level) {
      console.error("Level not found for levelNo:", this.levelNo);
      return next(new Error("Level not found"));
    }

    this.program_id = program._id;
    this.level_id = level._id;
    this.levelName = level.levelName;

    console.log("Middleware set program_id:", this.program_id);
    console.log("Middleware set level_id:", this.level_id);
    console.log("Middleware set levelName:", this.levelName);

    next();
  } catch (err) {
    console.error("Error in pre-save middleware:", err);
    next(err);
  }
});

const Language = mongoose.model("Language", LanguageSchema);
const QuizSchema = new mongoose.Schema({
  language: { type: mongoose.Schema.Types.ObjectId, ref: "Language" },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true }
});
const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = { Image, Table, Code, Subtopic, Topic, Document, Language,Paragraph,Quiz};