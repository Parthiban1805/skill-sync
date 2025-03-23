const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { existsSync, unlinkSync } = require('fs');
const cors = require('cors');
const app = express();
const router = express.Router();
const uuid = require('uuid').v4;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/skill-sync', router);

// Create a temp directory for our files
const TEMP_DIR = path.join(__dirname, 'temp');

// Language-specific configs
const LANGUAGE_CONFIGS = {
    python: {
        extension: 'py',
        compile: null, // Python doesn't need compilation
        run: (filePath, input) => ['python', [filePath], input],
        visualize: true
    },
    c: {
        extension: 'c',
        compile: (filePath, outputPath) => ['gcc', [filePath, '-g', '-o', outputPath]],
        run: (filePath, input) => [filePath, [], input],
        visualize: true
    },
    cpp: {
        extension: 'cpp',
        compile: (filePath, outputPath) => ['g++', [filePath, '-g', '-o', outputPath]],
        run: (filePath, input) => [filePath, [], input],
        visualize: true
    },
    java: {
        extension: 'java',
        compile: (filePath) => ['javac', ['-g', filePath]],
        run: (filePath, input) => {
            const dir = path.dirname(filePath);
            const className = path.basename(filePath, '.java');
            return ['java', ['-cp', dir, className], input];
        },
        visualize: true
    }
};

// Utility functions
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

function executeCommand(command, args, input = '') {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${command} ${args.join(' ')}`);
        
        const process = spawn(command, args);
        let output = '';
        let error = '';

        if (input) {
            process.stdin.write(input);
            process.stdin.end();
        }

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            error += data.toString();
        });

        process.on('error', (err) => {
            reject(new Error(`Process error: ${err.message}`));
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process exited with code ${code}: ${error}`));
            } else {
                resolve(output);
            }
        });
    });
}

// Generate Python tracer code
function generatePythonTracer(code, input = '') {
    const escapedCode = code
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
    
    const escapedInput = input
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');

    return `
import sys
import io
import traceback
import inspect

class PythonTracer:
    def __init__(self, code, input_text=""):
        self.code = code
        self.input_text = input_text
        self.steps = []
        self.step_counter = 0
        self.current_line = 0
        self.call_stack = []
        self.variables = {}
        self.output_buffer = io.StringIO()
        self.input_buffer = io.StringIO(input_text)
        self.original_stdin = sys.stdin
        self.original_stdout = sys.stdout

    def trace_function(self, frame, event, arg):
        """Trace function that will be called for each execution step"""
        if event == 'line':
            # Get the source file of the current frame
            filename = frame.f_code.co_filename
            
            # Only trace our code, not built-in or library code
            if filename == '<string>':
                # Record the line number
                self.current_line = frame.f_lineno
                
                # Record variables in the current frame
                local_vars = {}
                for name, value in frame.f_locals.items():
                    # Skip special names and built-in functions
                    if not name.startswith('__') and not hasattr(value, '__call__'):
                        try:
                            # Attempt to make a JSON-serializable copy of the value
                            if isinstance(value, (int, float, str, bool, type(None))):
                                local_vars[name] = value
                            elif isinstance(value, (list, tuple)):
                                local_vars[name] = list(value)
                            elif isinstance(value, dict):
                                local_vars[name] = dict(value)
                            else:
                                # For other types, convert to string representation
                                local_vars[name] = str(value)
                        except:
                            # If conversion fails, store as string
                            local_vars[name] = str(value)
                
                # Record the current state
                call_stack_info = [{
                    'name': frame_info.f_code.co_name,
                    'line': frame_info.f_lineno
                } for frame_info in self.get_stack(frame)]
                
                self.steps.append({
                    'step': self.step_counter,
                    'line': self.current_line,
                    'variables': local_vars,
                    'callStack': call_stack_info
                })
                
                self.step_counter += 1
        
        # Continue tracing by returning this function
        return self.trace_function
    
    def get_stack(self, frame):
        """Get the call stack frames"""
        stack = []
        while frame:
            stack.append(frame)
            frame = frame.f_back
        # Return in reverse order (most recent call first)
        return stack[::-1]
    
    def run(self):
        """Run the code with tracing enabled"""
        sys.stdin = self.input_buffer
        sys.stdout = self.output_buffer
        
        result = None
        error = None
        
        try:
            # Set the trace function and execute the code
            sys.settrace(self.trace_function)
            
            # Execute the code
            compiled_code = compile(self.code, '<string>', 'exec')
            global_namespace = {}
            exec(compiled_code, global_namespace)
            
            result = self.output_buffer.getvalue()
        except Exception as e:
            error = f"Error: {str(e)}\\n{traceback.format_exc()}"
        finally:
            # Reset the trace function and restore I/O
            sys.settrace(None)
            sys.stdin = self.original_stdin
            sys.stdout = self.original_stdout
        
        return {
            'steps': self.steps,
            'output': result,
            'error': error
        }

# Run the tracer with the provided code
tracer = PythonTracer("""${escapedCode}""", """${escapedInput}""")
result = tracer.run()

# Output result as JSON for the Node.js process to capture
import json
print(json.dumps(result))
    `;
}

