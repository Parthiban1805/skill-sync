const express = require("express");
const mongoose = require("mongoose");
const Progress = require("../models/progress");
const AvailableProgram = require("../models/ProgrammingLang");
const Question = require("../models/question"); 
const Student = require("../models/Student");
const SlotBooking = require("../models/slotbooking");

const router = express.Router();

router.post("/submit", async (req, res) => {
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
                        question: progressDoc.question // Replace all questions
                    }
                },
                { new: true }
            );
        } else {
            // Create new progress document
            progress = await Progress.create(progressDoc);
        }

        // Update student progress if all tests passed
        if (allTestsPassed) {
            const student = await Student.findOne({ student_id: studentId });
            if (!student) {
                return res.status(404).json({ message: "Student not found" });
            }

            const programIndex = student.programCompleted.findIndex(
                (prog) => prog.ProgramName === program.ProgramName
            );

            const progressUpdate = {
                ProgramName: program.ProgramName,
                levelNo: level.levelNo,
                levelName: level.levelName,
                level_id_com: id,
                status: 'completed'
            };

            if (programIndex !== -1) {
                student.programCompleted[programIndex] = {
                    ...student.programCompleted[programIndex],
                    ...progressUpdate
                };
            } else {
                student.programCompleted.push({
                    program_id_com: program._id,
                    ...progressUpdate
                });
            }

            await student.save();
        }

        // Delete slot booking after submission
        await SlotBooking.deleteMany({ student_id: studentId });

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