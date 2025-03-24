import MonacoEditor from "@monaco-editor/react";
import axios from "axios";
import sodium from 'libsodium-wrappers';
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import './QuestionDetails.css';

const QuestionDetails = () => {
  const { id } = useParams();
  console.log("Received id in QuestionDetails:", id);

  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(1);
  const [question1Code, setQuestion1Code] = useState("");
  const [question2Code, setQuestion2Code] = useState("");

  const [question1, setQuestion1] = useState(null);
  const [question2, setQuestion2] = useState(null);
  const [question1TestResults, setQuestion1TestResults] = useState([]);
  const [question2TestResults, setQuestion2TestResults] = useState([]);
  const [question1HasCompiled, setQuestion1HasCompiled] = useState(false);
  const [question2HasCompiled, setQuestion2HasCompiled] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [question, setQuestion] = useState(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [compilationError, setCompilationError] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [userId, setuserId] = useState(null);
  const [studentId, setstudentId] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompiledOnce, setHasCompiledOnce] = useState(false);
  const [tabFocusWarnings, setTabFocusWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const editorRef = useRef(null);
  const maxTabWarnings = 3; // Maximum number of tab switch warnings before auto-submit
 
  // Handle when editor is mounted
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Disable context menu in the editor
    editor.onContextMenu(e => {
      e.event.preventDefault();
      e.event.stopPropagation();
      return false;
    });

    // Disable keyboard shortcuts for copy/cut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      console.log("Copy operation blocked");
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
      console.log("Cut operation blocked");
    });

    // Disable keyboard shortcuts for paste (for consistency)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      console.log("Paste operation allowed but monitored");
    });
  };

  // Track tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Tab focus lost");
        const newWarningCount = tabFocusWarnings + 1;
        setTabFocusWarnings(newWarningCount);
        setShowTabWarning(true);
        
        if (newWarningCount >= maxTabWarnings) {
          console.log("Maximum tab switches reached, auto-submitting...");
          handleFinishNow();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Track beforeunload to handle page closing
    const handleBeforeUnload = (e) => {
      // Auto save before closing
      saveCurrentCode();
      
      // Standard way to show a confirmation dialog before leaving
      e.preventDefault();
      e.returnValue = "Changes you made may not be saved. Are you sure you want to leave?";
      return e.returnValue;
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [tabFocusWarnings]);

  // Function to save current code based on active tab
  const saveCurrentCode = () => {
    if (activeTab === 1) {
      setQuestion1Code(code);
    } else {
      setQuestion2Code(code);
    }
  };

  // Implement anti-copy behavior across the page
  useEffect(() => {
    const preventCopyPaste = (e) => {
      if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', 'Copying is not allowed');
        }
        e.preventDefault();
        console.log("Copy operation prevented");
      }
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent text selection
    const preventSelection = (e) => {
      if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT' && !e.target.closest('.monaco-editor')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventSelection);

    return () => {
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelection);
    };
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      await sodium.ready;
  
      const encryptedData = sessionStorage.getItem("token");
      if (!encryptedData) {
        console.error("❌ No token found in sessionStorage!");
        return;
      }
  
      try {
        const { encrypted, nonce } = JSON.parse(encryptedData);
        console.log("🔐 Encrypted Token:", encrypted);
        console.log("🔑 Nonce:", nonce);
  
        const cryptoKey = sodium.from_base64(import.meta.env.VITE_SECRET_KEY);
  
        const decrypted = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(encrypted),
          sodium.from_base64(nonce),
          cryptoKey
        );
        console.log("🛠️ Decrypted Token:", decrypted);
  
        const token = new TextDecoder().decode(decrypted);
        console.log("📝 Decoded Token:", token);
  
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        console.log("💼 Decoded Payload:", decodedPayload);
  
        const { userDetails } = decodedPayload;
        console.log("👥 User Details:", userDetails);
  
        if (!userDetails) {
          console.error("❌ userDetails not found in token!");
          return;
        }
  
        setUserDetails(userDetails);
  
        const { student_id, userId } = userDetails;
        setstudentId(student_id);
        setuserId(userId);
    
      } catch (error) {
        console.error("❌ Token decryption failed:", error);
      }
    };
  
    fetchAllData();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`https://assessly-server.weacttech.com/skill-sync/questions/${id}`);
        
        if (response.data.question1) {
          setQuestion1(response.data.question1);
          if (response.data.question1.codeTemplate) {
            setQuestion1Code(response.data.question1.codeTemplate);
          }
        }
        
        if (response.data.question2) {
          setQuestion2(response.data.question2);
          if (response.data.question2.codeTemplate) {
            setQuestion2Code(response.data.question2.codeTemplate);
          }
        }

        // Set initial code and language for the first question
        if (response.data.question1?.ProgramName) {
          const programLanguageMap = {
            Python: "python",
            C: "c",
            "C++": "cpp",
            Java: "java",
          };
          const selectedLanguage = programLanguageMap[response.data.question1.ProgramName] || "python";
          setLanguage(selectedLanguage);
          setCode(response.data.question1.codeTemplate || "");
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("Failed to fetch the questions. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [id]);

  const handleTabChange = (tabNumber) => {
    setActiveTab(tabNumber);
    
    // Save current tab's code before switching
    if (activeTab === 1) {
      setQuestion1Code(code);
    } else {
      setQuestion2Code(code);
    }

    // Load the selected tab's code and test results
    if (tabNumber === 1) {
      setCode(question1Code);
      setTestResults(question1TestResults);
      setHasCompiledOnce(question1HasCompiled);
    } else {
      setCode(question2Code);
      setTestResults(question2TestResults);
      setHasCompiledOnce(question2HasCompiled);
    }

    // Reset output and compilation error
    setOutput("");
    setCompilationError("");
  };

  const handleCompile = async () => {
    if (!code.trim()) {
      setCompilationError("Code cannot be empty.");
      return;
    }

    setIsCompiling(true);
    setCompilationError("");

    try {
      let results = [];
      const currentQuestion = activeTab === 1 ? question1 : question2;

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
        currentQuestion.testCases.map(async (testCase) => {
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
      
      if (activeTab === 1) {
        setQuestion1Code(code);
        setQuestion1TestResults(results);
        setQuestion1HasCompiled(true);
      } else {
        setQuestion2Code(code);
        setQuestion2TestResults(results);
        setQuestion2HasCompiled(true);
      }
      
      setTestResults(results);
      setHasCompiledOnce(true);

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

  const handleFinishNow = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    setIsSubmitting(true);
    try {
      // Save current code before submitting
      saveCurrentCode();
      
      // Prepare submission data for both questions
      const questions = [
        {
          id: question1?._id,
          title: question1?.title,
          code: question1Code,
          testResults: question1TestResults
        },
        {
          id: question2?._id,
          title: question2?.title,
          code: question2Code,
          testResults: question2TestResults
        }
      ].filter(q => q.id); // Only include questions that exist
  
      console.log("📤 Sending questions:", JSON.stringify(questions, null, 2));
  
      // Validate that we have the required data
      if (!studentId) {
        throw new Error("Student ID is missing");
      }
  
      if (questions.length === 0) {
        throw new Error("No valid questions to submit");
      }
  
      // Check if all required questions have been compiled at least once
      const allQuestionsCompiled = questions.every((_, index) => 
        index === 0 ? question1HasCompiled : question2HasCompiled
      );
  
      // Allow submission on tab switching warnings even if not compiled
      if (!allQuestionsCompiled && tabFocusWarnings < maxTabWarnings) {
        throw new Error("Please compile and test all questions before submitting");
      }
  
      // Make the submission request
      const response = await axios.post("https://assessly-server.weacttech.com/skill-sync/submit", {
        id,
        studentId,
        questions,
        autoSubmitted: tabFocusWarnings >= maxTabWarnings,
      });
      
      // Show success modal
      setIsSubmitModalOpen(true);
  
    } catch (error) {
      console.error("Error submitting questions:", error);
      // Show error to user
      alert(error.message || "Failed to submit questions. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setIsSubmitModalOpen(false);
    navigate("/dashboard"); // Navigate to the dashboard
  };

  const closeTabWarning = () => {
    setShowTabWarning(false);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading questions...</p>
      </div>
    );
  }
  if (error) return <div className="error-container">{error}</div>;
  const currentQuestion = activeTab === 1 ? question1 : question2;

  return (
    <div className="question-details-container">
      {/* Tab Warning Modal */}
      {showTabWarning && (
        <div className="tab-warning-modal-overlay">
          <div className="tab-warning-modal-content">
            <div className="tab-warning-modal-header">
              <h2 className="tab-warning-modal-title">Warning: Tab Switch Detected</h2>
              <p className="tab-warning-modal-description">
                Switching tabs is not allowed during the test. This action has been recorded.
                You have {maxTabWarnings - tabFocusWarnings} warnings left before automatic submission.
              </p>
            </div>
            <div className="tab-warning-modal-footer">
              <button className="tab-warning-modal-close-button" onClick={closeTabWarning}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="question-details-left-container">
      <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => handleTabChange(1)}
          >
            1
          </button>
          <button 
            className={`tab-button ${activeTab === 2 ? 'active' : ''}`}
            onClick={() => handleTabChange(2)}
          >
            2
          </button>
        </div>
        <div className="question-description-panel">
          <div className="question-header">
            <h1>{currentQuestion.title}</h1>
          </div>
          <div className="question-description">
            <p>{currentQuestion.description}</p>
          </div>
          <div className="question-constraints">
            <p>Constraints: {currentQuestion.constraints}</p>
          </div>
          <div className="question-constraints">
            <p>Input Format: {currentQuestion.inputFormat}</p>
          </div>
          <div className="question-constraints">
            <p>Output Format: {currentQuestion.outputFormat}</p>
          </div>
        </div>
        <div className="test-cases-section">
          <h3>Test Cases</h3>
          <div className="test-case-results">
            {currentQuestion.testCases.map((testCase, index) => (
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
              disabled
            >
              <option value={language}>
                {language.charAt(0).toUpperCase() + language.slice(1)}
              </option>
            </select>
            <div className="warning-indicator">
              {tabFocusWarnings > 0 && (
                <span className="warning-badge">
                  Tab Switches: {tabFocusWarnings}/{maxTabWarnings}
                </span>
              )}
            </div>
            <button 
              className="finish-now-button" 
              onClick={handleFinishNow}
              disabled={isSubmitting || (!hasCompiledOnce && tabFocusWarnings < maxTabWarnings)} 
              >
              {isSubmitting ? "Submitting..." : "Finish Now"}
            </button>
          </div>
  
          <div className="monaco-editor-container">
            <MonacoEditor
              height="50vh"
              language={language}
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
                lineNumbers: "on",
                folding: true,
                bracketPairColorization: true,
                contextmenu: false, // Disable context menu in editor
                // Disable cursor blinking to indicate restricted mode
                cursorBlinking: "solid",
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

      {/* Submission Modal */}
      {isSubmitModalOpen && (
        <div className="finish-now-button-modal-overlay" onClick={() => setIsSubmitModalOpen(false)}>
        <div className="finish-now-button-modal-content" onClick={e => e.stopPropagation()}>
          <div className="finish-now-button-modal-header">
            <h2 className="finish-now-button-modal-title">Test Submitted Successfully!</h2>
            <p className="finish-now-button-modal-description">
              Your code has been submitted and your progress has been saved.
            </p>
          </div>
          <div className="finish-now-button-modal-footer">
            <button className="finish-now-button-modal-close-button" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default QuestionDetails;