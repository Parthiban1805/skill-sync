import React, { useState } from 'react';

const PythonExecutionVisualizer = () => {
  const [code, setCode] = useState(
`def calculate_factorial(n):
    if n <= 1:
        return 1
    return n * calculate_factorial(n - 1)

result = calculate_factorial(4)
print(f"The factorial of 4 is {result}")`
  );
  
  const [executionSteps, setExecutionSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");

  // Simulate Python code execution and generate visualization steps
  const visualizeExecution = () => {
    setIsRunning(true);
    setOutput("");
    
    // Parse and simulate execution
    try {
      const steps = simulatePythonExecution(code);
      setExecutionSteps(steps);
      setCurrentStep(0);
      
      // Extract final output
      const finalOutput = steps[steps.length - 1].output || "";
      setOutput(finalOutput);
    } catch (error) {
      setOutput(`Error: ${error.message}`);
      setExecutionSteps([]);
    }
    
    setIsRunning(false);
  };

  // Simplified Python execution simulator
  const simulatePythonExecution = (sourceCode) => {
    // This is a simplified simulation - in a real app, you'd use a proper parser or backend
    const steps = [];
    const environment = { global: {}, calls: [] };
    
    // Split code into lines for line-by-line execution tracking
    const lines = sourceCode.split('\n');
    
    // Identify function definitions
    const functionDefs = [];
    let currentFunc = null;
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('def ')) {
        const funcName = line.trim().split('def ')[1].split('(')[0];
        currentFunc = {
          name: funcName,
          params: line.split('(')[1].split(')')[0].split(',').map(p => p.trim()),
          body: [],
          startLine: index
        };
        functionDefs.push(currentFunc);
      } else if (currentFunc && line.trim() && (line.startsWith('    ') || line.startsWith('\t'))) {
        currentFunc.body.push({line: index, code: line.trim()});
      } else if (currentFunc && !line.trim()) {
        // Empty line within function
        currentFunc.body.push({line: index, code: ""});
      } else if (currentFunc) {
        // End of function
        currentFunc = null;
      }
    });
    
    // Simulate main execution flow
    let outputText = "";
    let linePointer = 0;
    
    const addStep = (line, env, output) => {
      steps.push({
        line,
        environment: JSON.parse(JSON.stringify(env)),
        output: output
      });
    };
    
    // Simulate factorial function execution for n=4
    environment.global = {};
    
    // Function definition step
    addStep(0, environment, outputText);
    
    // First call with n=4
    environment.calls.push({
      name: "calculate_factorial",
      params: {n: 4},
      returnValue: null,
      line: 0
    });
    addStep(1, environment, outputText);
    
    // Check n <= 1 (false)
    addStep(2, environment, outputText);
    
    // Recursive call with n=3
    environment.calls.push({
      name: "calculate_factorial",
      params: {n: 3},
      returnValue: null,
      line: 0
    });
    addStep(4, environment, outputText);
    
    // Check n <= 1 (false)
    addStep(2, environment, outputText);
    
    // Recursive call with n=2
    environment.calls.push({
      name: "calculate_factorial",
      params: {n: 2},
      returnValue: null,
      line: 0
    });
    addStep(4, environment, outputText);
    
    // Check n <= 1 (false)
    addStep(2, environment, outputText);
    
    // Recursive call with n=1
    environment.calls.push({
      name: "calculate_factorial",
      params: {n: 1},
      returnValue: null,
      line: 0
    });
    addStep(4, environment, outputText);
    
    // Check n <= 1 (true)
    addStep(2, environment, outputText);
    
    // Return 1
    environment.calls[environment.calls.length - 1].returnValue = 1;
    addStep(3, environment, outputText);
    
    // Return to n=2 call
    environment.calls.pop();
    environment.calls[environment.calls.length - 1].returnValue = 2;
    addStep(4, environment, outputText);
    
    // Return to n=3 call
    environment.calls.pop();
    environment.calls[environment.calls.length - 1].returnValue = 6;
    addStep(4, environment, outputText);
    
    // Return to n=4 call
    environment.calls.pop();
    environment.calls[environment.calls.length - 1].returnValue = 24;
    addStep(4, environment, outputText);
    
    // Return to main, store result
    environment.calls.pop();
    environment.global.result = 24;
    addStep(6, environment, outputText);
    
    // Print result
    outputText = "The factorial of 4 is 24";
    addStep(7, environment, outputText);
    
    return steps;
  };

  const nextStep = () => {
    if (currentStep < executionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderEnvironment = () => {
    if (!executionSteps.length || !executionSteps[currentStep]) {
      return <div className="text-gray-500">Run the code to see variables and execution state</div>;
    }
    
    const step = executionSteps[currentStep];
    return (
      <div>
        <h3 className="text-lg font-medium mb-2">Frames</h3>
        
        <div className="space-y-4">
          {/* Global Frame */}
          <div className="border border-gray-300 rounded-md p-3">
            <div className="font-medium text-indigo-600 mb-2">Global Frame</div>
            {Object.keys(step.environment.global).length > 0 ? (
              <table className="w-full">
                <tbody>
                  {Object.entries(step.environment.global).map(([key, value], i) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-1 pr-4 font-mono text-sm">{key}</td>
                      <td className="py-1 font-mono text-sm">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-gray-500 text-sm">No variables</div>
            )}
          </div>
          
          {/* Function Calls */}
          {step.environment.calls.map((call, i) => (
            <div key={i} className="border border-gray-300 rounded-md p-3">
              <div className="font-medium text-indigo-600 mb-2">
                {call.name}() Frame
                {call.returnValue !== null && 
                  <span className="ml-2 text-green-600">
                    returns {call.returnValue}
                  </span>
                }
              </div>
              <table className="w-full">
                <tbody>
                  {Object.entries(call.params).map(([key, value], j) => (
                    <tr key={j} className="border-b border-gray-200">
                      <td className="py-1 pr-4 font-mono text-sm">{key}</td>
                      <td className="py-1 font-mono text-sm">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-600">Python Code Visualizer</h1>
          <p className="text-gray-600">Step through Python code execution and visualize memory state</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-3">Python Code</h2>
              <textarea
                className="w-full h-80 p-3 font-mono text-sm border border-gray-300 rounded-md"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              
              <div className="mt-4 flex justify-between">
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none"
                  onClick={visualizeExecution}
                  disabled={isRunning}
                >
                  {isRunning ? 'Running...' : 'Visualize Execution'}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-3">Output</h2>
              <div className="bg-gray-100 p-3 rounded-md font-mono text-sm h-24 overflow-y-auto">
                {output || <span className="text-gray-500">No output yet</span>}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Execution Visualization</h2>
                <div className="flex space-x-2">
                  <button
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none disabled:opacity-50"
                    onClick={prevStep}
                    disabled={currentStep === 0 || executionSteps.length === 0}
                  >
                    ← Prev
                  </button>
                  <span className="py-1 px-2">
                    {executionSteps.length > 0 ? `${currentStep + 1}/${executionSteps.length}` : '0/0'}
                  </span>
                  <button
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none disabled:opacity-50"
                    onClick={nextStep}
                    disabled={currentStep >= executionSteps.length - 1 || executionSteps.length === 0}
                  >
                    Next →
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Code Execution</h3>
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {code.split('\n').map((line, i) => (
                          <tr 
                            key={i}
                            className={
                              executionSteps.length > 0 && 
                              executionSteps[currentStep] && 
                              executionSteps[currentStep].line === i 
                                ? "bg-yellow-100" 
                                : ""
                            }
                          >
                            <td className="py-1 px-2 text-right border-r border-gray-300 text-gray-500 w-10">
                              {i + 1}
                            </td>
                            <td className="py-1 px-3 font-mono text-sm">
                              {line}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div>
                  {renderEnvironment()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PythonExecutionVisualizer;