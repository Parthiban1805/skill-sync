const mongoose = require("mongoose");
const AvailableProgram = require("./ProgrammingLang"); 

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
// Topic Schema
const TableSchema = new mongoose.Schema({
  headers: [{ type: String, required: true }],
  rows: [[{ type: String, required: true }]],
  caption: { type: String }
});

// Image Schema to handle image content
const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  altText: { type: String, required: true },
  caption: { type: String },
});

// Content Block Schema to handle different types of content
const ContentBlockSchema = new mongoose.Schema({
  contentType: {
    type: String,
    required: true,
    enum: ['text', 'table', 'code', 'image']
  },
  textContent: String,
  tableContent: TableSchema,
  imageContent: ImageSchema,
});

// Modified Topic Schema to include structured content
const TopicSchema = new mongoose.Schema({
  language: { type: mongoose.Schema.Types.ObjectId, ref: "Language" },
  topicName: { type: String},
  SubTopicName: { type: String },

  contentBlocks: [ContentBlockSchema],
  examples: [{ type: mongoose.Schema.Types.ObjectId, ref: "Example" }]
});

// Example Schema
const ExampleSchema = new mongoose.Schema({
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  code: { type: String, required: true },
  output: { type: String },
  error: { type: String }
});

// Quiz Schema
const QuizSchema = new mongoose.Schema({
  language: { type: mongoose.Schema.Types.ObjectId, ref: "Language" },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true }
});

const Language = mongoose.model("Language", LanguageSchema);
const Topic = mongoose.model("Topic", TopicSchema);
const Example = mongoose.model("Example", ExampleSchema);
const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = { Language, Topic, Example, Quiz };
