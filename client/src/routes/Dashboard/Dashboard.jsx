import axios from "axios";
import sodium from 'libsodium-wrappers';
import React, { useEffect, useState } from "react";
import { FaBookOpen, FaChartLine, FaSearch, FaUsers } from "react-icons/fa";
import { HiAdjustments } from "react-icons/hi";
import { MdSchool } from "react-icons/md";
import { Link } from 'react-router-dom';

import Aptitude from '../../assets/aptitude.png';
import C_plus from '../../assets/C++.jpeg';
import C from '../../assets/C.png';
import java from '../../assets/java.png';
import python from '../../assets/python.png';
import Sql from '../../assets/SQl.png';
import './Dashboard.css';

const allCourses = [
  { name: 'Python', img: python },
  { name: 'Java', img: java },
  { name: 'C++', img: C_plus },
  { name: 'C', img: C },
  { name: 'MySQL', img: Sql },
  { name: 'Aptitude', img: Aptitude}
];

const Dashboard = () => {
  const [program, setProgram] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userId, setUserId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Analytics data (example)
  const [analytics, setAnalytics] = useState({
    coursesCompleted: 0,
    totalProgress: 0,
    averageScore: 0,
    activeStreak: 0
  });
  
  useEffect(() => {
    const fetchAllData = async () => {
      await sodium.ready;
      setIsLoading(true);
  
      const encryptedData = sessionStorage.getItem("token");
      if (!encryptedData) {
        console.error("❌ No token found in sessionStorage!");
        setIsLoading(false);
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
          setIsLoading(false);
          return;
        }
  
        setUserDetails(userDetails);
        const { student_id, userId } = userDetails;
        setStudentId(student_id);
        setUserId(userId);
        
        // Calculate analytics based on user data
        if (userDetails.programCompleted && userDetails.programCompleted.length > 0) {
          const completedCourses = userDetails.programCompleted.filter(
            course => course.status === "Completed"
          ).length;
          
          const totalProgressSum = userDetails.programCompleted.reduce(
            (sum, course) => sum + course.progress, 0
          );
          
          const avgProgress = totalProgressSum / userDetails.programCompleted.length;
          
          setAnalytics({
            coursesCompleted: completedCourses,
            totalProgress: Math.round(avgProgress),
            averageScore: 85, // Example placeholder
            activeStreak: 3 // Example placeholder
          });
        }
        
      } catch (error) {
        console.error("❌ Token decryption failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchAllData();
  }, []);
  
  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const response = await axios.get('http://localhost:5001/skill-sync/programs');
        
        // Add the img property by mapping with allCourses
        const programsWithImages = response.data.map((prog) => {
          const matchedCourse = allCourses.find(
            (course) => course.name.toLowerCase() === prog.ProgramName.toLowerCase()
          );
          
          // Add random student count for demonstration
          const randomStudentCount = Math.floor(Math.random() * 5000) + 1000;
          
          return {
            ...prog,
            img: matchedCourse?.img || null,
            studentCount: randomStudentCount
          };
        });
        
        setProgram(programsWithImages);
      } catch (error) {
        console.error('Error fetching program details:', error);
      }
    };

    fetchProgram();
  }, []);
  
  // Filter courses based on search query and active filter
  const filteredCourses = program?.filter(course => {
    const matchesSearch = course.ProgramName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || course.ProgramName === activeFilter;
    return matchesSearch && matchesFilter;
  });
  
  // Get unique program names for filter buttons
  const courseCategories = program ? ["All", ...new Set(program.map(course => course.ProgramName))] : ["All"];
  
  // Calculate time since last login (placeholder)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getCourseCountByCategory = (category) => {
  if (category === "All") return program?.length || 0;
  return program?.filter(course => course.ProgramName === category).length || 0;
};

// Function to clear search and filters
const clearSearch = () => {
  setSearchQuery("");
};

const clearFilters = () => {
  setSearchQuery("");
  setActiveFilter("All");
};

