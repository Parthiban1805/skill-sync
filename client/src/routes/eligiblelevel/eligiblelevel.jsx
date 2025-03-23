import axios from "axios";
import sodium from 'libsodium-wrappers';
import React, { useEffect, useState } from "react";
import { FaGraduationCap, FaSearch, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import "./eligiblelevel.css";

const EligibleLevelsPage = () => {
  const [eligibleLevels, setEligibleLevels] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userId, setUserId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);

  // Fetch user token and details
  useEffect(() => {
    const fetchUserData = async () => {
      await sodium.ready;
  
      const encryptedData = sessionStorage.getItem("token");
      if (!encryptedData) {
        console.error("❌ No token found in sessionStorage!");
        return;
      }
  
      try {
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
  
        if (!userDetails) {
          console.error("❌ userDetails not found in token!");
          return;
        }
  
        setUserDetails(userDetails);
        const { student_id, userId } = userDetails;
        setStudentId(student_id);
        setUserId(userId);
      } catch (error) {
        console.error("❌ Token decryption failed:", error);
      }
    };
  
    fetchUserData();
  }, []);

  // Fetch eligible levels when studentId is available
  useEffect(() => {
    const fetchEligibleLevels = async () => {
      if (!studentId) return;
      
      try {
        const response = await axios.post(
          `http://localhost:5001/skill-sync/student/${studentId}/calculate-next-levels`
        );
        setEligibleLevels(response.data.eligibleLevels || []);
      } catch (error) {
        console.error("Error fetching eligible levels:", error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchEligibleLevels();
    }
  }, [studentId]);

  // Register for level and close modal
  const handleRegister = async () => {
    if (!selectedLevel) return;
    
    setRegistrationInProgress(true);
    
    try {
      await axios.post('http://localhost:5001/skill-sync/move-to-registered', {
        studentId: userDetails.student_id,
        programName: selectedLevel.ProgramName,
        levelNo: selectedLevel.nextLevelNo,
      });

      // Remove the level from eligible levels
      setEligibleLevels((prevLevels) =>
        prevLevels.filter(
          (level) =>
            level.ProgramName !== selectedLevel.ProgramName || 
            level.levelNo !== selectedLevel.levelNo
        )
      );

      // Close the modal
      setSelectedLevel(null);
    } catch (error) {
      console.error('Error moving program to registered:', error);
    } finally {
      setRegistrationInProgress(false);
    }
  };
  
  // Clear search function
  const clearSearch = () => {
    setSearch("");
  };

  // Filter levels based on search
  const filteredLevels = eligibleLevels.filter(
    (level) =>
      level.ProgramName.toLowerCase().includes(search.toLowerCase()) ||
      (level.currentLevelName &&
        level.currentLevelName.toLowerCase().includes(search.toLowerCase())) ||
      (level.nextLevelName &&
        level.nextLevelName.toLowerCase().includes(search.toLowerCase()))
  );

  // Render loading state
  if (loading) {
    return (
      <div className="course-table-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading eligible levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="course-table-page">
      <div className="course-table-header">
        <h2 className="course-title">Your Eligible Levels</h2>
        <p>These are the next levels you're eligible to register for based on your completed courses.</p>
      </div>
      
      {/* Enhanced search box with icon */}
      <div className="search-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search programs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button 
            className="search-reset" 
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <FaTimes size={14} />
          </button>
        )}
      </div>

      {filteredLevels.length > 0 ? (
        <table className="course-table">
          <thead>
            <tr>
              <th className="course-th">S.No</th>
              <th className="course-th">Program Name</th>
              <th className="course-th">Next Level</th>
              <th className="course-th">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLevels.map((level, index) => (
              <tr key={index}>
                <td className="course-td">{index + 1}</td>
                <td className="course-td">{level.ProgramName}</td>
                <td className="course-td">{level.nextLevelName || "Completed All Levels"}</td>
                <td className="course-td">
                  <button
                    className="course-view-button"
                    onClick={() => setSelectedLevel(level)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <FaGraduationCap size={32} />
          <h3>No eligible levels found</h3>
          <p>{search ? 'Try a different search term' : 'You have no eligible next levels at this time'}</p>
          <Link to="/my-courses" className="empty-state-btn">Go to My Courses</Link>
        </div>
      )}

      {/* Modal Component */}
      {selectedLevel && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Register for Next Level</h3>
            <p><strong>Program:</strong> {selectedLevel.ProgramName}</p>
            <p style={{display: 'none'}}><strong>Next Level ID:</strong> {selectedLevel.nextLevelNo || "N/A"}</p>
            <p><strong>Next Level:</strong> {selectedLevel.nextLevelName || "Completed All Levels"}</p>
            
            {selectedLevel.nextLevelDescription && (
              <p><strong>Description:</strong> {selectedLevel.nextLevelDescription}</p>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="close-modal-button"
                onClick={handleRegister}
                disabled={registrationInProgress}
              >
                {registrationInProgress ? 'Registering...' : 'Register'}
              </button>
              <button 
                className="close-modal-close-button"
                onClick={() => setSelectedLevel(null)}
                disabled={registrationInProgress}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EligibleLevelsPage;