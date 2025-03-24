import sodium from 'libsodium-wrappers';
import React, { useEffect, useState } from 'react';
import { FaBookOpen, FaSearch, FaTimes, FaUsers } from "react-icons/fa";
import { Link } from 'react-router-dom';
import C_plus from '../../assets/C++.jpeg';
import C from '../../assets/C.png';
import java from '../../assets/java.png';
import python from '../../assets/python.png';
import Sql from '../../assets/SQl.png';
import './mycourse.css';

const MyCourse = () => {
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [userId, setUserId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Analytics data (will be calculated based on user courses)
  const [analytics, setAnalytics] = useState({
    coursesInProgress: 0,
    coursesCompleted: 0,
    totalProgress: 0,
    lastActivity: '2 days ago'
  });

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
  
    fetchAllData();
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return;
      
      try {
        const response = await fetch(`https://assessly-server.weacttech.com/skill-sync/my-course/${studentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        
        setRegisteredCourses(data || []);
        
        // Calculate analytics based on registered courses
        const inProgress = data.filter(course => course.status === "In Progress" || course.statuslevel === "not-completed").length;
        const completed = data.filter(course => course.status === "Completed" || course.statuslevel === "completed").length;
        
        // Calculate average progress across all courses
        const totalProgressSum = data.reduce((sum, course) => {
          const progress = calculateProgress(course);
          return sum + progress;
        }, 0);
        
        const avgProgress = data.length > 0 ? Math.round(totalProgressSum / data.length) : 0;
        
        setAnalytics({
          coursesInProgress: inProgress,
          coursesCompleted: completed,
          totalProgress: avgProgress,
          lastActivity: '2 days ago' // Placeholder - would be calculated from actual data
        });
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const allCourses = [
    { name: 'Python', img: python },
    { name: 'Java', img: java },
    { name: 'C++', img: C_plus },
    { name: 'C', img: C },
    { name: 'MySQL', img: Sql },
  ];

  // Function to calculate progress for a course
  const calculateProgress = (course) => {
    // If we don't have course information, return 0
    if (!course) {
      return 0;
    }
    
    // If the course already has a calculated progress value, use that
    if (typeof course.progress === 'number') {
      return course.progress;
    }
    
    // If the course has program_id with noOfLevels, use that
    if (course.program_id && course.program_id.noOfLevels && course.levelNo) {
      return Math.round((course.levelNo / course.program_id.noOfLevels) * 100);
    }
    
    // For courses where we don't have level data, return 0 or a sensible default
    return 0;
  };

  // Function to get the status text
  const getStatusText = (course) => {
    if (!course || !course.program_id) {
      return "In Progress";
    }
    
    const totalLevels = course.program_id.noOfLevels || 5;
    const currentLevel = course.levelNo || 1;
    const statusText = course.statuslevel === "completed" || course.status === "Completed" 
      ? "completed" 
      : "in progress";
      
    return `Level ${currentLevel}/${totalLevels} ${statusText}`;
  };

  // Prepare the ongoing courses data
  const ongoingCourses = registeredCourses.map((registered) => {
    const courseData = allCourses.find((course) => course.name === registered.ProgramName);
    
    return {
      ...registered,
      img: courseData?.img || python,
      program_id: registered.program_id || { _id: registered.program_id?._id },
      progress: calculateProgress(registered),
      levelNo: registered.levelNo || 1,
      status: registered.status || (registered.statuslevel === "completed" ? "Completed" : "In Progress")
    };
  });
  
  // Filter courses based on search
  const filteredCourses = ongoingCourses.filter(course => 
    course.ProgramName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  // Clear search function
  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="dashboard-container">
      {/* Registered Courses with Progress Section */}
      <div className="continuing-courses-section">
        <h2>Your Learning Progress</h2>
        
        {/* Enhanced search input */}
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-reset" 
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your courses...</p>
          </div>
        ) : (
          <div className="continuing-course-cards">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course, index) => {
                const progressPercentage = course.progress;
                const statusText = getStatusText(course);
                
                return (
                  <div key={index} className="dashboard-ongoing-course-container">
                    <h3>{course.ProgramName}</h3>
                    <p data-status={course.status}>{statusText}</p>
                    <div className="dashboard-ongoing-course-progress">
                      <div
                        className="dashboard-ongoing-course-progress-bar"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <Link to={`/courses/${course.program_id._id}`} className="dashboard-ongoing-course-start-btn">
                      CONTINUE
                    </Link>
                  </div>
                );
              })) : (
              <div className="empty-state">
                <FaBookOpen size={32} />
                <h3>No courses found</h3>
                <p>{searchQuery ? 'Try a different search term' : 'You haven\'t registered for any courses yet'}</p>
                <Link to="/programs" className="empty-state-btn">Browse Courses</Link>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Additional Resources Section */}
      <div className="all-courses-section">
        <h2>Recommended Courses</h2>
        <div className="all-courses-cards">
          {allCourses.slice(0, 3).map((course, index) => (
            <div key={index} className="all-courses-card-container">
              <Link to={`/programs`} className="course-link">
                <div className="course-card">
                  <div className="course-card-img">
                    <img src={course.img} alt={course.name} />
                  </div>
                  <div className="course-card-content">
                    <h3 className="course-card-title">{course.name}</h3>
                    <div className="course-card-stats">
                      <span className="students-enrolled">
                        <FaUsers size={12} /> {Math.floor(Math.random() * 2000) + 1000} students
                      </span>
                      <span>{Math.floor(Math.random() * 10) + 3} levels</span>
                    </div>
                    <div className="course-card-actions">
                      <span className="course-action-btn course-explore-btn">Explore</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        <div className="see-all-container">
          <Link to="/programs" className="see-all-btn">
            See All Courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MyCourse;