const calculateProgress = (userLevel, programName) => {
  const matchedProgram = program?.find((prog) => prog.ProgramName === programName);
  if (!matchedProgram || !matchedProgram.noOfLevels) {
    return 0; // Default if program not found or noOfLevels not defined
  }
  
  const totalLevels = matchedProgram.noOfLevels;
  // If user is on level 1 of 5, they've completed 0 levels but started 1, so progress is 1/5 = 20%
  return Math.round((userLevel / totalLevels) * 100);
};

  
  return (
    <div className="dashboard-container">
      <header className="welcome-banner">
        <h1>{getGreeting()}, {userDetails?.name || 'User'}</h1>
        <p>Continue your learning journey and explore new programming skills.</p>
      </header>
      
      {/* Analytics Section */}
      <div className="analytics-section">
        <div className="analytics-card">
          <span className="analytics-card-title">Courses In Progress</span>
          <span className="analytics-card-value">
            {userDetails?.programCompleted?.length || 0}
          </span>
          <span className="analytics-card-change positive-change">
            <FaChartLine /> Active
          </span>
        </div>
        
        <div className="analytics-card">
          <span className="analytics-card-title">Total Progress</span>
          <span className="analytics-card-value">{analytics.totalProgress}%</span>
          <span className="analytics-card-change positive-change">
            <FaChartLine /> On Track
          </span>
        </div>
        
        <div className="analytics-card">
          <span className="analytics-card-title">Completed Courses</span>
          <span className="analytics-card-value">{analytics.coursesCompleted}</span>
          <span className="analytics-card-change">
            <MdSchool /> Achievement
          </span>
        </div>
        
        <div className="analytics-card">
          <span className="analytics-card-title">Learning Streak</span>
          <span className="analytics-card-value">{analytics.activeStreak} days</span>
          <span className="analytics-card-change positive-change">
            <FaChartLine /> Keep it up!
          </span>
        </div>
      </div>

      {/* Ongoing Courses Section */}
      <div className="continuing-courses-section">
        <h2>Ongoing Courses</h2>
        <div className="continuing-course-cards">
          {userDetails?.programCompleted?.length ? (
            userDetails.programCompleted.map((course, index) => {
              // Find the correct program from `program` based on `ProgramName`
              const matchedProgram = program?.find((prog) => prog.ProgramName === course.ProgramName);
              const progressPercentage = calculateProgress(course.levelNo, course.ProgramName);

              return (
                <div key={index} className="dashboard-ongoing-course-container">
                  <h3>{course.ProgramName}</h3>
                  <p data-status={course.status}>Level {course.levelNo} - {course.status}</p>
                  <div className="dashboard-ongoing-course-progress">
                    <div
                      className="dashboard-ongoing-course-progress-bar"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  {matchedProgram ? (
                    <Link to={`/courses/${matchedProgram._id}`} className="dashboard-ongoing-course-start-btn">
                      CONTINUE
                    </Link>
                  ) : (
                    <button disabled className="dashboard-ongoing-course-start-btn" style={{ opacity: 0.7 }}>
                      UNAVAILABLE
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <FaBookOpen size={32} />
              <h3>No ongoing courses</h3>
              <p>Start your learning journey by enrolling in a course below</p>
              <Link to="/programs" className="empty-state-btn">Browse Courses</Link>
            </div>
          )}
        </div>
      </div>

      {/* All Courses Section */}
      <div className="all-courses-section">
        <h2>All Courses</h2>
        
        {/* Enhanced search input */}
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search for courses..."
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
        
        {/* Show active filters message when filters are applied */}
        {(activeFilter !== "All" || searchQuery) && (
          <div className="active-filters">
            <span className="active-filters-label">
              Showing {filteredCourses?.length || 0} results
              {activeFilter !== "All" && ` in ${activeFilter}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <button className="clear-filters" onClick={clearFilters}>
              Clear all filters
            </button>
          </div>
        )}
        
        {/* Enhanced filter buttons */}
        <div className="course-filters-wrapper">
          <div className="filters-header">
            <h3 className="filters-title">
              <HiAdjustments /> Categories
            </h3>
          </div>
          <div className="course-filters">
            {courseCategories.map(category => (
              <button
                key={category}
                className={`course-filter-btn ${activeFilter === category ? 'active' : ''}`}
                onClick={() => setActiveFilter(category)}
              >
                {category}
                <span className="filter-count">{getCourseCountByCategory(category)}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="all-courses-cards">
          {filteredCourses?.length > 0 ? (
            filteredCourses.map((course, index) => (
              <div key={index} className="all-courses-card-container">
                <Link to={`/programs/${course._id}`} className="course-link">
                  <div className="course-card">
                    <div className="course-card-img">
                      <img src={course.img} alt={course.ProgramName} />
                    </div>
                    <div className="course-card-content">
                      <h3 className="course-card-title">{course.ProgramName}</h3>
                      <div className="course-card-stats">
                        <span className="students-enrolled">
                          <FaUsers size={12} /> {course.studentCount.toLocaleString()} students
                        </span>
                        <span>{course.levels?.length || 0} levels</span>
                      </div>
                      <div className="course-card-actions">
                        <span className="course-action-btn course-explore-btn">Explore</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>No courses found</h3>
              <p>Try adjusting your search or filters</p>
              <button className="empty-state-btn" onClick={clearFilters}>Reset Filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;