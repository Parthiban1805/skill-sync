const mongoose = require("mongoose");
const { Language, Topic, Example, Quiz } = require('../models/studymaterial'); // Ensure correct path
const AvailableProgram = require("../models/ProgrammingLang"); // Ensure correct path

mongoose.connect("mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Connection Error:", err));
const insertData = async () => {
    try {
      const availableProgram = await AvailableProgram.findOne({ ProgramName: "C" });
      if (!availableProgram) {
        console.error("AvailableProgram not found for C Programming");
        return;
      }
  
      console.log("Found AvailableProgram:", availableProgram);
  
      const language = new Language({
        program_id: availableProgram._id, 
        levelNo: 1,
        ProgramName: "C",
        description: "Learn the basics of C programming.",
        logoUrl: "https://example.com/logo.png",
        topics: []
      });
  
      await language.save();
      console.log("Language Inserted", language);
  
      // Insert Topic
    // 2. Create a topic with various content types
    const topicData = {
      language: language._id,
      topicName: "Variables and Data Types",
      contentBlocks: [
        {
          contentType: 'text',  // ✅ Correct key
          textContent: 'Variables are containers for storing data values...'
        },
        {
          contentType: 'table',
          tableContent: {
            headers: ['Data Type', 'Example', 'Description'],
            rows: [
              ['Number', '42, 3.14', 'Numeric values'],
              ['String', '"Hello"', 'Text values'],
              ['Boolean', 'true/false', 'Logical values']
            ],
            caption: 'JavaScript Data Types Overview'
          }
        },
        {
          contentType: 'code',
          code: `#include <stdio.h>\nint main() {\n   int num = 42;\n   printf("%d", num);\n   return 0;\n}`,
        },
        {
          contentType: 'image',
          imageContent: {
            url: '/images/variables-memory.png',
            altText: 'Visual representation of variables in memory',
            caption: 'How variables are stored in memory'
          }
        }
      ]
      
    };
  
    const topic = await Topic.create(topicData);
    console.log("Topic created:", topic);
  
      // **Update Language Document to Include Topic**
      await Language.findByIdAndUpdate(
        language._id,
        { $push: { topics: topic._id } },
        { new: true }
      );
  
      console.log("Updated Language with Topics");
  
      // Insert Example
      const example = new Example({
        topic: topic._id,
        code: `#include <stdio.h>\nint main() {\n   int num = 10;\n   printf("%d", num);\n   return 0;\n}`,
        output: "10",
      });
      await example.save();
      console.log("Example Inserted", example);
  
      // **Update Topic Document to Include Example**
      await Topic.updateOne(
        { _id: topic._id },
        { $push: { examples: example._id } }
      );
      
      const topicWithExamples = await Topic.findById(topic._id).populate("examples");
      console.log("Final Topic Data After Update:", topicWithExamples);
        
      // Insert Quiz
      const quiz = new Quiz({
        language: language._id,
        topic: topic._id,
        question: "Which data type is used to store whole numbers in C?",
        options: ["int", "float", "char", "double"],
        answer: "int",
      });
      await quiz.save();
      console.log("Quiz Inserted", quiz);
  
      mongoose.connection.close();
    } catch (error) {
      console.error("Error inserting data:", error);
      mongoose.connection.close();
    }
  };
  
  
  

insertData();