import sodium from 'libsodium-wrappers';
import React, { useEffect, useRef, useState } from 'react';
import { FaCircleUser } from "react-icons/fa6";
import { IoMdNotifications } from "react-icons/io";
import { MdAddCircleOutline, MdBookmark, MdBuildCircle, MdCode, MdControlPoint, MdFrontLoader, MdManageHistory, MdOutlineSchool, MdPanoramaWideAngle, MdQueryBuilder, MdQuestionAnswer, MdQuestionMark, MdUpload, MdVerifiedUser } from "react-icons/md";
import { PiChartLine } from "react-icons/pi";
import { RiDashboardFill, RiFileList2Fill, RiLogoutBoxLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const dropdownRef = useRef(null);
    const notificationsRef = useRef(null);

    // Window resize effect
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                notificationsRef.current && !notificationsRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch user details with more robust error handling
    const fetchUserDetails = async () => {
        try {
            await sodium.ready;

            const encryptedData = sessionStorage.getItem("token");
            if (!encryptedData) {
                navigate('/login');
                return null;
            }

            const { encrypted, nonce } = JSON.parse(encryptedData);
            const cryptoKey = sodium.from_base64(import.meta.env.VITE_SECRET_KEY);

            // Decrypt the token
            const decrypted = sodium.crypto_secretbox_open_easy(
                sodium.from_base64(encrypted),
                sodium.from_base64(nonce),
                cryptoKey
            );

            const token = new TextDecoder().decode(decrypted);
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

            const { role, userDetails } = decodedPayload;

            return userDetails ? { ...userDetails, role } : null;
        } catch (error) {
            console.error("❌ Token decryption failed:", error);
            navigate('/login');
            return null;
        }
    };

    // Combined fetch and set user logic
    useEffect(() => {
        const loadUser = async () => {
            const userData = await fetchUserDetails();
            setUser(userData);
        };

        loadUser();
    }, [location.pathname]); // Re-run when path changes

    const handleLogout = () => {
        sessionStorage.removeItem("token");
        setUser(null);
        navigate("/login"); 
    };

    const handleNotificationsClick = () => {
        setHasUnreadNotifications(false);
    };

    const isLinkActive = (path) => {
        return location.pathname === path;
    };

    const CategoryLabel = ({ text }) => {
        const isMobile = windowWidth <= 768;
        if (isMobile) return null;
        
        return (
            <div className="sidebar-category-label">
                <span>{text}</span>
            </div>
        );
    };

    const renderLinks = () => {
        const isMobile = windowWidth <= 768;
        
        if (!user) return null; // Don't render links until user is loaded

        if (user.role === "admin") {
            return (
                <>
                    <CategoryLabel text="OVERVIEW" />
                    <Link
                        to="/admin-dashboard"
                        className={`sidebar-navlink ${isLinkActive("/admin-dashboard") ? "active" : ""}`}
                        title="Admin Dashboard"
                    >
                        <RiDashboardFill className="sidebar-icon" />
                        {!isMobile && <span>Dashboard</span>}
                    </Link>

                    <CategoryLabel text="ASSESSMENTS" />
                    <Link
                        to="/question"
                        className={`sidebar-navlink ${isLinkActive("/question") ? "active" : ""}`}
                        title="Manage Questions"
                    >
                        <RiFileList2Fill className="sidebar-icon" />
                        {!isMobile && <span>Manage Questions</span>}
                    </Link>
                    <Link
                        to="/add-question"
                        className={`sidebar-navlink ${isLinkActive("/add-question") ? "active" : ""}`}
                        title="Add Questions"
                    >
                        <MdAddCircleOutline className="sidebar-icon" />
                        {!isMobile && <span>Add Assessment Questions</span>}
                    </Link>
                    <Link
                        to="/practice-question"
                        className={`sidebar-navlink ${isLinkActive("/practice-question") ? "active" : ""}`}
                        title="Practice Question"
                    >
                        <MdQuestionAnswer className="sidebar-icon" />
                        {!isMobile && <span>Add Practice Question</span>}
                    </Link>

                    <CategoryLabel text="VENUES" />
                    <Link
                        to="/add-venue"
                        className={`sidebar-navlink ${isLinkActive("/add-venue") ? "active" : ""}`}
                        title="Add Venue"
                    >
                        <MdQueryBuilder className="sidebar-icon" />
                        {!isMobile && <span>Add Venue</span>}
                    </Link>
                    <Link
                        to="/venue-management"
                        className={`sidebar-navlink ${isLinkActive("/venue-management") ? "active" : ""}`}
                        title="Venue Management"
                    >
                        <MdManageHistory className="sidebar-icon" />
                        {!isMobile && <span>Venue Management</span>}
                    </Link>

                    <CategoryLabel text="LEARNING RESOURCES" />
                    <Link
                        to="/study-material-upload"
                        className={`sidebar-navlink ${isLinkActive("/study-material-upload") ? "active" : ""}`}
                        title="Upload Study Material"
                    >
                        <MdUpload className="sidebar-icon" />
                        {!isMobile && <span>Upload Study Material</span>}
                    </Link>
                    <Link
                        to="/documents"
                        className={`sidebar-navlink ${isLinkActive("/documents") ? "active" : ""}`}
                        title="Manage Study Materials"
                    >
                        <MdBookmark className="sidebar-icon" />
                        {!isMobile && <span>Manage Study Materials</span>}
                    </Link>

                    <CategoryLabel text="STUDENT MANAGEMENT" />
                    <Link
                        to="/student-practice-progress"
                        className={`sidebar-navlink ${isLinkActive("/student-practice-progress") ? "active" : ""}`}
                        title="Student Progress"
                    >
                        <MdVerifiedUser className="sidebar-icon" />
                        {!isMobile && <span>Student Progress</span>}
                    </Link>
                </>
            );
        } else if (user.role === "Student") {
            return (
                <>
                    <CategoryLabel text="OVERVIEW" />
                    <Link
                        to="/dashboard"
                        className={`sidebar-navlink ${isLinkActive("/dashboard") ? "active" : ""}`}
                        title="Dashboard"
                    >
                        <RiDashboardFill className="sidebar-icon" />
                        {!isMobile && <span>Dashboard</span>}
                    </Link>
                    
                    <CategoryLabel text="LEARNING" />
                    <Link
                        to="/my-courses"
                        className={`sidebar-navlink ${isLinkActive("/my-courses") ? "active" : ""}`}
                        title="My Courses"
                    >
                        <MdOutlineSchool className="sidebar-icon" />
                        {!isMobile && <span>My Courses</span>}
                    </Link>
                    <Link
                        to="/eligible-levels"
                        className={`sidebar-navlink ${isLinkActive("/eligible-levels") ? "active" : ""}`}
                        title="Eligible Levels"
                    >
                        <PiChartLine className="sidebar-icon" />
                        {!isMobile && <span>Eligible Levels</span>}
                    </Link>
                    
                    <CategoryLabel text="PRACTICE" />
                    <Link
                        to="/visualizer"
                        className={`sidebar-navlink ${isLinkActive("/visualizer") ? "active" : ""}`}
                        title="Code Visualizer"
                    >
                        <MdCode className="sidebar-icon" />
                        {!isMobile && <span>Code Visualizer</span>}
                    </Link>
                </>
            );
        }
        return null;
    };

    const isSidebarCollapsed = windowWidth <= 768;

    // If no user is loaded, return null or a loading indicator
    if (!user) {
        return null; // or return a loading spinner
    }

    return (
        <div className={`sidebar-container ${isSidebarCollapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    {!isSidebarCollapsed && <span>SkillSync</span>}
                </div>
            </div>
            
            <div className="sidebar-navlinks">
                {renderLinks()}
            </div>
            
            <div className="sidebar-footer">
                <div className="sidebar-actions">
                    <button 
                        ref={notificationsRef}
                        className={`sidebar-icon-btn ${hasUnreadNotifications ? 'active' : ''}`}
                        aria-label="Notifications"
                        title="Notifications"
                        onClick={handleNotificationsClick}
                    >
                        <IoMdNotifications />
                        {hasUnreadNotifications && <span className="notification-badge">2</span>}
                    </button>
                    
                    <div className="sidebar-profile-container" ref={dropdownRef}>
                        <button 
                            className={`sidebar-icon-btn ${showDropdown ? 'active' : ''}`}
                            onClick={() => setShowDropdown(!showDropdown)}
                            aria-label="User Profile"
                            title="User Profile"
                        >
                            <FaCircleUser />
                        </button>
                        {showDropdown && (
                            <div className="sidebar-dropdown">
                                {user && (
                                    <div className="user-info">
                                        <p className="user-name">{user.name || "User"}</p>
                                        <p className="user-role">{user.role}</p>
                                    </div>
                                )}
                                <button onClick={handleLogout} className="logout-btn">
                                    <RiLogoutBoxLine style={{ marginRight: '8px' }} />
                                    Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;