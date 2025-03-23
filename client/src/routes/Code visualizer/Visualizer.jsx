import MonacoEditor from "@monaco-editor/react";
import axios from "axios";
import { Play, SkipBack, SkipForward, Square, StepBack, StepForward } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import './Visualizer.css';

// Variable Visualization Component
const VariableVisualization = ({ variables }) => {
    const renderVariableValue = (value) => {
        if (Array.isArray(value)) {
            return (
                <div className="array-visualization">
                    {value.map((item, idx) => (
                        <div key={idx} className="array-item">
                            <div className="array-index">{idx}</div>
                            <div className="array-value">{JSON.stringify(item)}</div>
                        </div>
                    ))}
                </div>
            );
        } else if (typeof value === 'object' && value !== null) {
            return (
                <div className="object-visualization">
                    {Object.entries(value).map(([key, val]) => (
                        <div key={key} className="object-property">
                            <div className="property-key">{key}:</div>
                            <div className="property-value">{JSON.stringify(val)}</div>
                        </div>
                    ))}
                </div>
            );
        } else {
            return <span>{JSON.stringify(value)}</span>;
        }
    };

    return (
        <div className="variables-visualization">
            <h4>Variables</h4>
            <div className="variables-container">
                {Object.keys(variables).length > 0 ? (
                    Object.entries(variables).map(([name, value]) => (
                        <div key={name} className="variable-item">
                            <div className="variable-name">{name}</div>
                            <div className="variable-value">{renderVariableValue(value)}</div>
                        </div>
                    ))
                ) : (
                    <div className="no-variables">No variables at this step</div>
                )}
            </div>
        </div>
    );
};