// Generate GDB script for C/C++ debugging
function generateGdbScript(filePath) {
    return `
set pagination off
set print address off
set print array off
set print pretty on
set confirm off

file ${filePath}
break main
run

define capture_state
    set $step_count = $arg0
    set $curr_line = 0
    
    where
    frame
    
    if $pc
        # Get current line number
        set $curr_line = __LINE__
        
        # Get local variables
        info locals
    end
    
    # Print special marker for our parser
    printf "FRAME_DATA_%d_%d\\n", $step_count, $curr_line
end

# Set up hooks for step
define hook-step
    capture_state $hookstep_count
    set $hookstep_count = $hookstep_count + 1
end

set $hookstep_count = 0
capture_state 0

# Perform steps
step
step
step
step
step
step
step
step
step
step
step
step
step
step
step
step
step
step
step
step
    `;
}

// Parse GDB output into structured steps
function parseGdbOutput(output) {
    const steps = [];
    const frames = output.split('FRAME_DATA_');
    
    for (let i = 1; i < frames.length; i++) {
        const frame = frames[i];
        const firstLine = frame.split('\n')[0];
        const [stepNum, lineNum] = firstLine.split('_').map(Number);
        
        // Extract variable information from the frame
        const variables = {};
        const lines = frame.split('\n');
        let inLocals = false;
        
        for (const line of lines) {
            if (line.includes('info locals')) {
                inLocals = true;
                continue;
            }
            
            if (inLocals && line.includes('=')) {
                const match = line.match(/([a-zA-Z0-9_]+)\s*=\s*(.*)/);
                if (match) {
                    const [, name, value] = match;
                    variables[name.trim()] = value.trim();
                }
            }
            
            if (inLocals && line.includes('FRAME_DATA_')) {
                inLocals = false;
            }
        }
        
        // Extract call stack information
        const callStack = [];
        let inStack = false;
        
        for (const line of lines) {
            if (line.includes('where')) {
                inStack = true;
                continue;
            }
            
            if (inStack && line.match(/#\d+/)) {
                const stackMatch = line.match(/#(\d+)\s+([a-zA-Z0-9_]+)\s+\((.*)\)\s+at\s+(.*):(\d+)/);
                if (stackMatch) {
                    const [, level, func, args, file, line] = stackMatch;
                    callStack.push({
                        level: Number(level),
                        name: func,
                        args: args,
                        file: file,
                        line: Number(line)
                    });
                }
            }
            
            if (inStack && line.includes('frame')) {
                inStack = false;
            }
        }
        
        steps.push({
            step: stepNum,
            line: lineNum,
            variables: variables,
            callStack: callStack
        });
    }
    
    return steps;
}

async function ensureTempDir() {
    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });
        console.log(`Temp directory ensured at: ${TEMP_DIR}`);
    } catch (error) {
        console.error(`Error creating temp directory: ${error.message}`);
        throw error;
    }
}

// Initialize temp directory
(async function initialize() {
    await ensureTempDir();
    console.log('Server initialization complete');
})().catch(err => {
    console.error('Server initialization failed:', err);
    process.exit(1);
});

