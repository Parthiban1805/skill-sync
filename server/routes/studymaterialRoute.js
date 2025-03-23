const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/Student");
const ProgrammingLanguage = require('../models/ProgrammingLang'); // Import the model
const { Document, Topic, Subtopic, Image, Table, Code,Language,Paragraph ,Quiz} = require('../models/document');

const path = require('path');
const fs = require('fs');

const multer = require('multer');



  
  
  // Helper functions remain the same
  const parseTopicInfo = (text) => {
    const topicMatch = text.match(/^== Topic: (.*?) ==/m);
    const subtopicMatch = text.match(/^=== Subtopic: (.*?) ===/m);
  
    if (!topicMatch || !subtopicMatch) {
      throw new Error("Topic or Subtopic information is missing");
    }
  
    return {
      topicName: topicMatch[1].trim(),
      SubTopicName: subtopicMatch[1].trim()
    };
  };
  
  const parseContent = (text) => {
    const contentBlocks = [];
    let currentPosition = 0;
    const textLength = text.length;
  
    while (currentPosition < textLength) {
      const matches = {
        code: text.slice(currentPosition).match(/## The Code start from\n([\s\S]*?)## The Code end/),
        text: text.slice(currentPosition).match(/\*\*! The text start\*\*([\s\S]*?)\*\*! The text end\*\*/),
        table: text.slice(currentPosition).match(/\|\| Table Start \|\|\n([\s\S]*?)\|\| Table End \|\|/),
        image: text.slice(currentPosition).match(/\[\[ Image Start \]\]\n([\s\S]*?)\[\[ Image End \]\]/)
      };
  
      let firstMatch = null;
      let matchType = null;
      let matchIndex = Infinity;
  
      for (const [type, match] of Object.entries(matches)) {
        if (match && match.index < matchIndex) {
          firstMatch = match;
          matchType = type;
          matchIndex = match.index;
        }
      }
  
      if (firstMatch) {
        switch (matchType) {
          case 'code':
            contentBlocks.push({
              contentType: 'code',
              textContent: firstMatch[1].trim()
            });
            break;
  
          case 'text': {
            const content = firstMatch[1].trim();
            const headerMatch = content.match(/\*\*([^*]+?)\*\*:([\s\S]*)/);
            
            if (headerMatch) {
              const [, header, description] = headerMatch;
              contentBlocks.push({
                contentType: 'text',
                textContent: `${header.trim()}:\n${description.trim()}`
              });
            } else {
              contentBlocks.push({
                contentType: 'text',
                textContent: content
              });
            }
            break;
          }
  
          case 'table': {
            const tableContent = firstMatch[1].trim();
            const rows = tableContent.split('\n').map(row => 
              row.split('|').map(cell => cell.trim()).filter(Boolean)
            );
            
            contentBlocks.push({
              contentType: 'table',
              tableContent: {
                headers: rows[0],
                rows: rows.slice(1),
                caption: 'Table'
              }
            });
            break;
          }
  
          case 'image': {
            const [url, altText, caption] = firstMatch[1]
              .trim()
              .split('\n')
              .map(line => line.trim());
            
            contentBlocks.push({
              contentType: 'image',
              imageContent: {
                url,
                altText,
                caption
              }
            });
            break;
          }
        }
  
        currentPosition += firstMatch.index + firstMatch[0].length;
      } else {
        currentPosition++;
      }
    }
  
    return contentBlocks;
  };
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  // Configure multer upload
  const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
      // Accept text files and any file with no mimetype (for testing)
      if (!file.mimetype || file.mimetype === 'text/plain') {
        cb(null, true);
      } else {
        cb(new Error('Only text files are allowed'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });
  
  /**
   * Parse text file and store data in MongoDB according to schema
   */
  async function parseAndStoreContent(filePath, formData) {
    try {
      // Read file content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const program = await ProgrammingLanguage.findOne({ ProgramName: formData.ProgramName });

      console.log("✅ File content loaded, length:", fileContent.length);
      
      // Create Language document
      const language = new Language({
        program_id: program._id, // ✅ Assign program_id from the found program

        levelNo: parseInt(formData.levelNo),
        levelName: formData.levelName,
        ProgramName: formData.ProgramName,
        description: formData.description,
        topics: []
      });
      
      // Save the language document to get its ID
      await language.save();
      console.log("✅ Language Document Created:", language);
      
      // Split content by topics
      const topicSections = fileContent.split(/== Topic: /);
      
      // Skip the first element if it's empty (before the first topic marker)
      if (!topicSections[0].trim()) {
        topicSections.shift();
      } else {
        // If there's content before the first topic marker, prepend "== Topic: " to the first section
        topicSections[0] = "== Topic: " + topicSections[0];
      }
      
      // Process each topic section
      for (const section of topicSections) {
        if (!section.trim()) continue;
        
        // Extract topic name
        let topicName;
        if (section.startsWith("== Topic: ")) {
          const topicNameMatch = section.match(/== Topic: (.*?) ==/);
          if (topicNameMatch) {
            topicName = topicNameMatch[1].trim();
          } else {
            const lines = section.split('\n');
            topicName = lines[0].replace("== Topic: ", "").trim();
          }
        } else {
          const topicNameEndIndex = section.indexOf('\n');
          topicName = section.substring(0, topicNameEndIndex).trim();
        }
        
        console.log("📌 Found Topic:", topicName);
        
        // Split by subtopics
        const subtopicSections = section.split(/=== Subtopic: /);
        
        // Skip first element if it's just the topic header
        let startIndex = 0;
        if (!subtopicSections[0].includes("Subtopic:")) {
          startIndex = 1;
        }
        
        // Process each subtopic
        for (let i = startIndex; i < subtopicSections.length; i++) {
          const subtopicSection = subtopicSections[i];
          if (!subtopicSection.trim()) continue;
          
          // Extract subtopic name
          let subtopicName;
          const subtopicNameEndIndex = subtopicSection.indexOf('\n');
          if (subtopicNameEndIndex !== -1) {
            subtopicName = subtopicSection.substring(0, subtopicNameEndIndex).replace("===", "").trim();
          } else {
            subtopicName = subtopicSection.trim();
          }
          
          console.log("🔹 Found Subtopic:", subtopicName);
          
          // Create Topic document
          const topic = new Topic({
            language: language._id,
            topicName: topicName,
            SubTopicName: subtopicName,
            contentBlocks: [],
            examples: []
          });
          
          console.log("📝 Creating Topic Document:", topic);
          
          // Extract code blocks
          const codeRegex = /## The Code start from\n([\s\S]*?)## The Code end/g;
          let codeMatch;
          let codeBlockCount = 0;
          
          while ((codeMatch = codeRegex.exec(subtopicSection)) !== null) {
            const codeContent = codeMatch[1].trim();
            codeBlockCount++;
            
            console.log(`🧩 Found Code Block ${codeBlockCount}:`, codeContent.substring(0, 50) + (codeContent.length > 50 ? '...' : ''));
            
            topic.contentBlocks.push({
              contentType: 'code',
              textContent: codeContent
            });
          }
          
          // Extract text blocks
          const textRegex = /\*! The text start\*\n([\s\S]*?)\*! The text end\*/g;
          let textMatch;
          let textBlockCount = 0;
          
          while ((textMatch = textRegex.exec(subtopicSection)) !== null) {
            const textContent = textMatch[1].trim();
            textBlockCount++;
            
            console.log(`📄 Found Text Block ${textBlockCount}:`, textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''));
            
            topic.contentBlocks.push({
              contentType: 'text',
              textContent: textContent
            });
          }
          
          // Extract tables
          const tableRegex = /\|\| Table Start \|\|\n([\s\S]*?)\|\| Table End \|\|/g;
          let tableMatch;
          let tableBlockCount = 0;
          
          while ((tableMatch = tableRegex.exec(subtopicSection)) !== null) {
            const tableContent = tableMatch[1].trim();
            tableBlockCount++;
            
            console.log(`📊 Found Table ${tableBlockCount}:`, tableContent.substring(0, 50) + (tableContent.length > 50 ? '...' : ''));
            
            const tableLines = tableContent.split('\n');
            
            const headers = tableLines[0].split('|').map(header => header.trim());
            const rows = tableLines.slice(1).map(row => 
              row.split('|').map(cell => cell.trim())
            );
            
            topic.contentBlocks.push({
              contentType: 'table',
              tableContent: {
                headers: headers,
                rows: rows
              }
            });
          }
          
          // Extract images
          const imageRegex = /\[\[ Image Start \]\]\n([\s\S]*?)\[\[ Image End \]\]/g;
          let imageMatch;
          let imageBlockCount = 0;
          
          while ((imageMatch = imageRegex.exec(subtopicSection)) !== null) {
            const imageContent = imageMatch[1].trim();
            imageBlockCount++;
            
            console.log(`🖼️ Found Image ${imageBlockCount}:`, imageContent.substring(0, 50) + (imageContent.length > 50 ? '...' : ''));
            
            const imageLines = imageContent.split('\n');
            
            const url = imageLines[0];
            const altText = imageLines[1] || '';
            const caption = imageLines[2] || '';
            
            topic.contentBlocks.push({
              contentType: 'image',
              imageContent: {
                url: url,
                altText: altText,
                caption: caption
              }
            });
          }
          
          // Extract examples
          const exampleRegex = /\{\{Example code\s+start \}\}\n([\s\S]*?)\{\{Example code\s+end \}\}/g;
          let exampleMatch;
          let exampleCount = 0;
          
          while ((exampleMatch = exampleRegex.exec(subtopicSection)) !== null) {
            const exampleCode = exampleMatch[1].trim();
            exampleCount++;
            
            console.log(`💻 Found Example ${exampleCount}:`, exampleCode.substring(0, 50) + (exampleCode.length > 50 ? '...' : ''));
            
            const example = new Example({
              topic: topic._id,
              code: exampleCode
            });
            
            await example.save();
            console.log(`✅ Example Saved:`, example._id);
            topic.examples.push(example._id);
          }
          
          // Save the topic
          await topic.save();
          console.log("✅ Topic Document Saved:", topic);
          
          // Add topic id to language's topics array
          language.topics.push(topic._id);
        }
      }
      
      // Update language document with topics
      await language.save();
      console.log("✅ Final Language Document Saved:", language);
      
      return { success: true, language };
    } catch (error) {
      console.error('Error parsing and storing content:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Route to upload and process file
  router.post('/upload-content', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
  
      console.log("📤 File received:", req.file.originalname, req.file.mimetype, req.file.size, "bytes");
      console.log("📝 Form data:", req.body);
  
      const formData = {
        levelNo: req.body.levelNo,
        levelName: req.body.levelName,
        ProgramName: req.body.ProgramName,
        description: req.body.description
      };
  
      // Validate required fields
      if (!formData.levelNo || !formData.ProgramName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Level number and program name are required' 
        });
      }
  
      console.log("🔄 Starting content parsing...");
      
      // Parse and store the content
      const result = await parseAndStoreContent(req.file.path, formData);
      
      console.log("🧹 Cleaning up temporary file...");
      
      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      
      if (result.success) {
        console.log("✅ Upload completed successfully!");
        
        res.status(200).json({ 
          success: true, 
          message: 'Content processed successfully',
          data: {
            languageId: result.language._id,
            topicsCount: result.language.topics.length
          }
        });
      } else {
        console.error("❌ Upload failed:", result.error);
        
        res.status(500).json({ 
          success: false, 
          message: 'Error processing content',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in upload-content route:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  });
  router.get("/studymaterial/:courseId/:userId", async (req, res) => {
    const { courseId, userId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({ 
                success: false,
                error: "Invalid course ID format" 
            });
        }

        const objectCourseId = new mongoose.Types.ObjectId(courseId);
        
        const user = await User.findOne({ student_id: userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        const completedProgram = user.programCompleted.find(
            (program) => program.program_id_com.toString() === objectCourseId.toString()
        );

        if (!completedProgram) {
            return res.status(404).json({ 
                success: false,
                error: "Program not found for the user" 
            });
        }

        // Fetch current language level with populated topics
        const languageLevels = await Language.find({ 
            program_id: objectCourseId,
            ProgramName: completedProgram.ProgramName 
        })
        .populate({
            path: 'topics',
            populate: {
                path: 'subtopics',
                populate: [
                    { path: 'paragraphs', model: 'Paragraph' },
                    { path: 'images', model: 'Image' },
                    { path: 'tables', model: 'Table' },
                    { path: 'code', model: 'Code' }
                ]
            }
        })
        .sort({ levelNo: 1 });

        if (!languageLevels || languageLevels.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: "No course levels found" 
            });
        }

        const currentLevel = languageLevels.find(level => 
            level.levelNo === completedProgram.levelNo &&
            level.ProgramName === completedProgram.ProgramName
        );

        if (!currentLevel) {
            return res.status(404).json({ 
                success: false,
                error: "Current level not found in course",
                details: {
                    userLevel: completedProgram.levelNo,
                    userProgram: completedProgram.ProgramName
                }
            });
        }

        // Helper function to get random unique quizzes
        const getRandomUniqueQuizzes = async (languageId, topicId, limit = 10) => {
            // Get all quizzes for the topic
            const allQuizzes = await Quiz.find({ 
                language: languageId,
                topic: topicId
            });
            
            // If we have fewer than the limit, return all of them
            if (allQuizzes.length <= limit) {
                return allQuizzes.map(quiz => ({
                    _id: quiz._id,
                    question: quiz.question,
                    options: quiz.options,
                    answer: quiz.answer
                }));
            }
            
            // Otherwise, select a random subset
            const selectedQuizzes = [];
            const selectedIndices = new Set();
            
            while (selectedQuizzes.length < limit && selectedIndices.size < allQuizzes.length) {
                const randomIndex = Math.floor(Math.random() * allQuizzes.length);
                
                if (!selectedIndices.has(randomIndex)) {
                    selectedIndices.add(randomIndex);
                    const quiz = allQuizzes[randomIndex];
                    selectedQuizzes.push({
                        _id: quiz._id,
                        question: quiz.question,
                        options: quiz.options,
                        answer: quiz.answer
                    });
                }
            }
            
            return selectedQuizzes;
        };

        // Fetch quizzes for each topic (with limit)
        const quizzesByTopic = {};
        for (const topic of currentLevel.topics) {
            quizzesByTopic[topic._id.toString()] = await getRandomUniqueQuizzes(
                currentLevel._id, 
                topic._id
            );
        }

        // Format the complete language level data
        const formattedCurrentLevel = {
            _id: currentLevel._id,
            program_id: currentLevel.program_id,
            level_id: currentLevel.level_id,
            levelNo: currentLevel.levelNo,
            levelName: currentLevel.levelName,
            ProgramName: currentLevel.ProgramName,
            description: currentLevel.description,
            topics: currentLevel.topics.map(topic => {
                const topicId = topic._id.toString();
                const formattedTopic = {
                    _id: topic._id,
                    title: topic.title,
                    subtopics: topic.subtopics.map(subtopic => ({
                        _id: subtopic._id,
                        title: subtopic.title,
                        paragraphs: subtopic.paragraphs,
                        images: subtopic.images,
                        tables: subtopic.tables,
                        code: subtopic.code
                    })),
                    quizzes: quizzesByTopic[topicId] || [] // Add limited quizzes to each topic
                };
                console.log("Formatted Topic:", JSON.stringify(formattedTopic, null, 2));
                return formattedTopic;
            })
        };
        
        // Base response object with complete data
        const baseResponse = {
            success: true,
            data: {
                currentLevel: formattedCurrentLevel
            }
        };

        // Add completion status and next level if applicable
        if (completedProgram.status === "completed") {
            const nextLevel = languageLevels.find(level => 
                level.levelNo === completedProgram.levelNo + 1 &&
                level.ProgramName === completedProgram.ProgramName
            );

            baseResponse.data.isCompleted = true;
            baseResponse.data.hasNextLevel = !!nextLevel;
            
            if (nextLevel) {
                // If there's a next level, fetch limited quizzes for that level too
                const nextLevelQuizzesByTopic = {};
                for (const topic of nextLevel.topics) {
                    nextLevelQuizzesByTopic[topic._id.toString()] = await getRandomUniqueQuizzes(
                        nextLevel._id, 
                        topic._id
                    );
                }

                baseResponse.message = "Next level available";
                baseResponse.data.nextLevel = {
                    _id: nextLevel._id,
                    program_id: nextLevel.program_id,
                    level_id: nextLevel.level_id,
                    levelNo: nextLevel.levelNo,
                    levelName: nextLevel.levelName,
                    ProgramName: nextLevel.ProgramName,
                    description: nextLevel.description,
                    topics: nextLevel.topics.map(topic => {
                        const topicId = topic._id.toString();
                        return {
                            _id: topic._id,
                            title: topic.title,
                            subtopics: topic.subtopics,
                            quizzes: nextLevelQuizzesByTopic[topicId] || []
                        };
                    })
                };
            } else {
                baseResponse.message = "All levels completed";
            }
        } else {
            baseResponse.message = "Current level material";
            baseResponse.data.isCompleted = false;
            baseResponse.data.hasNextLevel = false;
        }
        
        console.log(baseResponse);
        return res.status(200).json(baseResponse);

    } catch (err) {
        console.error("Error occurred:", err);
        return res.status(500).json({ 
            success: false,
            error: "Server error",
            message: err.message 
        });
    }
});
module.exports = router;