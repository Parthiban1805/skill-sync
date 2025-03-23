const express = require('express');
const mongoose = require('mongoose'); 
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const AvailableProgram = require("../models/ProgrammingLang"); // Import the program schema

const Question=require('../models/question');
const upload = multer({ dest: "uploads/" });



router.post("/questions", upload.single("file"), async (req, res) => {
    const { ProgramName, LevelName, LevelNo } = req.body;

    console.log("Received request body:", req.body);
    console.log("Received file:", req.file);

    if (!ProgramName || !LevelName || !LevelNo) {
        console.error("Missing required fields:", { ProgramName, LevelName, LevelNo });
        return res.status(400).send({ error: "ProgramName, LevelName, and LevelNo are required." });
    }

    if (!req.file) {
        console.error("CSV file is missing.");
        return res.status(400).send({ error: "CSV file is required." });
    }

    try {
        console.log("Finding program:", ProgramName);
        const program = await AvailableProgram.findOne({ ProgramName });

        if (!program) {
            console.error("Program not found:", ProgramName);
            return res.status(404).send({ error: "Program not found." });
        }

        console.log("Program found:", program);

        const level = program.levels.find(
            (lvl) => lvl.levelName === LevelName && lvl.levelNo === parseInt(LevelNo, 10)
        );

        if (!level) {
            console.error("Level not found:", { LevelName, LevelNo });
            return res.status(404).send({ error: "Level not found in the specified program." });
        }

        console.log("Level found:", level);

        const level_id = level._id;

        const questions = [];
        const filePath = req.file.path;

        console.log("Processing file at path:", filePath);

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => {
                console.log("Processing row:", row);

                const {
                    title,
                    description,
                    inputFormat,
                    outputFormat,
                    constraints,
                    ...testCases
                } = row;

                const parsedTestCases = Object.entries(testCases)
                .filter(([key]) => key.startsWith("testCase") && testCases[key])
                .map(([key, value]) => {
                    const [input, output] = value.split("|");
                    if (input === undefined || output === undefined) {
                        throw new Error(`Invalid test case format in ${key}: ${value}`);
                    }
                    console.log("Parsed test case:", { input, output });
                    return { input: input.trim(), output: output.trim() };
                });

                questions.push({
                    ProgramName,
                    LevelName,
                    LevelNo,
                    level_id,
                    title,
                    description,
                    inputFormat,
                    outputFormat,
                    constraints,
                    testCases: parsedTestCases,
                });
            })
            .on("end", async () => {
                console.log("Finished processing file. Questions to insert:", questions);

                try {
                    // Save all questions to the database
                    await Question.insertMany(questions);
                    console.log("Questions inserted successfully.");
                    fs.unlinkSync(filePath); // Remove the uploaded file
                    console.log("Temporary file deleted.");
                    res.status(201).send({ message: "Questions added successfully!" });
                } catch (error) {
                    console.error("Error saving questions:", error);
                    res.status(500).send({ error: "Failed to save questions." });
                }
            })
            .on("error", (error) => {
                console.error("Error processing file:", error);
                res.status(500).send({ error: "Failed to process file." });
            });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).send({ error: "An unexpected error occurred." });
    }
});


// Example backend route for fetching questions
router.get("/questions", async (req, res) => {
    const { program, level } = req.query;
    const query = { ProgramName: program.trim(), LevelNo: level };

    console.log("Fetching questions with query:", query);

    try {
        const questions = await Question.find(query);
        console.log("Questions fetched:", questions);
        res.json(questions);
    } catch (err) {
        console.error("Error fetching questions:", err);
        res.status(500).json({ message: "Failed to fetch questions." });
    }
});

// Example backend route for fetching levels
router.get("/levels", async (req, res) => {
    const { program } = req.query;
    
    console.log("Fetching levels for program:", program);

    try {
        const levels = await Question.distinct("LevelNo", { ProgramName: program });
        console.log("Levels fetched:", levels);
        res.json(levels.map(LevelNo => ({ LevelNo })));
    } catch (err) {
        console.error("Error fetching levels:", err);
        res.status(500).json({ message: "Failed to fetch levels." });
    }
});

router.get("/questions/:id", async (req, res) => {
    try {
        console.log("Incoming request to fetch questions by level_id.");
        
        const levelId = req.params.id;
        console.log("Received levelId:", levelId);

        // Validate levelId
        if (!mongoose.Types.ObjectId.isValid(levelId)) {
            console.error("Invalid level_id provided:", levelId);
            return res.status(400).json({ error: "Invalid level_id provided." });
        }

        // Convert levelId to ObjectId
        const objectIdLevelId = new mongoose.Types.ObjectId(levelId);

        console.log("Valid level_id, proceeding to query database.");

        // Find two questions associated with the provided level_id
        const questions = await Question.find({
            level_id: objectIdLevelId  // Ensure we are only querying using a valid ObjectId
        }).sort({ level_id: 1 }); // Sort by level_id to ensure consistent order

        if (!questions || questions.length === 0) {
            console.warn("No questions found for level_id:", levelId);
            return res.status(404).json({ error: "No questions found for the specified level_id." });
        }

        // Format the response
        const response = {
            question1: questions[0] || null,
            question2: questions[1] || null
        };

        console.log("Questions found for level_id:", levelId, "Questions details:", response);

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ error: "Failed to fetch the questions." });
    }
});


router.get("/admin/questions/:id", async (req, res) => {
    try {
      console.log("Received request for question ID:", req.params.id);
  
      const question = await Question.findById(req.params.id);
      if (!question) {
        console.log("Question not found:", req.params.id);
        return res.status(404).send({ error: "Question not found." });
      }
  
      console.log("Question found:", question);
      res.status(200).send(question);
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).send({ error: "Failed to fetch the question." });
    }
  });
  

module.exports = router;