// Call Stack Visualization Component
const CallStackVisualization = ({ callStack }) => {
    if (!callStack || callStack.length === 0) {
        return (
            <div className="call-stack-visualization">
                <h4>Call Stack</h4>
                <div className="no-stack">No call stack information available</div>
            </div>
        );
    }

    return (
        <div className="call-stack-visualization">
            <h4>Call Stack</h4>
            <div className="call-stack-container">
                {callStack.map((frame, idx) => (
                    <div key={idx} className="stack-frame">
                        <div className="frame-header">
                            {frame.name || frame.method || `Frame ${idx}`} 
                            {frame.line && <span className="frame-line">Line: {frame.line}</span>}
                        </div>
                        {frame.args && <div className="frame-args">Args: {frame.args}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Code Pointer Component
const CodePointer = ({ code, currentLine }) => {
    const lines = code.split('\n');
    
    return (
        <div className="code-pointer">
            <div className="code-lines">
                {lines.map((line, idx) => (
                    <div 
                        key={idx} 
                        className={`code-line ${idx + 1 === currentLine ? 'active-line' : ''}`}
                    >
                        <div className="line-number">{idx + 1}</div>
                        <pre className="line-content">{line}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Default code samples for each language
const DEFAULT_CODE_SAMPLES = {
    python: `def factorial(n):
    # Base case: factorial of 0 or 1 is 1
    if n <= 1:
        return 1
    # Recursive case: n! = n * (n-1)!
    return n * factorial(n-1)

def main():
    number = 5
    result = factorial(number)
    print(f"The factorial of {number} is {result}")

main()`,
    c: `#include <stdio.h>

int factorial(int n) {
    // Base case: factorial of 0 or 1 is 1
    if (n <= 1) {
        return 1;
    }
    // Recursive case: n! = n * (n-1)!
    return n * factorial(n - 1);
}

int main() {
    int number = 5;
    int result = factorial(number);
    printf("The factorial of %d is %d\\n", number, result);
    return 0;
}`,
    cpp: `#include <iostream>
using namespace std;

int factorial(int n) {
    // Base case: factorial of 0 or 1 is 1
    if (n <= 1) {
        return 1;
    }
    // Recursive case: n! = n * (n-1)!
    return n * factorial(n - 1);
}

int main() {
    int number = 5;
    int result = factorial(number);
    cout << "The factorial of " << number << " is " << result << endl;
    return 0;
}`,
    java: `public class Main {
    public static int factorial(int n) {
        // Base case: factorial of 0 or 1 is 1
        if (n <= 1) {
            return 1;
        }
        // Recursive case: n! = n * (n-1)!
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int number = 5;
        int result = factorial(number);
        System.out.println("The factorial of " + number + " is " + result);
    }
}`
};

// Main Visualizer Component
const CodeVisualizer = () => {
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState("");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [executionSteps, setExecutionSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [speed, setSpeed] = useState(1000); // Animation speed in milliseconds
    const [isAnimating, setIsAnimating] = useState(false);
    const [hasExecuted, setHasExecuted] = useState(false);
    const editorRef = useRef(null);
    const animationRef = useRef(null);

    // Set default code when language changes
    useEffect(() => {
        setCode(DEFAULT_CODE_SAMPLES[language]);
        // Reset visualization state
        setExecutionSteps([]);
        setCurrentStep(0);
        setHasExecuted(false);
        setOutput("");
        setError("");
    }, [language]);

    // Handle editor mounting
    const handleEditorDidMount = (editor) => {
        editorRef.current = editor;
    };

    // Run code and get visualization data
    const runCode = async () => {
        if (!code.trim()) {
            setError("Code cannot be empty");
            return;
        }

        setIsRunning(true);
        setError("");
        setOutput("");
        setExecutionSteps([]);
        setCurrentStep(0);
        setHasExecuted(false);

        try {
            const response = await axios.post("http://127.0.0.1:5000/skill-sync/visualize", {
                language,
                code,
                input: input.trim()
            });

            if (response.data.error) {
                setError(response.data.error);
            } else {
                setOutput(response.data.output || "");
                
                // Process execution steps
                if (response.data.steps && response.data.steps.length > 0) {
                    setExecutionSteps(response.data.steps);
                    setHasExecuted(true);
                } else {
                    setError("No execution steps returned from the server");
                }
            }
        } catch (err) {
            console.error("Execution error:", err);
            setError(
                err.response?.data?.error || "Failed to run the code. Check server connection."
            );
        } finally {
            setIsRunning(false);
        }
    };

    // Animation controls
    const startAnimation = () => {
        if (executionSteps.length === 0 || currentStep >= executionSteps.length - 1) {
            setCurrentStep(0);
        }
        
        setIsAnimating(true);
        animateSteps();
    };

    const stopAnimation = () => {
        setIsAnimating(false);
        if (animationRef.current) {
            clearTimeout(animationRef.current);
            animationRef.current = null;
        }
    };

    const animateSteps = () => {
        if (!isAnimating || currentStep >= executionSteps.length - 1) {
            setIsAnimating(false);
            return;
        }

        // Move to next step
        setCurrentStep(prev => prev + 1);
        
        // Schedule next animation
        animationRef.current = setTimeout(animateSteps, speed);
    };

    // Step controls
    const goToNextStep = () => {
        if (currentStep < executionSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const goToPrevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const goToFirstStep = () => {
        setCurrentStep(0);
    };

    const goToLastStep = () => {
        setCurrentStep(executionSteps.length - 1);
    };

    // Handle animation speed change
    const handleSpeedChange = (e) => {
        setSpeed(parseInt(e.target.value));
    };

    // Get current execution state
    const getCurrentState = () => {
        if (!executionSteps.length || currentStep >= executionSteps.length) {
            return {
                line: 0,
                variables: {},
                callStack: []
            };
        }
        
        return executionSteps[currentStep];
    };

    // Clean up animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current);
            }
        };
    }, []);

    // Get current execution state
    const currentState = getCurrentState();

    return (
        <div className="code-visualizer">
            <div className="visualizer-header">
                <h1>Multi-Language Code Visualizer</h1>
                <div className="language-selector">
                    <label htmlFor="language-select">Language:</label>
                    <select 
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="language-select"
                    >
                        <option value="python">Python</option>
                        <option value="c">C</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                    </select>
                </div>
            </div>

            <div className="visualizer-main">
                <div className="editor-section">
                    <h3>Code Editor</h3>
                    <div className="editor-container">
                        <MonacoEditor
                            height="50vh"
                            language={language === "cpp" ? "cpp" : language}
                            value={code}
                            onChange={setCode}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: "on",
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbers: "on"
                            }}
                        />
                    </div>

                    <div className="input-container">
                        <h3>Input (if needed)</h3>
                        <textarea
                            placeholder="Enter input for your program..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="input-textarea"
                        />
                    </div>

                    <div className="run-controls">
                        <button
                            className="run-button"
                            onClick={runCode}
                            disabled={isRunning}
                        >
                            {isRunning ? "Running..." : "Run Visualization"}
                        </button>

                        {/* <div className="speed-control">
                            <label htmlFor="speed-slider">Animation Speed:</label>
                            <input
                                id="speed-slider"
                                type="range"
                                min="200"
                                max="2000"
                                step="100"
                                value={speed}
                                onChange={handleSpeedChange}
                                className="speed-slider"
                            />
                            <span>{speed}ms</span>
                        </div> */}
                    </div>
                    
                    {/* Output section */}
                    {(output || error) && (
                        <div className="output-section">
                            <h3>Program Output</h3>
                            {output && <pre className="output-content">{output}</pre>}
                            {error && <pre className="error-content">{error}</pre>}
                        </div>
                    )}
                </div>

                <div className="visualization-section">
                    <h3>Visualization</h3>
                    
                    {hasExecuted ? (
                        <div className="visualization-container">
                            {/* Step controls */}
                            <div className="step-controls-container">
                                <div className="step-controls">
                                    <button onClick={goToFirstStep} disabled={currentStep === 0} className="control-button">
                                        <SkipBack size={16} />
                                        <span>First</span>
                                    </button>
                                    <button onClick={goToPrevStep} disabled={currentStep === 0} className="control-button">
                                        <StepBack size={16} />
                                        <span>Previous</span>
                                    </button>
                                    <span className="step-indicator">
                                        Step {currentStep + 1} of {executionSteps.length}
                                    </span>
                                    <button onClick={goToNextStep} disabled={currentStep === executionSteps.length - 1} className="control-button">
                                        <span>Next</span>
                                        <StepForward size={16} />
                                    </button>
                                    <button onClick={goToLastStep} disabled={currentStep === executionSteps.length - 1} className="control-button">
                                        <span>Last</span>
                                        <SkipForward size={16} />
                                    </button>
                                    
                                    {isAnimating ? (
                                        <button className="stop-button control-button" onClick={stopAnimation}>
                                            <Square size={16} />
                                            <span>Stop</span>
                                        </button>
                                    ) : (
                                        <button className="play-button control-button" onClick={startAnimation}>
                                            <Play size={16} />
                                            <span>Play</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="visualization-panels">
                                    <h4>Code Execution</h4>
                                <div className="code-visualization">
                                    <CodePointer code={code} currentLine={currentState.line} />
                                </div>
                                
                                <div className="state-visualization">
                                    <VariableVisualization variables={currentState.variables || {}} />
                                    <CallStackVisualization callStack={currentState.callStack || []} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="placeholder-message">
                            <p>Run your code to start the visualization</p>
                            <p className="language-support-note">Currently visualizing: <strong>{language.toUpperCase()}</strong></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodeVisualizer;