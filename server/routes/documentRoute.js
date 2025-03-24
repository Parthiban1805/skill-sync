const express = require('express');
const { body, validationResult } = require('express-validator');
const { Document, Topic, Subtopic, Image, Table, Code,Language,Paragraph,Quiz } = require('../models/document');
const router = express.Router();
const multer = require('multer');  

const  ProgrammingLanguage=require('../models/ProgrammingLang')
const csv = require('csv-parser');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, './uploads/');  // Make sure this directory exists
  },
  filename: function(req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
      // Accept only CSV files for quiz questions
      if (file.mimetype === 'text/csv') {
          cb(null, true);
      } else {
          cb(new Error('Only CSV files are allowed'), false);
      }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

router.post('/documents', upload.single('quizFile'), [
  body('ProgramName').notEmpty().withMessage('ProgramName is required'),
  body('levelNo').notEmpty().withMessage('levelNo is required'),
  body('topics').custom((value) => {
      try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
      } catch (e) {
          return false;
      }
  }).withMessage('Topics must be a valid JSON array'),
  body('topics.*.title').notEmpty().withMessage('Topic title is required'),
  body('topics.*.subtopics').isArray().withMessage('Subtopics must be an array'),
  body('topics.*.subtopics.*.title').notEmpty().withMessage('Subtopic title is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  try {
      const { ProgramName, levelNo, description } = req.body;
      // Parse topics from JSON string to array
      const topics = JSON.parse(req.body.topics);

      // Fetch program_id and level_id
      const numericLevelNo = Number(levelNo);
      const program = await ProgrammingLanguage.findOne({ ProgramName });
      
      if (!program) {
          return res.status(400).json({ message: "Program not found" });
      }
      
      
      const level = program.levels.find(lvl => lvl.levelNo === numericLevelNo);
      
      if (!level) {
          return res.status(400).json({ message: "Level not found in the program" });
      }
      
      let languageDoc = await Language.findOne({ program_id: program._id, level_id: level._id });

      if (!languageDoc) {
          languageDoc = new Language({
              program_id: program._id,
              level_id: level._id,
              ProgramName,
              levelNo,
              description,
              topics: [], // Store only IDs
          });
      } else {
          if (description) {
              languageDoc.description = description;
          }
          // Clear existing topics if updating
          if (languageDoc.topics.length > 0) {
              await Topic.deleteMany({ _id: { $in: languageDoc.topics } });
              languageDoc.topics = [];
          }
      }

      // Save topics and store only their IDs in Language
      for (const topicData of topics) {
          const topic = new Topic({ title: topicData.title, subtopics: [] });

          // Process subtopics for the current topic
          for (const subtopicData of topicData.subtopics) {
              const subtopic = new Subtopic({ title: subtopicData.title });

              // Initialize arrays for content references
              subtopic.paragraphs = [];
              subtopic.images = [];
              subtopic.tables = [];
              subtopic.code = [];

              // Process each contentItem
              if (subtopicData.contentItems && Array.isArray(subtopicData.contentItems)) {
                  for (const contentItem of subtopicData.contentItems) {
                      switch (contentItem.type) {
                          case 'paragraph':
                              const paragraph = new Paragraph({ content: contentItem.content });
                              await paragraph.save();
                              subtopic.paragraphs.push(paragraph._id);
                              break;
                              case 'image':
                                if (contentItem.url) {
                                    const image = new Image({ url: contentItem.url });
                                    await image.save();
                                    subtopic.images.push(image._id);
                                } else {
                                    console.error('Image URL is missing:', contentItem);
                                }
                                break;
                            
                            case 'table':
                                console.log('Table data received:', JSON.stringify(contentItem, null, 2));
                                const table = new Table({ 
                                    rows: contentItem.rows
                                });
                                await table.save();
                                subtopic.tables.push(table._id);
                                break;  
                                case 'code':
                                    if (!contentItem.language || contentItem.language.trim() === '') {
                                        console.error('Code content is missing the required language field:', contentItem);
                                        break; // Skip this contentItem if language is missing
                                    }
                                
                                    const code = new Code({ 
                                        code: contentItem.code,          
                                        language: contentItem.language.trim()
                                    });
                                    await code.save();
                                    subtopic.code.push(code._id);
                                    break;
                                
                          default:
                              console.warn(`Unknown content type: ${contentItem.type}`);
                      }
                  }
              }

              await subtopic.save();
              topic.subtopics.push(subtopic._id);
          }

          await topic.save();
          languageDoc.topics.push(topic._id);
      }

      // Save the language document first to have its ID for quiz questions
      await languageDoc.save();
      
      // Process CSV file for quiz questions if it exists
      if (req.file) {
          const quizQuestions = [];
          
          try {
              await new Promise((resolve, reject) => {
                  fs.createReadStream(req.file.path)
                      .pipe(csv())
                      .on('data', (row) => {
                          // Validate row structure
                          if (!row.question || !row.answer || 
                              !row.option1 || !row.option2 || !row.option3 || !row.option4) {
                              reject(new Error('CSV file missing required columns'));
                              return;
                          }
                          
                          // Find the first topic ID to associate with quizzes
                          // You might want to improve this to map questions to specific topics
                          const topicId = languageDoc.topics.length > 0 ? languageDoc.topics[0] : null;
                          
                          if (!topicId) {
                              reject(new Error('No topic found to associate with quiz questions'));
                              return;
                          }
                          
                          // Create quiz question object
                          const quizQuestion = new Quiz({
                              language: languageDoc._id,  // Use saved language document ID
                              topic: topicId,
                              question: row.question,
                              options: [row.option1, row.option2, row.option3, row.option4],
                              answer: row.answer
                          });
                          
                          quizQuestions.push(quizQuestion);
                      })
                      .on('end', async () => {
                          // Save all quiz questions to database
                          if (quizQuestions.length === 0) {
                              reject(new Error('No valid quiz questions found in CSV'));
                              return;
                          }
                          
                          // Save each quiz question
                          await Promise.all(
                              quizQuestions.map(question => question.save())
                          );
                          
                          resolve();
                      })
                      .on('error', (error) => {
                          reject(error);
                      });
              });
              
              // Clean up - delete the temporary file
              fs.unlink(req.file.path, (err) => {
                  if (err) console.error('Error deleting temporary file:', err);
              });
              
          } catch (csvError) {
              return res.status(400).json({ message: 'Error processing CSV file', error: csvError.message });
          }
      }
      
      res.status(200).json(languageDoc);
  } catch (err) {
      console.error("Error saving document:", err);
      res.status(500).json({ message: 'Error saving document', error: err.message });
  }
});

  // POST endpoint to handle CSV upload
  router.post('/upload-quiz-csv', upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      const { languageId, topicId } = req.body;
      
      if (!languageId || !topicId) {
        return res.status(400).json({ error: 'Language ID and Topic ID are required' });
      }
  
      // Validate that languageId and topicId exist in the database
      // (Add your validation logic here)
  
      const results = [];
      const errors = [];
      
      // Parse the CSV file
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', async () => {
          // Process each row from the CSV
          for (const row of results) {
            try {
              // Validate required fields
              if (!row.question || !row.answer) {
                errors.push({ row, error: 'Missing required fields (question or answer)' });
                continue;
              }
              
              // Extract options from the row
              const options = [];
              if (row.option1) options.push(row.option1);
              if (row.option2) options.push(row.option2);
              if (row.option3) options.push(row.option3);
              if (row.option4) options.push(row.option4);
              
              // Make sure we have at least 2 options
              if (options.length < 2) {
                errors.push({ row, error: 'At least 2 options are required' });
                continue;
              }
              
              // Verify the answer is one of the options
              if (!options.includes(row.answer)) {
                errors.push({ row, error: 'Answer must be one of the options' });
                continue;
              }
  
              // Create a new Quiz document
              const quiz = new Quiz({
                language: languageId,
                topic: topicId,
                question: row.question,
                options: options,
                answer: row.answer
              });
  
              // Save to database
              await quiz.save();
            } catch (err) {
              errors.push({ row, error: err.message });
            }
          }
  
          // Clean up - delete the uploaded file
          fs.unlinkSync(req.file.path);
  
          // Send response
          res.json({
            success: true,
            imported: results.length - errors.length,
            total: results.length,
            errors: errors.length > 0 ? errors : undefined
          });
        });
    } catch (error) {
      console.error('Error processing CSV upload:', error);
      res.status(500).json({ error: 'Failed to process CSV file', details: error.message });
    }
  });
  
// Get all documents
router.get('/all-documents', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const documents = await Document.find({}, 'title')
            .skip(skip)
            .limit(limit);

        const totalDocuments = await Document.countDocuments();
        res.status(200).json({
            documents,
            totalDocuments,
            totalPages: Math.ceil(totalDocuments / limit),
            currentPage: page,
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching documents', error: err });
    }
});

// Get a Document by Title
router.get('/documents/:title', async (req, res) => {
    try {
        const document = await Document.findOne({ title: req.params.title })
            .populate({
                path: 'topics',
                populate: {
                    path: 'subtopics',
                    populate: [
                        { path: 'images', model: 'Image' },
                        { path: 'tables', model: 'Table' },
                        { path: 'code', model: 'Code' },
                    ],
                },
            });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(200).json(document);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching document', error: err });
    }
});

// Delete a Document by Title
router.delete('/documents/:title', async (req, res) => {
    try {
        const document = await Document.findOneAndDelete({ title: req.params.title });
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting document', error: err });
    }
});

module.exports = router;