async function createSourceFile(language, code, className = null) {
    const config = LANGUAGE_CONFIGS[language];
    const sessionId = uuid();
    
    let fileName;
    
    // Handle special case for Java
    if (language === 'java') {
        // Extract class name from code
        if (!className) {
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            className = classMatch ? classMatch[1] : 'Main';
        }
        fileName = `${className}.java`;
    } else {
        fileName = `${sessionId}.${config.extension}`;
    }
    
    const filePath = path.join(TEMP_DIR, fileName);
    
    try {
        await fs.writeFile(filePath, code);
        console.log(`Created source file: ${filePath}`);
        return { filePath, fileName, sessionId, className };
    } catch (error) {
        console.error(`Error creating source file: ${error.message}`);
        throw error;
    }
}

// Main route for code visualization
router.post('/visualize', async (req, res) => {
    const { language, code, input = '' } = req.body;
    
    if (!language || !code) {
        return res.status(400).json({ error: 'Language and code are required' });
    }
    
    if (!LANGUAGE_CONFIGS[language]) {
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }
    
    let sourceInfo;
    const filesToCleanup = [];
    
    try {
        // Ensure temp directory exists
        await ensureTempDir();
        
        // Create source file
        sourceInfo = await createSourceFile(language, code);
        filesToCleanup.push(sourceInfo.filePath);
        
        const config = LANGUAGE_CONFIGS[language];
        const { filePath, fileName, sessionId, className } = sourceInfo;
        
        // For compiled languages, define output path
        const outputPath = language === 'java' 
            ? path.join(TEMP_DIR, `${className}.class`)
            : path.join(TEMP_DIR, `${sessionId}${process.platform === 'win32' ? '.exe' : ''}`);
        
        if (language !== 'java') {
            filesToCleanup.push(outputPath);
        }
        
        // Language-specific visualization
        let result;
        
        if (language === 'python') {
            // Generate tracer code
            const tracerCode = generatePythonTracer(code, input);
            const tracerPath = path.join(TEMP_DIR, `${sessionId}_tracer.py`);
            await fs.writeFile(tracerPath, tracerCode);
            filesToCleanup.push(tracerPath);
            
            // Execute tracer
            const output = await executeCommand('python', [tracerPath]);
            try {
                result = JSON.parse(output);
            } catch (e) {
                return res.status(500).json({ 
                    error: `Failed to parse tracer output: ${e.message}`, 
                    raw: output 
                });
            }
        } else if (language === 'c' || language === 'cpp') {
            // Compile using approach from working code
            const compiler = language === 'c' ? 'gcc' : 'g++';
            try {
                await executeCommand(compiler, [filePath, '-o', outputPath]);
            } catch (e) {
                return res.status(400).json({ 
                    error: `Compilation error: ${e.message}`,
                    details: e.stderr || ''
                });
            }
            
            // Try to use GDB if available
            let useGdb = false;
            try {
                await executeCommand('gdb', ['--version']);
                useGdb = true;
            } catch (error) {
                console.log('GDB is not available:', error.message);
                useGdb = false;
            }
            
            if (useGdb) {
                // Run with GDB
                const gdbScriptPath = path.join(TEMP_DIR, `${sessionId}_gdb.txt`);
                await fs.writeFile(gdbScriptPath, generateGdbScript(outputPath));
                filesToCleanup.push(gdbScriptPath);
                
                try {
                    const gdbOutput = await executeCommand('gdb', ['-batch', '-x', gdbScriptPath]);
                    
                    // Parse GDB output
                    const steps = parseGdbOutput(gdbOutput);
                    
                    // Execute normally to get program output
                    let programOutput;
                    try {
                        programOutput = await executeCommand(outputPath, [], input);
                    } catch (e) {
                        programOutput = `Runtime error: ${e.message}`;
                    }
                    
                    result = {
                        steps: steps,
                        output: programOutput,
                        error: null
                    };
                } catch (gdbError) {
                    console.error('GDB execution failed:', gdbError);
                    // Fall back to non-GDB approach
                    useGdb = false;
                }
            }
            
            if (!useGdb) {
                // Fallback when GDB is not available or fails
                // Just run the program directly (like in your working /compile route)
                let programOutput;
                try {
                    programOutput = await executeCommand(outputPath, [], input);
                } catch (e) {
                    programOutput = `Runtime error: ${e.message}`;
                }
                
                // Create a simplified visualization with just the program output
                result = {
                    steps: [{
                        step: 0,
                        line: 1, // Start at the first line
                        variables: {},
                        callStack: [{ name: "main", line: 1 }]
                    }],
                    output: programOutput,
                    error: null,
                    gdbNotAvailable: true
                };
            }
        } else if (language === 'java') {
            // Compile
            const compileCmd = config.compile(filePath);
            try {
                await executeCommand(compileCmd[0], compileCmd[1]);
            } catch (e) {
                return res.status(400).json({ 
                    error: `Compilation error: ${e.message}`,
                    details: e.stderr || ''
                });
            }
            
            filesToCleanup.push(filePath.replace('.java', '.class'));
            
            // Run for output
            let programOutput;
            try {
                const runCmd = config.run(filePath, input);
                programOutput = await executeCommand(runCmd[0], runCmd[1], input);
            } catch (e) {
                programOutput = `Runtime error: ${e.message}`;
            }
            
            // For Java, we'll use a simpler approach and just return line numbers
            // with basic execution information since JDB parsing is complex
            result = {
                steps: [{
                    step: 0,
                    line: 1, // Start at the first line
                    variables: { className: className },
                    callStack: [{ name: "main", line: 1 }]
                }],
                output: programOutput,
                error: null
            };
        }
        
        res.json(result);
    } catch (error) {
        console.error('Visualization error:', error);
        res.status(500).json({ 
            error: `Visualization failed: ${error.message}`,
            details: error.stack || ''
        });
    } finally {
        // Clean up files
        setTimeout(async () => {
            for (const file of filesToCleanup) {
                await safeDelete(file);
            }
        }, 2000);
    }
});

