const express = require('express');
const router = express.Router();
const Course = require('../models/learningmaterial');

router.get('/courses/:courseName', async (req, res) => {
  try {
    const course = await Course.findOne({ courseName: req.params.courseName });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching course details' });
  }
});

module.exports = router;
