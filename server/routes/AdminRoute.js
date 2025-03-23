const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student=require('../models/Student')
router.get('/all-students', async (req, res) => {
    try {
      const students = await Student.find({}, 'student_id name '); 
      res.json(students);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });
  router.get('/student-details/:id', async (req, res) => {
    const { id } = req.params;

    console.log('Request received for student ID:', id);

    try {
        // Fetch student details and populate the program-related fields
        const studentDetails = await Student.findOne({ student_id: id })
            .populate('programCompleted.program_id_com', 'ProgramName levels') // Populate program details and levels array
            .exec();  // Execute the query

        if (!studentDetails) {
            console.log('Student personal details not found');
            return res.status(404).json({ message: 'Student not found' });
        }

        // Extract relevant fields
        const combinedData = {
            student_id: studentDetails.student_id,
            name: studentDetails.name,
            department: studentDetails.department,
            year: studentDetails.year,
            programCompleted: studentDetails.programCompleted.map((program) => {
                // Find the level in the 'levels' array based on 'levelNo'
                const level = program.program_id_com.levels.find(level => level.levelNo === program.levelNo);
                
                return {
                    programName: program.program_id_com?.ProgramName || 'N/A',
                    levelNo: program.levelNo,
                    levelName: level ? level.levelName : 'N/A', // Extract levelName based on levelNo
                    status: program.status
                };
            })
        };

        // Send the combined data as the response
        res.json(combinedData);
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports=router;