import axios from 'axios';
import { Award, BookOpen, Filter, Search, UserCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import placeholder from '../../../assets/placeholder.png';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [userDetails, setUserDetails] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentsRecord, setStudentsRecord] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5001/skill-sync/all-students')
            .then(response => {
                setStudentsRecord(response.data);
                setFilteredStudents(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching students:', error);
                setError('Failed to load student records.');
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        let result = studentsRecord;

        if (searchTerm) {
            result = result.filter(student => 
                student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterDepartment) {
            result = result.filter(student => 
                student.department.toLowerCase() === filterDepartment.toLowerCase()
            );
        }

        setFilteredStudents(result);
    }, [searchTerm, filterDepartment, studentsRecord]);

    const handleStudentClick = async (studentId) => {
        try {
            const response = await axios.get(`http://localhost:5001/skill-sync/student-details/${studentId}`);
            setSelectedStudent(response.data);
        } catch (error) {
            console.error('Error fetching student details:', error);
        }
    };

    const departments = [...new Set(studentsRecord.map(student => student.department))];

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-container">
            <div className="admin-dashboard-top">
                <div className="admin-details">
                    <div className="admin-details-header">
                        <h4>Administration Portal</h4>
                        {/* <div className="admin-badge">Dashboard</div> */}
                    </div>
                    <div className="admin-details-top">
                        <div className="admin-avatar-container">
                            <img 
                                src={userDetails?.profileImage || ''} 
                                alt={`${userDetails?.name || 'Admin'} profile`}
                                className="admin-avatar"
                                onError={(e) => {
                                    e.target.src = placeholder;
                                    e.target.classList.add('avatar-error');
                                }}
                            />
                            {userDetails?.verificationBadge && (
                                <div className="verification-badge" title="Verified Administrator">
                                    ✓
                                </div>
                            )}
                        </div>
                        <div className="admin-detail">
                            <h3>{userDetails?.name || 'Administrator'}</h3>
                            <span>{userDetails?.role || 'System Administrator'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="teacher-dashboard-student-reports-container">
                <div className="search-filter-container">
                    <div className="search-input">
                        <Search size={20} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search students by name or ID" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="department-filter">
                        <Filter size={20} />
                        <select 
                            value={filterDepartment} 
                            onChange={(e) => setFilterDepartment(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="container">
                    <div className="left-panel">
                        <div className="student-list-header">
                            STUDENT LIST 
                            <span className="student-count">({filteredStudents.length} students)</span>
                        </div>
                        <div className="student-list">
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <div
                                        key={student.student_id}
                                        className="student-item"
                                        onClick={() => handleStudentClick(student.student_id)}
                                    >
                                        <div className="student-avatar">
                                            <img
                                                src={student.photo_url || placeholder}
                                                // alt={student.name}
                                            />
                                        </div>
                                        <div className="student-info">
                                            <div className="student-id">{student.student_id}</div>
                                            <div className="student-name">{student.name}</div>
                                            <div className="student-department">{student.department}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-students">
                                    <UserCheck size={40} />
                                    <p>No students found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="right-panel">
                        {selectedStudent ? (
                            <>
                                <h2 className="details-header">STUDENT DETAILS</h2>
                                <div className="profile-section">
                                    <div className="profile-avatar">
                                        <img 
                                            src={selectedStudent.photo_url || placeholder} 
                                            // alt={selectedStudent.name} 
                                        />
                                    </div>
                                    <div className="profile-details">
                                        <div className="profile-id">{selectedStudent.student_id || 'N/A'}</div>
                                        <div className="profile-name">{selectedStudent.name || 'N/A'}</div>
                                        <div className="profile-department">{selectedStudent.department || 'N/A'}</div>
                                    </div>
                                </div>

                                <div className="student-stats">
                                    <div className="stat-card">
                                        <BookOpen size={24} />
                                        <div>
                                            <h4>Programs</h4>
                                            <p>{selectedStudent.programCompleted?.length || 0} Completed</p>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <Award size={24} />
                                        <div>
                                            <h4>Achievements</h4>
                                            <p>{selectedStudent.achievements?.length || 0} Earned</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 className="card-title">PROGRAM COMPLETION STATUS</h3>
                                    {selectedStudent?.programCompleted?.length > 0 ? (
                                        <table className="rewards-table">
                                            <thead>
                                                <tr>
                                                    <th>PROGRAM NAME</th>
                                                    <th>LEVEL COMPLETED</th>
                                                    <th>LEVEL NAME</th>
                                                    <th>STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedStudent.programCompleted.map((program, index) => (
                                                    <tr key={index}>
                                                        <td>{program.programName || 'N/A'}</td>
                                                        <td>{program.levelNo || 0}</td>
                                                        <td>{program.levelName || 'N/A'}</td>
                                                        <td>{program.status || 'Not Completed'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No programs completed by this student.</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <Search size={60} />
                                <h3>Select a student to view details</h3>
                                <p>Click on a student from the list to see their complete profile</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;