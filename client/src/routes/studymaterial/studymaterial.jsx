import React, { useState, useEffect } from 'react';
import axios from 'axios';
import sodium from 'libsodium-wrappers';
import { useNavigate, useParams } from 'react-router-dom';
import MonacoEditor from "@monaco-editor/react";
import './studymaterial.css'

// Code Editor Component (Light Theme Only)
const CodeEditor = ({ defaultValue, language }) => {
  const [code, setCode] = useState(defaultValue);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [editorHeight, setEditorHeight] = useState('300px');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleCompile = async () => {
    if (!code.trim()) {
      setError('Code cannot be empty');
      return;
    }

    setIsCompiling(true);
    setError('');
    setOutput('');

    try {
      const response = await axios.post('http://localhost:5001/skill-sync/compile', {
        language: language || 'c',
        code: code
      });

      if (response.data.error) {
        setError(response.data.error);
      } else {
        setOutput(response.data.output);
      }
    } catch (err) {
      setError('Compilation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setEditorHeight(isExpanded ? '300px' : '500px');
  };

  return (
    <div className="editor-section">
      <div className="editor-header">
        <div className="editor-title">
          <span>Code Editor ({language || 'c'})</span>
        </div>
        <div className="editor-controls">
          <button 
            className="expand-button"
            onClick={toggleExpand}
            title={isExpanded ? 'Collapse editor' : 'Expand editor'}
          >
            {isExpanded ? '↓' : '↑'}
          </button>
          <button 
            className="compile-button"
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? <div className="spinner" /> : 'Compile & Run'}
          </button>
        </div>
      </div>
      
      <MonacoEditor
        height={editorHeight}
        defaultLanguage={language || 'c'}
        value={code}
        onChange={handleEditorChange}
        theme="light"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          automaticLayout: true,
          fontFamily: "'Fira Code', 'Menlo', monospace",
          fontSize: 14,
          padding: { top: 12 },
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2
        }}
      />

      {(output || error) && (
        <div className="output-container">
          <div className="output-header">
            <span className="output-title">
              {error ? 'Compilation Error' : 'Output'}
            </span>
            <div className="output-actions">
              <button 
                className="copy-button"
                onClick={() => {
                  navigator.clipboard.writeText(error || output);
                }}
                title="Copy to clipboard"
              >
                Copy
              </button>
              <button 
                className="clear-button"
                onClick={() => {
                  setOutput('');
                  setError('');
                }}
                title="Clear output"
              >
                Clear
              </button>
            </div>
          </div>
          <div className={`output-content ${error ? 'error' : 'success'}`}>
            {error || output || 'No output'}
          </div>
        </div>
      )}
    </div>
  );
};

