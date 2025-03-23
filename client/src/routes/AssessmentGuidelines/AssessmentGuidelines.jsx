import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AssessmentGuidelines.css';

const AssessmentGuidelines = () => {
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5); // 5 second countdown for demo purposes
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        // Start countdown timer only after user has agreed to proceed
        if (agreedToTerms && timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (agreedToTerms && timeLeft === 0) {
            navigate(`/assessment/${id}`);
        }
    }, [agreedToTerms, timeLeft, id, navigate]);

    const handleAgree = () => {
        setAgreedToTerms(true);
    };

    return (
        <div className="assessment-guidelines-container">
        <div className="guidelines-card">
            <div className="guidelines-header">
            <h1>Assessment Guidelines</h1>
            <div className="warning-icon">⚠️</div>
            </div>
            
            <div className="guidelines-content">
            <h2>Important Information</h2>
            
            <div className="guideline-section">
                <h3>Time Limit</h3>
                <p>You have <strong>1 hour</strong> to complete this assessment. The timer will start once you proceed.</p>
            </div>
            
            <div className="guideline-section">
                <h3>Assessment Rules</h3>
                <ul>
                <li><strong>No tab switching</strong> - Switching browser tabs or windows is strictly prohibited.</li>
                <li><strong>No copy-paste</strong> - Copy and paste functionality has been disabled.</li>
                <li><strong>No assistance</strong> - Using external resources, communication tools, or seeking help from others is not allowed.</li>
                <li><strong>No screenshots</strong> - Taking screenshots of the questions is prohibited.</li>
                <li><strong>Automatic submission</strong> - Your test will be automatically submitted after 3 tab switches or when the time expires.</li>
                </ul>
            </div>
            
            <div className="guideline-section">
                <h3>Consequences of Malpractice</h3>
                <p>Any violation of these rules may result in:</p>
                <ul>
                <li>Immediate termination of your assessment</li>
                <li>Disqualification from the current and future assessments</li>
                <li>Reporting to your educational institution or employer</li>
                </ul>
            </div>
            
            <div className="guideline-section">
                <h3>Technical Requirements</h3>
                <p>Ensure you have:</p>
                <ul>
                <li>A stable internet connection</li>
                <li>A modern browser (Chrome, Firefox, Edge, or Safari)</li>
                <li>Disabled any browser extensions that might interfere with the test</li>
                </ul>
            </div>
            
            <div className="guideline-section">
                <h3>Before You Begin</h3>
                <p>We recommend:</p>
                <ul>
                <li>Using the restroom before starting</li>
                <li>Clearing your desk of any notes, books, or electronic devices</li>
                <li>Finding a quiet place where you won't be disturbed</li>
                <li>Closing all other applications on your device</li>
                </ul>
            </div>
            </div>
            
            {!agreedToTerms ? (
            <div className="agreement-section">
                <label className="agreement-checkbox">
                <input 
                    type="checkbox" 
                    checked={agreedToTerms} 
                    onChange={() => setAgreedToTerms(!agreedToTerms)} 
                />
                I have read and agree to follow all the guidelines above.
                </label>
                <button 
                className="proceed-button" 
                disabled={!agreedToTerms} 
                onClick={handleAgree}
                >
                Proceed to Assessment
                </button>
            </div>
            ) : (
            <div className="countdown-section">
                <p>Your assessment will begin in:</p>
                <div className="countdown-timer">{timeLeft}</div>
                <p>Please get ready...</p>
            </div>
            )}
        </div>
        </div>
    );
};

export default AssessmentGuidelines;