// Simple compile and run route (without visualization)
// Simple compile and run route (without visualization)
router.post('/compile', async (req, res) => {
    const { language, code, input = '' } = req.body;
    
    if (!language || !code) {
        return res.status(400).json({ error: 'Language and code are required' });
    }
    
    if (!LANGUAGE_CONFIGS[language]) {
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }
    
    console.log(`Received request to compile ${language} code.`);
    
    let sourceInfo;
    const filesToCleanup = [];
    
    try {
        await ensureTempDir();
        
        sourceInfo = await createSourceFile(language, code);
        filesToCleanup.push(sourceInfo.filePath);
        
        const config = LANGUAGE_CONFIGS[language];
        const { filePath, fileName, sessionId, className } = sourceInfo;
        
        // Define outputPath for compiled languages
        const outputPath = language === 'java' 
            ? path.join(TEMP_DIR, `${className}.class`)
            : path.join(TEMP_DIR, `${sessionId}${process.platform === 'win32' ? '.exe' : ''}`);
        
        if (language !== 'java') {
            filesToCleanup.push(outputPath);
        }
        
        let output;
        
        if (language === "python") {
            output = await executeCommand('python', [filePath], input);
        } else if (language === "c" || language === "cpp") {
            // Compile using the correct path variables
            const compileCmd = config.compile(filePath, outputPath);
            await executeCommand(compileCmd[0], compileCmd[1]);
            
            // Run the executable
            const runCmd = config.run(outputPath, input);
            output = await executeCommand(runCmd[0], runCmd[1], input);
        } else if (language === "java") {
            // Compile
            const compileCmd = config.compile(filePath);
            await executeCommand(compileCmd[0], compileCmd[1]);
            filesToCleanup.push(filePath.replace('.java', '.class'));
            
            // Run
            const runCmd = config.run(filePath, input);
            output = await executeCommand(runCmd[0], runCmd[1], input);
        }
        
        console.log(`Execution result: ${output}`);
        res.status(200).json({ output });
    } catch (error) {
        console.error(`Error during execution: ${error.message}`);
        res.status(400).json({ error: error.message });
    } finally {
        setTimeout(async () => {
            for (const file of filesToCleanup) {
                await safeDelete(file);
            }
        }, 2000);
    }
});
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;