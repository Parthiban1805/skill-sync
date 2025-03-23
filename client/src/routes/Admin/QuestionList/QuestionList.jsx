import axios from "axios";
import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { Link } from "react-router-dom";
import './QuestionList.css';

const QuestionList = () => {
    const [questions, setQuestions] = useState([]);
    const [programs, setPrograms] = useState(["C", "C++", "Java", "Python", "MySQL"]);
    const [selectedProgram, setSelectedProgram] = useState(programs[0]);
    const [levels, setLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            console.log("Fetching questions for program:", selectedProgram);
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5001/skill-sync/questions?program=${selectedProgram}&level=${selectedLevel}`);
                setQuestions(response.data);
                setError("");
            } catch (err) {
                setError("Failed to fetch questions. Please try again or contact support.");
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };
        
        if (selectedLevel) {
            fetchQuestions();
        }
    }, [selectedProgram, selectedLevel]);

    useEffect(() => {
        const fetchLevels = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5001/skill-sync/levels?program=${selectedProgram}`);
                setLevels(response.data);
                setSelectedLevel(response.data[0]?.LevelNo || null);
                setError("");
            } catch (err) {
                setError("Failed to fetch levels. Please try again or contact support.");
                setLevels([]);
                setSelectedLevel(null);
            } finally {
                setLoading(false);
            }
        };
        
        fetchLevels();
    }, [selectedProgram]);

    const handleProgramChange = (program) => {
        console.log("Program selected:", program);
        setSelectedProgram(program.trim());
    };
   
    const handleLevelChange = (level) => {
        setSelectedLevel(level);
    };

    return (
        <div className="question-list-container">
            <div className="list-header">
                <h1>Question List</h1>
                <Link to="/add-question" className="add-question-link">
                    <FiPlus size={16} />
                    Add New Question
                </Link>
            </div>
           
            <div className="filter-container">
                <span className="filter-label">Programming Language</span>
                <div className="program-toggle">
                    {programs.map((program) => (
                        <button
                            key={program}
                            className={`program-button ${selectedProgram === program ? 'active' : ''}`}
                            onClick={() => handleProgramChange(program)}
                        >
                            {program}
                        </button>
                    ))}
                </div>
                
                {levels.length > 0 && (
                    <>
                        <span className="filter-label">Difficulty Level</span>
                        <div className="level-toggle">
                            {levels.map((level) => (
                                <button
                                    key={level.LevelNo}
                                    className={`level-button ${selectedLevel === level.LevelNo ? 'active' : ''}`}
                                    onClick={() => handleLevelChange(level.LevelNo)}
                                >
                                    Level {level.LevelNo}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
            
            {error && <div className="error-message">{error}</div>}

            <div className="questions-container">
                <div className="questions-header">
                    <div className="column-id">No.</div>
                    <div className="column-title">Question Title</div>
                </div>
                
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                ) : questions.length > 0 ? (
                    <ul className="question-list">
                        {questions.map((question, index) => (
                            <li key={question._id} className="question-item">
                                <span className="question-number">{index + 1}.</span>
                                <Link to={`/question-list/compiler/${question._id}`} className="question-title-link">
                                    {question.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="empty-state">
                        <p>No questions found for this selection.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionList;