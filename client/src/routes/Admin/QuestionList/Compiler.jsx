import MonacoEditor from "@monaco-editor/react";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import '../../complier/QuestionDetails/QuestionDetails.css';

const QuestionDetails = () => {
  const { id } = useParams();
  
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [compilationError, setCompilationError] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const response = await axios.get(`https://assessly-server.weacttech.com/skill-sync/admin/questions/${id}`);
        setQuestion(response.data);
        if (response.data.codeTemplate) {
          setCode(response.data.codeTemplate);
        }
      } catch (err) {
        setError("Failed to fetch the question.");
        console.error("Error fetching question:", err);
      }
    };

    fetchQuestion();
  }, [id]);

  const handleCompile = async () => {
    if (!code.trim()) {
      setCompilationError("Code cannot be empty.");
      return;
    }

    setIsCompiling(true);
    setCompilationError("");

    try {
      let results = [];

      if (input.trim()) {
        const response = await axios.post("https://assessly-server.weacttech.com/skill-sync/compile", {
          language,
          code,
          input: input.trim(),
        });

        if (response.data.error) {
          setCompilationError(response.data.error);
          setOutput("");
          setIsCompiling(false);
          return;
        }

        setOutput(response.data.output);
      } else {
        setOutput("");
      }

      results = await Promise.all(
        question.testCases.map(async (testCase) => {
          try {
            const testResponse = await axios.post("https://assessly-server.weacttech.com/skill-sync/compile", {
              language,
              code,
              input: testCase.input,
            });

            if (testResponse.data.error) {
              return {
                input: testCase.input,
                expectedOutput: testCase.output,
                actualOutput: `Error: ${testResponse.data.error}`,
                passed: false,
              };
            }

            const actualOutput = testResponse.data.output.trim();
            const expectedOutput = testCase.output.trim();
            const passed = actualOutput === expectedOutput;

            return {
              input: testCase.input,
              expectedOutput: expectedOutput,
              actualOutput: actualOutput,
              passed: passed,
            };
          } catch (err) {
            return {
              input: testCase.input,
              expectedOutput: testCase.output,
              actualOutput: "Error: Failed to run test case",
              passed: false,
            };
          }
        })
      );

      setTestResults(results);

    } catch (err) {
      console.error("Compilation error:", err);
      setCompilationError(err.response?.data?.error || "Failed to compile and run the code.");
      setTestResults([]);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    setCode("");
    setOutput("");
    setCompilationError("");
    setTestResults([]);
  };

  if (error) return <div className="error-container">{error}</div>;
  if (!question) return <div className="loading-container">Loading...</div>;

  return (
    <div className="question-details-container">
      {/* Left Panel */}
      <div className="question-details-left-container">
      <div className="question-description-panel">
        <div className="question-header">
          <h1>{question.title}</h1>
        </div>
        <div className="question-description">
          <p>{question.description}</p>
        </div>
      </div>
      <div className="test-cases-section">
          <h3>Test Cases</h3>
          <div className="test-case-results">
            {question.testCases.map((testCase, index) => (
              <div 
                key={index} 
                className={`test-case-item ${
                  testResults[index]?.passed ? 'passed' : 
                  testResults[index]?.passed === false ? 'failed' : ''
                }`}
              >
                <div className="test-case-header">
                  <span className="test-case-number">Test Case {index + 1}</span>
                  {testResults[index] && (
                    <span className={`status-badge ${testResults[index].passed ? 'passed' : 'failed'}`}>
                      {testResults[index].passed ? 'Passed' : 'Failed'}
                    </span>
                  )}
                </div>
                {/* <div className="test-case-details">
                  <div className="test-case-input">
                    <strong>Input:</strong>
                    <pre>{testCase.input}</pre>
                  </div>
                  <div className="test-case-expected">
                    <strong>Expected Output:</strong>
                    <pre>{testCase.output}</pre>
                  </div>
                  {testResults[index] && (
                    <div className="test-case-actual">
                      <strong>Your Output:</strong>
                      <pre>{testResults[index].actualOutput}</pre>
                    </div>
                  )}
                </div> */}
              </div>
            ))}
          </div>
        </div>
      </div>
  
      {/* Right Panel */}
      <div className="question-details-right-container">
      <div className="code-panel">
        <div className="code-header">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="language-dropdown"
          >
            <option value="python">Python</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>
  
        <div className="monaco-editor-container">
          <MonacoEditor
            height="50vh"
            language={language}
            value={code}
            onChange={setCode}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              folding: true,
              bracketPairColorization: true,
            }}
          />
        </div>
  
        <div className="io-section">
          <div className="input-section">
            <label>Custom Input (Optional)</label>
            <textarea
              placeholder="Enter your test input here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input-textarea"
            />
          </div>
  
          <button 
            className={`compile-button ${isCompiling ? 'compiling' : ''}`}
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? 'Compiling...' : 'Compile & Run'}
          </button>
  
          {compilationError && (
            <div className="error-message">
              <h3>Compilation Error</h3>
              <pre>{compilationError}</pre>
            </div>
          )}
  
          {output && (
            <div className="output-section">
              <h3>Output</h3>
              <pre className="output-pre">{output}</pre>
            </div>
          )}
        </div>
  
        
      </div>
      </div>
    </div>
  );
};

export default QuestionDetails;
