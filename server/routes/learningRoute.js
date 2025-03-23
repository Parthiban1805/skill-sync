const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const router = express.Router();
const Course = require('../models/learningmaterial'); // Adjust the path to your model
const User = require('../models/Student'); // Adjust the path to your user model

// Route to get learning material by course_id and user_id
router.get('/learning-material/:courseId/:userId', async (req, res) => {
  const { courseId, userId } = req.params; // Extract courseId and userId from the URL params

  console.log(`Request received for courseId: ${courseId}, userId: ${userId}`);

  try {
    // Fetch user details
    const user = await User.findById(userId);
    console.log('User Details:', user);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check the program completion status in the programCompleted array
    const completedProgram = user.programCompleted.find(
      (program) => program.program_id_com.toString() === courseId // Match program_id_com with courseId
    );

    if (!completedProgram) {
      return res.status(404).json({ error: 'Program not found for the user' });
    }

    console.log('Completed Program:', completedProgram);

    // Find the course material using course_id (use `new mongoose.Types.ObjectId(courseId)` to convert string to ObjectId)
    const course = await Course.findOne({ program_id: new mongoose.Types.ObjectId(courseId) });
    console.log('Course Details:', course);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Check the current level status
    const currentLevel = course.levels.find(
      (level) => level.level_id.toString() === completedProgram.level_id_com.toString()
    );

    if (!currentLevel) {
      return res.status(404).json({ error: 'Current level not found in course' });
    }

    console.log('Current Level:', currentLevel);

    if (completedProgram.status === 'completed') {
      // If the current level is completed, find the next level
      const nextLevel = course.levels.find((level) => level.levelNo === completedProgram.levelNo + 1);

      if (!nextLevel) {
        return res.status(404).json({ error: 'No more levels available' });
      }

      return res.json({ message: 'Next level material',nextLevel });
    } else {
      // If the current level is not completed, return the current level material
      return res.json({ message: 'Current level material',  currentLevel });
    }
  } catch (err) {
    console.error('Error occurred:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
