const router = require('express').Router();
const Student = require('../models/Student'); // Adjust the path as needed
const AvailableProgram = require('../models/ProgrammingLang');

router.post('/student/:studentId/calculate-next-levels', async (req, res) => {
  try {
    const { studentId } = req.params;
    // Fetch the student document
    const student = await Student.findOne({student_id: studentId }).populate('programRegistered.program_id');

    // Handle case where student is not found
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch all available programs
    const allPrograms = await AvailableProgram.find({});

    // Extract registered program names
    const registeredPrograms = student.programRegistered.map((reg) => reg.ProgramName);

    // Filter eligible programs
    const eligiblePrograms = allPrograms
      .filter((program) => !registeredPrograms.includes(program.ProgramName))
      .map((program) => ({
        ProgramName: program.ProgramName,
        currentLevelName: 'N/A',
        nextLevelName: program.levels.find((level) => level.levelNo === 1)?.levelName || 'Level 1',
        nextLevelNo: 1,
      }));

    // Respond with eligible levels
    res.status(200).json({ eligibleLevels: eligiblePrograms });
  } catch (error) {
    console.error('Error calculating next levels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
