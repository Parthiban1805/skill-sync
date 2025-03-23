const express = require('express');
const router = express.Router();
const PracticeMark = require('../models/praticemark');
const PracticeProgress=require('../models/practiceprogress')
router.post('/submit-quiz', async (req, res) => {
  try {
      const { student_id, answers, levelId, programId } = req.body;

      if (!student_id || !answers || answers.length === 0) {
          return res.status(400).json({ error: "Invalid request data" });
      }

      let score = 0;
      const storedResults = [];

      for (const answer of answers) {
          const { question, user_answer, correct_answer } = answer;

          if (!user_answer || user_answer.trim() === "") {
              continue;
          }

          const mark = user_answer === correct_answer ? 1 : 0;
          score += mark;

          const practiceData = new PracticeMark({
              student_id,
              question,
              user_answer,
              correct_answer,
              mark,
              level_id: levelId,
              program_id: programId
          });

          storedResults.push(practiceData);
      }

      if (storedResults.length === 0) {
          return res.status(400).json({ error: "No valid answers to submit." });
      }

      // Bulk insert the results
      await PracticeMark.insertMany(storedResults);

      res.status(201).json({
          message: "Quiz submitted successfully",
          totalScore: score,
          results: storedResults
      });

  } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});




router.get('/practice-progress', async (req, res) => {
    try {
      const progressData = await PracticeProgress.find()
        .sort({ Date: -1 }) // Sort by date, newest first
        .lean(); // Use lean() to get plain JavaScript objects instead of Mongoose documents
      
      res.json(progressData);
    } catch (error) {
      console.error('Error fetching practice progress:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // GET practice progress by student ID
  router.get('/practice-progress/student/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
      const progressData = await PracticeProgress.find({ studentId })
        .sort({ Date: -1 })
        .lean();
      
      if (progressData.length === 0) {
        return res.status(404).json({ message: 'No records found for this student' });
      }
      
      res.json(progressData);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // GET practice progress by program
  router.get('/practice-progress/program/:programName', async (req, res) => {
    try {
      const { programName } = req.params;
      const progressData = await PracticeProgress.find({ ProgramName: programName })
        .sort({ Date: -1 })
        .lean();
      
      if (progressData.length === 0) {
        return res.status(404).json({ message: 'No records found for this program' });
      }
      
      res.json(progressData);
    } catch (error) {
      console.error('Error fetching program progress:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
module.exports = router;
