const express = require('express');
const mongoose = require('mongoose'); 
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const AvailableProgram = require("../models/ProgrammingLang"); // Import the program schema
const Student = require("../models/Student");
const Progress = require("../models/practiceprogress");

const Question=require('../models/praticeQuestion');
const upload = multer({ dest: "uploads/" });



router.post("/practice-questions", upload.single("file"), async (req, res) => {
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

router.get("/practice-questions/:id", async (req, res) => {
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

router.post("/practice-submit", async (req, res) => {
    try {
        const { id, studentId, questions } = req.body;
        console.log("🔵 Received request body:", JSON.stringify(req.body, null, 2));

        if (!Array.isArray(questions)) {
            return res.status(400).json({ message: "Questions must be an array" });
        }

        // Validate that questions are unique by title
        const uniqueQuestions = new Map();
        for (const q of questions) {
            if (!q.title) {
                return res.status(400).json({ message: "Each question must have a title" });
            }
            if (uniqueQuestions.has(q.title)) {
                return res.status(400).json({ 
                    message: `Duplicate question title found: ${q.title}. Each question must be unique.`
                });
            }
            uniqueQuestions.set(q.title, q);
        }

        let allTestsPassed = true;
        const program = await AvailableProgram.findOne({ "levels._id": id });
        if (!program) {
            return res.status(404).json({ message: "Program not found" });
        }

        const level = program.levels.find(lvl => lvl._id.toString() === id);
        if (!level) {
            return res.status(404).json({ message: "Level not found" });
        }

        // Prepare the base progress document
        const progressDoc = {
            studentId,
            ProgramName: program.ProgramName,
            LevelName: level.levelName,
            LevelNo: level.levelNo,
            level_id: id,
            Date: new Date(),
            question: []
        };

        // Process each question
        for (const questionData of questions) {
            const { code, testResults = [], title } = questionData;

            // Find the question in the database
            const dbQuestion = await Question.findOne({ 
                level_id: id,
                title: title
            });

            if (!dbQuestion) {
                return res.status(404).json({ 
                    message: `Question "${title}" not found in database`
                });
            }

            // Validate test results
            const testResultsArray = Array.isArray(testResults) ? testResults : [];
            const hasSingleTestCase = dbQuestion.testCases.length === 1;
            const singleTestCasePassed = hasSingleTestCase && 
                testResultsArray.length > 0 && 
                testResultsArray[0].passed === true;
            const allCasesPassed = testResultsArray.length > 0 && 
                testResultsArray.every(test => test.passed === true);

            // Check if this specific question passed its tests
            const questionPassed = (allCasesPassed || singleTestCasePassed) && 
                code && 
                code.trim() !== '';

            if (!questionPassed) {
                allTestsPassed = false;
            }

            // Create question progress entry
            const questionProgress = {
                title: dbQuestion.title,
                description: dbQuestion.description,
                code,
                testCases: testResultsArray.map(test => ({
                    status: test.passed ? "passed" : "not-passed"
                }))
            };

            progressDoc.question.push(questionProgress);
        }

        // Save or update progress
        let progress;
        const existingProgress = await Progress.findOne({ 
            studentId, 
            level_id: id 
        });

        if (existingProgress) {
            // Update existing progress with new questions
            progress = await Progress.findOneAndUpdate(
                { studentId, level_id: id },
                { 
                    $set: {
                        Date: new Date(),
                        question: progressDoc.question,
                        ...(allTestsPassed ? { status: "completed" } : {}) 
                        // Replace all questions
                    }
                },
                { new: true }
            );
        } else {
            // Create new progress document
            progress = await Progress.create({
                ...progressDoc,
                status: allTestsPassed ? "completed" : "not-completed"
            });        }

        res.status(201).json({ 
            message: "Progress saved successfully",
            questionsProcessed: progressDoc.question.length,
            allTestsPassed
        });

    } catch (error) {
        console.error("❌ Error saving progress:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;

