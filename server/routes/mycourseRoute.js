const express = require('express');
const router = express.Router();
const Student = require('../models/Student'); // Adjust the path as necessary

router.get('/my-course/:studentId',async (req, res) => {
  try {
    const { studentId } = req.params;  // Get the studentId from the URL
    console.log('Fetching courses for student:', studentId);
    const student = await Student.findOne({ student_id: studentId }).populate('programRegistered.program_id');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    console.log(student.programRegistered)
    res.json(student.programRegistered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
