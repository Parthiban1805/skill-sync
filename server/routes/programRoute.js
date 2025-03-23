// Backend: routes/programs.js
const express = require('express');
const ProgrammingLanguage = require('../models/ProgrammingLang'); // Update with the correct path
const router = express.Router();

router.get('/programs', async (req, res) => {
  try {
    const programs = await ProgrammingLanguage.find(); // Fetch all programs
    if (!programs || programs.length === 0) {
      return res.status(404).json({ message: 'No programs found' });
    }
    res.json(programs); // Return all the programs
  } catch (error) {
    res.status(500).json({ message: 'Error fetching programs', error });
  }
});
router.get('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const program = await ProgrammingLanguage.findById(id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching program details', error });
  }
});

module.exports = router;
