const express = require('express');
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { existsSync, unlinkSync } = require("fs");
const router = express.Router();

async function safeDelete(filePath) {
    try {
        if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }
    } catch (err) {
        console.log(`Warning: Could not delete ${filePath}: ${err.message}`);
    }
}

function executeCode(command, args, input) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${command} ${args.join(' ')}`); // Debug log
        const process = spawn(command, args);
        let output = "";
        let error = "";

        if (input) {
            console.log(`Input provided: ${input}`); // Debug log
            process.stdin.write(input + "\n");
            process.stdin.end();
        }

        process.stdout.on("data", (data) => {
            output += data.toString();
            console.log(`Stdout: ${data.toString()}`); // Debug log
        });

        process.stderr.on("data", (data) => {
            error += data.toString();
            console.log(`Stderr: ${data.toString()}`); // Debug log
        });

        process.on("error", (err) => {
            console.error(`Error: ${err.message}`); // Debug log
            reject(err);
        });

        process.on("close", (code) => {
            console.log(`Process closed with code ${code}`); // Debug log
            if (code !== 0 || error) {
                reject(new Error(error || "Execution failed"));
            } else {
                resolve(output);
            }
        });
    });
}

router.post("/compile", async (req, res) => {
    const { language, code, input } = req.body;

    if (!language || !code) {
        return res.status(400).send({ error: "Language and code are required." });
    }

    console.log(`Received request to compile ${language} code.`); // Debug log

    const extension = language === "python" ? "py" : language === "c" ? "c" : language === "cpp" ? "cpp" : "java";
    const uniqueId = Date.now();
    const fileName = `temp_${uniqueId}.${extension}`;
    const executableName = `temp_${uniqueId}${process.platform === 'win32' ? '.exe' : ''}`;
    const filePath = path.join(__dirname, fileName);
    const executablePath = path.join(__dirname, executableName);

    try {
        console.log(`Writing code to ${filePath}`); // Debug log
        await fs.writeFile(filePath, code);

        let output;
        if (language === "python") {
            output = await executeCode("python", [filePath], input);
        } else if (language === "c" || language === "cpp") {
            const compiler = language === "c" ? "gcc" : "g++";
            console.log(`Compiling with ${compiler}`); // Debug log
            await executeCode(compiler, [filePath, "-o", executablePath]);
            output = await executeCode(executablePath, [], input);
        } else if (language === "java") {
            const javaFileName = "Main.java";
            const javaFilePath = path.join(__dirname, javaFileName);
            console.log(`Writing Java code to ${javaFilePath}`); // Debug log
            await fs.writeFile(javaFilePath, code);
            await executeCode("javac", [javaFilePath]);
            output = await executeCode("java", ["-cp", __dirname, "Main"], input);
            await safeDelete(javaFilePath);
            await safeDelete(javaFileName.replace(".java", ".class"));
        }

        console.log(`Execution result: ${output}`); // Debug log
        res.status(200).send({ output });
    } catch (error) {
        console.error(`Error during execution: ${error.message}`); // Debug log
        res.status(400).send({ error: error.message });
    } finally {
        setTimeout(async () => {
            console.log('Cleaning up temporary files.'); // Debug log
            await safeDelete(filePath);
            await safeDelete(executablePath);
        }, 2000);
    }
});

module.exports = router;