// Content display components
const TableDisplay = ({ tableContent }) => {
  if (!tableContent || (!tableContent.headers && !tableContent.rows)) {
    return <div className="table-error">Table data is not in the expected format</div>;
  }

  let headers = tableContent.headers || [];
  let dataRows = tableContent.rows || [];
  
  if (!headers.length && dataRows.length > 0) {
    headers = dataRows[0];
    dataRows = dataRows.slice(1);
  }

  return (
    <div className="table-container">
      {tableContent.caption && (
        <div className="table-caption">{tableContent.caption}</div>
      )}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ImageDisplay = ({ imageContent }) => {
  const imageUrl = imageContent?.url || '/skill-sync/placeholder/400/300';
  
  return (
    <figure className="content-image">
      <img
        src={imageUrl}
        alt={imageContent?.altText || 'Content image'}
        onError={(e) => {
          console.log("Image error, using placeholder");
          e.target.src = '/skill-sync/placeholder/400/300';
        }}
      />
      {imageContent?.caption && (
        <figcaption>{imageContent.caption}</figcaption>
      )}
    </figure>
  );
};

// Subtopic Component to handle individual content blocks
const SubtopicContent = ({ subtopic, language }) => {
  return (
    <div className="subtopic-content">
      {/* Process paragraphs */}
      {subtopic.paragraphs && subtopic.paragraphs.length > 0 && (
        <div className="paragraphs-container">
          {subtopic.paragraphs.map((paragraph, index) => (
            <p key={`paragraph-${index}`} className="content-text">
              {paragraph.content}
            </p>
          ))}
        </div>
      )}
      
      {/* Process code */}
      {subtopic.code && subtopic.code.length > 0 && (
        <div className="code-container">
          {subtopic.code.map((codeSnippet, index) => (
            <CodeEditor
              key={`code-${index}`}
              defaultValue={codeSnippet.code || ""}
              language={codeSnippet.language || language || "c"}
            />
          ))}
        </div>
      )}
      
      {/* Process images */}
      {subtopic.images && subtopic.images.length > 0 && (
        <div className="images-container">
          {subtopic.images.map((image, index) => (
            <ImageDisplay key={`image-${index}`} imageContent={image} />
          ))}
        </div>
      )}
      
      {/* Process tables */}
      {subtopic.tables && subtopic.tables.length > 0 && (
        <div className="tables-container">
          {subtopic.tables.map((table, index) => (
            <TableDisplay key={`table-${index}`} tableContent={table} />
          ))}
        </div>
      )}
    </div>
  );
};

// Topic Card Component (for overview and expanded view)
const TopicCard = ({ topic, language, isSelected, onSelect, selectedAnswers, onOptionSelect, onSubmit, quizResults, topicWithResults }) => {
  if (!topic) return null;
  
  // For expanded view (when topic is selected)
  if (isSelected) {
    return (
      <div className="topic-content">
        <div className="topic-header">
          <h3 className="topic-name">{topic.title}</h3>
          <button className="back-button" onClick={() => onSelect(null)}>
            ← Back to topics
          </button>
        </div>
        
        <div className="topic-content-wrapper">
          {/* Render subtopics if they exist */}
          {topic.subtopics && topic.subtopics.length > 0 ? (
            topic.subtopics.map((subtopic, index) => (
              <div key={`${topic._id}-subtopic-${index}`} className="subtopic">
                <h4>{subtopic.title}</h4>
                <SubtopicContent subtopic={subtopic} language={language} />
              </div>
            ))
          ) : (
            // Fallback for legacy content
            topic.content && (
              <p className="topic-content">{topic.content}</p>
            )
          )}
          
          {/* Render quizzes for this topic */}
          {topic.quizzes && topic.quizzes.length > 0 && (
            <QuizSection 
              quizzes={topic.quizzes} 
              selectedAnswers={selectedAnswers}
              onOptionSelect={onOptionSelect}
              onSubmit={() => onSubmit(topic._id)}
              quizResults={quizResults}
              showResults={topicWithResults === topic._id}
            />
          )}
        </div>
      </div>
    );
  }
  
  // For overview card (when topic is not selected)
  const subtopicCount = topic.subtopics?.length || 0;
  
  return (
    <div className="topic-card-preview" onClick={() => onSelect(topic._id)}>
      <div className="card-header">
        <div className="topic-icon">📝</div>
        <h3>{topic.title}</h3>
      </div>
      <div className="card-body">
        <div className="subtopic-count">
          {subtopicCount} {subtopicCount === 1 ? 'Subtopic' : 'Subtopics'}
        </div>
        <div className="topic-description">
          {topic.description || `Learn all about ${topic.title} with interactive examples and quizzes.`}
        </div>
        <button className="view-button">
          View Content
        </button>
      </div>
    </div>
  );
};

// Quiz components 
const QuizResults = ({ results, totalScore, onPracticeCode }) => {
  if (!results) return null;

  return (
    <div className="quiz-results">
      <div className="results-header">
        <h3>Quiz Results</h3>
        <p className="total-score">Total Score: <span className="score-value">{totalScore}</span> out of {results.length}</p>
      </div>
      <div className="results-list">
        {results.map((result, index) => (
          <div key={index} className={`result-item ${result.mark === 1 ? 'correct' : 'incorrect'}`}>
            <div className="result-question">{result.question}</div>
            <div className="result-answers">
              <div className="user-answer">
                Your answer: <span className={result.mark === 1 ? 'correct-text' : 'incorrect-text'}>
                  {result.user_answer}
                </span>
              </div>
              {result.mark === 0 && (
                <div className="correct-answer">
                  Correct answer: <span className="correct-text">{result.correct_answer}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="button-container">
        <button 
          className="practice-code-button" 
          onClick={onPracticeCode}
        >
          Practice Code
        </button>
      </div>
    </div>
  );
};

const QuizSection = ({ quizzes, selectedAnswers, onOptionSelect, onSubmit, quizResults, showResults }) => {
  if (!quizzes || quizzes.length === 0) {
    return null;
  }

  if (showResults && quizResults) {
    return (
      <QuizResults 
        results={quizResults.results} 
        totalScore={quizResults.totalScore}
        onPracticeCode={() => quizResults.onPracticeCode()} 
      />
    );
  }

  return (
    <div className="topic-quizzes">
      <h3 className="quiz-section-title">Practice Questions</h3>
      {quizzes.map((quiz) => (
        <div key={quiz._id} className="quiz-card">
          <p className="quiz-question">{quiz.question}</p>
          <div className="options-grid">
            {quiz.options.map((option, index) => {
              let buttonClass = "option-button";
              if (selectedAnswers[quiz._id] === option) {
                buttonClass += " selected";
              }
              
              // If we have results and showing them, highlight correct answers
              if (showResults && quizResults) {
                const result = quizResults.results.find(r => r.question === quiz.question);
                if (result && option === result.correct_answer) {
                  buttonClass += " correct-answer";
                }
              }
              
              return (
                <button 
                  key={index} 
                  className={buttonClass}
                  onClick={() => onOptionSelect(quiz._id, option)}
                  disabled={showResults}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      
      {!showResults && (
        <div className="button-container">
          <button 
            className="submit-button" 
            onClick={onSubmit}
          >
            Submit Answers
          </button>
        </div>
      )}
    </div>
  );
};

// Main StudyMaterial Component
const StudyMaterial = () => {
  const { courseId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [learningData, setLearningData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [levelId, setLevelId] = useState(null);
  const [programId, setProgramId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const navigate = useNavigate();
  
  // New state for selecting topic and quiz results
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [topicWithResults, setTopicWithResults] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Initialize sodium
        await sodium.ready;

        // Get and decrypt token
        const encryptedData = sessionStorage.getItem("token");
        if (!encryptedData) {
          throw new Error("No token found in sessionStorage");
        }

        const { encrypted, nonce } = JSON.parse(encryptedData);
        const cryptoKey = sodium.from_base64(import.meta.env.VITE_SECRET_KEY);
        const decrypted = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(encrypted),
          sodium.from_base64(nonce),
          cryptoKey
        );

        const token = new TextDecoder().decode(decrypted);
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        const { userDetails } = decodedPayload;

        if (!userDetails?.student_id) {
          throw new Error("Student ID not found in token");
        }
        setStudentId(userDetails.student_id);

        // Fetch study material data
        const response = await axios.get(
          `http://localhost:5001/skill-sync/studymaterial/${courseId}/${userDetails.student_id}`,
          {
            timeout: 5000 // Set timeout to 5 seconds
          }
        );
        
        const newLevelId = response.data.data?.nextLevel?.level_id 
          ?? response.data.data?.currentLevel?.level_id 
          ?? "No level_id found";
          
        setLearningData(response.data.data);
        setLevelId(newLevelId);
        setProgramId(response.data.data?.currentLevel?.program_id);

      } catch (err) {
        console.error('Error:', err);
        setError(err.message || 'Failed to fetch learning material');
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const handleOptionSelect = (quizId, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [quizId]: option
    }));
  };

  const handleSubmit = async (topicId) => {
    try {
      // Find the specific topic
      const topic = learningData.currentLevel.topics.find(t => t._id === topicId);
      
      if (!topic || !topic.quizzes || topic.quizzes.length === 0) {
        setError('No quizzes found to submit for this topic');
        return;
      }
      
      const topicQuizzes = topic.quizzes;
      
      const payload = {
        student_id: studentId,
        levelId: levelId,
        programId: programId,
        answers: topicQuizzes.map(quiz => ({
          quiz_id: quiz._id,
          question: quiz.question,
          user_answer: selectedAnswers[quiz._id] || "",
          correct_answer: quiz.answer
        }))
      };
      
      const response = await axios.post('http://localhost:5001/skill-sync/submit-quiz', payload);
      
      // Set quiz results and topic with results
      setQuizResults({
        ...response.data,
        onPracticeCode: () => navigate(`/practicequestions/${levelId}`)
      });
      setTopicWithResults(topicId);
      
      // Automatically scroll to the results
      setTimeout(() => {
        const resultsElement = document.querySelector('.quiz-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error submitting answers:', error);
      setError('Failed to submit answers: ' + (error.response?.data?.message || error.message));
    }
  };
  
  if (isLoading) {
    return <div className="study-container loading">Loading...</div>;
  }
  
  if (error) {
    return <div className="study-container error-message">{error}</div>;
  }

  if (!learningData) {
    return <div className="study-container error-message">No learning data available</div>;
  }

  // Get selected topic if any
  const selectedTopic = selectedTopicId 
    ? learningData.currentLevel.topics.find(t => t._id === selectedTopicId)
    : null;

  return (
    <div className="study-container">
      {/* Current Level Info */}
      {learningData.currentLevel && (
        <div className="current-level-card">
          <h2>{learningData.currentLevel.levelName}</h2>
        </div>
      )}

      {/* If a topic is selected, show only that topic's content */}
      {selectedTopic ? (
        <TopicCard 
          topic={selectedTopic}
          language={learningData.currentLevel.ProgramName?.toLowerCase()}
          isSelected={true}
          onSelect={setSelectedTopicId}
          selectedAnswers={selectedAnswers}
          onOptionSelect={handleOptionSelect}
          onSubmit={handleSubmit}
          quizResults={quizResults}
          topicWithResults={topicWithResults}
        />
      ) : (
        // Otherwise, show the grid of topic cards
        <>
          <h2 className="section-title">Topics</h2>
          <div className="topics-overview">
            {learningData.currentLevel?.topics?.length > 0 ? (
              learningData.currentLevel.topics.map((topic) => (
                <TopicCard 
                  key={topic._id} 
                  topic={topic}
                  language={learningData.currentLevel.ProgramName?.toLowerCase()}
                  isSelected={false}
                  onSelect={setSelectedTopicId}
                />
              ))
            ) : (
              <p className="no-content">No topics available for this level</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudyMaterial;