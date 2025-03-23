const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const AvailableProgram = require('../models/ProgrammingLang');

// Route to move program to registered list
router.post('/move-to-registered', async (req, res) => {
  try {
    const { studentId, programName, levelNo } = req.body;

    console.log('Request received:', { studentId, programName, levelNo });

    // Find the student
    const student = await Student.findOne({ student_id: studentId });
    console.log('Student found:', student);

    if (!student) {
      console.error('Student not found');
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find the program details
    const availableProgram = await AvailableProgram.findOne({ ProgramName: programName }).lean();
    console.log('Available Program found:', availableProgram);

    if (!availableProgram) {
      console.error('Program not found');
      return res.status(404).json({ error: 'Program not found' });
    }

    // Find the level details
    const level = availableProgram.levels.find((level) => level.levelNo === levelNo);
    console.log('Level details found:', level);

    if (!level) {
      console.error('Level not found');
      return res.status(404).json({ error: 'Level not found' });
    }

    // Check if the level is already registered
    const isAlreadyRegistered = student.programRegistered.some(
      (registered) =>
        registered.ProgramName === programName && registered.levelNo === levelNo
    );

    console.log('Is already registered:', isAlreadyRegistered);

    if (isAlreadyRegistered) {
      console.error('Level is already registered');
      return res.status(400).json({ error: 'Level is already registered.' });
    }

    // Add to programRegistered
    const newProgram = {
      program_id: availableProgram._id,
      ProgramName: programName,
      levelNo,
      level_id: level._id,
      levelName: level.levelName,
      statuslevel: 'not-completed',
    };
    console.log('New program to register:', newProgram);

    student.programRegistered.push(newProgram);

    // Save the updated student
    const savedStudent = await student.save();
    console.log('Updated student after registration:', savedStudent);

    res.status(200).json({ message: 'Program moved to registered list successfully.' });
  } catch (error) {
    console.error('Error moving program to registered:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
