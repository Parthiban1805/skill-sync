import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './progressview.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const PracticeProgress = () => {
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({});
  
  // Define all possible columns
  const columns = [
    { id: 'studentId', label: 'Student ID' },
    { id: 'ProgramName', label: 'Program Name' },
    { id: 'LevelName', label: 'Level Name' },
    { id: 'LevelNo', label: 'Level Number' },
    { id: 'Date', label: 'Date' },
    { id: 'questionCount', label: 'Questions Attempted' },
    { id: 'passedTests', label: 'Tests Passed' },
    { id: 'status', label: 'Status' }
  ];

  useEffect(() => {
    fetchData();
    // Initialize all columns as selected
    const initialSelectedColumns = {};
    columns.forEach(col => {
      initialSelectedColumns[col.id] = true;
    });
    setSelectedColumns(initialSelectedColumns);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://assessly-server.weacttech.com/skill-sync/practice-progress');
      setProgressData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleColumnSelection = (columnId) => {
    setSelectedColumns({
      ...selectedColumns,
      [columnId]: !selectedColumns[columnId]
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const downloadExcel = () => {
    // Filter data based on selected columns
    const filteredData = progressData.map(item => {
      const rowData = {};
      
      if (selectedColumns.studentId) rowData['Student ID'] = item.studentId;
      if (selectedColumns.ProgramName) rowData['Program Name'] = item.ProgramName;
      if (selectedColumns.LevelName) rowData['Level Name'] = item.LevelName;
      if (selectedColumns.LevelNo) rowData['Level Number'] = item.LevelNo;
      if (selectedColumns.Date) rowData['Date'] = formatDate(item.Date);
      if (selectedColumns.questionCount) rowData['Questions Attempted'] = item.question.length;
      if (selectedColumns.passedTests) {
        const passedTests = item.question.reduce((total, q) => {
          return total + q.testCases.filter(tc => tc.status === "passed").length;
        }, 0);
        rowData['Tests Passed'] = passedTests;
      }
      if (selectedColumns.status) rowData['Status'] = item.status;
      
      return rowData;
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Practice Progress');
    
    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'practice_progress.xlsx');
    
    // Close the modal
    setShowDownloadModal(false);
  };

  const countPassedTests = (question) => {
    return question.testCases.filter(tc => tc.status === "passed").length;
  };

  return (
    <div className="practice-progress-container">
      <h1>Practice Progress</h1>
      
      <div className="actions-bar">
        <button 
          className="download-btn"
          onClick={() => setShowDownloadModal(true)}
        >
          Download Excel
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading data...</div>
      ) : (
        <div className="table-container">
          <table className="progress-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Program</th>
                <th>Level</th>
                <th>Level No.</th>
                <th>Date</th>
                <th>Questions</th>
                <th>Tests Passed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td>{item.studentId}</td>
                  <td>{item.ProgramName}</td>
                  <td>{item.LevelName}</td>
                  <td>{item.LevelNo}</td>
                  <td>{formatDate(item.Date)}</td>
                  <td>{item.question.length}</td>
                  <td>
                    {item.question.reduce((total, q) => total + countPassedTests(q), 0)}/
                    {item.question.reduce((total, q) => total + q.testCases.length, 0)}
                  </td>
                  <td>
                    <span className={`status-badge ${item.status === 'completed' ? 'completed' : 'not-completed'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Download Modal */}
      {showDownloadModal && (
      <div className="progress-overlay">
      <div className="progress-modal">
        <h2>Select Columns to Export</h2>
        <div className="column-selection">
          {columns.map(column => (
            <div key={column.id} className="column-checkbox">
              <input
                type="checkbox"
                id={column.id}
                checked={selectedColumns[column.id]}
                onChange={() => handleColumnSelection(column.id)}
              />
              <label htmlFor={column.id}>{column.label}</label>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button 
            className="cancel-btn"
            onClick={() =>setShowDownloadModal(false)}
          >
            Cancel
          </button>
          <button 
            className="progress-confirm-btn"
            onClick={downloadExcel}
          >
            Export
          </button>
        </div>
      </div>
    </div>
      )}
    </div>
  );
};

export default PracticeProgress;