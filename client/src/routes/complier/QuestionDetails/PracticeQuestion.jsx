import MonacoEditor from "@monaco-editor/react";
import axios from "axios";
import sodium from 'libsodium-wrappers';
import React, { useEffect, useState, useRef } from "react";
import './QuestionDetails.css';
import { useNavigate, useLocation } from "react-router-dom";
import { useParams } from 'react-router-dom';

const PracticeQuestion = () => {
  const { id } = useParams();
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
  
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTabSwitchWarningOpen, setIsTabSwitchWarningOpen] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const editorRef = useRef(null);
  const MAX_TAB_SWITCHES = 3;

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // Tab visibility and beforeunload handlers remain for tracking tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        
        if (newCount < MAX_TAB_SWITCHES) {
          // Show warning when user returns
          setTimeout(() => {
            setIsTabSwitchWarningOpen(true);
          }, 500);
        } else {
          // Auto-submit after max switches
          setIsAutoSubmitting(true);
          handleFinishNow(true);
        }
      }
    };
    
    // Confirm before leaving the page
    const handleBeforeUnload = (e) => {
      const message = "Are you sure you want to leave? Your progress will be saved and the test may be automatically submitted.";
      e.returnValue = message;
      return message;
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tabSwitchCount]);

  // Fetch user data from token in sessionStorage
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

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`https://assessly-server.weacttech.com/skill-sync/practice-questions/${id}`);
        
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

  const handleFinishNow = async (autoSubmitted = false) => {
    setIsSubmitting(true);
    try {
      const questions = [
        {
          id: question1?._id || '',
          title: question1?.title || '',
          code: question1Code || '',
          testResults: question1TestResults || []
        },
        {
          id: question2?._id || '',
          title: question2?.title || '',
          code: question2Code || '',
          testResults: question2TestResults || []
        }
      ].filter(q => q.id); // Only include questions that exist
  
      // Ensure studentId exists
      if (!studentId) {
        console.error("Missing studentId for submission");
        alert("User information is missing. Please try logging in again.");
        setIsSubmitting(false);
        return;
      }
  
      // For auto-submissions, we don't need to enforce the compile requirement
      const allQuestionsCompiled = autoSubmitted ? true : 
        (question1 ? question1HasCompiled : true) && 
        (question2 ? question2HasCompiled : true);
  
      if (!allQuestionsCompiled && !autoSubmitted) {
        alert("Please compile and test all questions before submitting");
        setIsSubmitting(false);
        return;
      }
  
      // Log the exact payload we're sending for debugging
      console.log("Submission payload:", {
        id,
        studentId,
        questions,
        autoSubmitted
      });
  
      // Make the submission request with auto-submission flag
      const response = await axios.post("https://assessly-server.weacttech.com/skill-sync/practice-submit", {
        id,
        studentId,
        questions,
        autoSubmitted
      });
  
      console.log("Submission response:", response.data);
      
      // Show success modal with appropriate message
      setIsAutoSubmitting(autoSubmitted);
      setIsSubmitModalOpen(true);
  
    } catch (error) {
      console.error("Error submitting questions:", error);
      
      // Get more detailed error information
      const errorMsg = error.response?.data?.message || 
                      error.message || 
                      "Failed to submit questions. Please try again.";
      
      // For auto-submission, we should still show the modal but with an error message
      if (autoSubmitted) {
        setIsAutoSubmitting(true);
        setIsSubmitModalOpen(true);
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setIsSubmitModalOpen(false);
    navigate("/dashboard"); // Navigate to the dashboard
  };
  
  const closeTabSwitchWarning = () => {
    setIsTabSwitchWarningOpen(false);
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
      {/* Tab Switch Indicator */}
      {tabSwitchCount > 0 && (
        <div className="tab-switch-indicator">
          Tab Switches: {tabSwitchCount}/{MAX_TAB_SWITCHES}
        </div>
      )}
      
      {/* Tab Switch Warning Modal */}
      {isTabSwitchWarningOpen && (
        <>
          <div className="warning-overlay" onClick={closeTabSwitchWarning}></div>
          <div className="tab-switch-warning">
            <h3 className="warning-title">Warning: Tab Switch Detected</h3>
            <p className="warning-message">
              You have switched tabs or windows {tabSwitchCount} time{tabSwitchCount !== 1 ? 's' : ''}. 
              After {MAX_TAB_SWITCHES} switches, your test will be automatically submitted.
            </p>
            <button className="warning-button" onClick={closeTabSwitchWarning}>
              I Understand
            </button>
          </div>
        </>
      )}
      
      {/* Left Panel */}
      <div className="question-details-left-container">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => handleTabChange(1)}
          >
            Question 1
          </button>
          <button 
            className={`tab-button ${activeTab === 2 ? 'active' : ''}`}
            onClick={() => handleTabChange(2)}
          >
            Question 2
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
            <button 
              className="finish-now-button" 
              onClick={() => handleFinishNow(false)}
              disabled={isSubmitting || !hasCompiledOnce} 
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
                bracketPairColorization: true
                // Removed all options that disable copy/paste functionality
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

      {isSubmitModalOpen && (
        <div className="finish-now-button-modal-overlay" onClick={() => setIsSubmitModalOpen(false)}>
          <div className="finish-now-button-modal-content" onClick={e => e.stopPropagation()}>
            <div className="finish-now-button-modal-header">
              <h2 className="finish-now-button-modal-title">
                {isAutoSubmitting ? "Test Automatically Submitted" : "Test Submitted"}
              </h2>
              <p className="finish-now-button-modal-description">
                {isAutoSubmitting 
                  ? "Your test was automatically submitted due to multiple tab switches. Your progress has been saved where possible."
                  : "Your code has been submitted and your progress has been saved."}
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

export default PracticeQuestion;