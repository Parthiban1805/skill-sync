import React, { useState } from 'react';
import axios from 'axios';
import './studymaterialupload.css'; // Import custom CSS file

const UploadContentForm = () => {
  const [formData, setFormData] = useState({
    levelNo: '',
    levelName: '',
    ProgramName: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileName(e.target.files[0].name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!file) {
      setError('Please select a file to upload');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('levelNo', formData.levelNo);
      formDataToSend.append('levelName', formData.levelName);
      formDataToSend.append('ProgramName', formData.ProgramName);
      formDataToSend.append('description', formData.description);

      const response = await axios.post('http://localhost:5001/skill-sync/upload-content', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setMessage(`Content uploaded successfully! Created ${response.data.data.topicsCount} topics.`);
        // Reset form
        setFormData({
          levelNo: '',
          levelName: '',
          ProgramName: '',
          description: ''
        });
        setFile(null);
        document.getElementById('file-input').value = '';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading content');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Programming Content</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="levelNo">Level Number*</label>
          <input type="number" id="levelNo" name="levelNo" value={formData.levelNo} onChange={handleChange} required />
        </div>
        
        <div className="form-group">
          <label htmlFor="levelName">Level Name</label>
          <input type="text" id="levelName" name="levelName" value={formData.levelName} onChange={handleChange} />
        </div>
        
        <div className="form-group">
          <label htmlFor="ProgramName">Program Name*</label>
          <input type="text" id="ProgramName" name="ProgramName" value={formData.ProgramName} onChange={handleChange} required />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="3"></textarea>
        </div>

        <div className="custom-file-input">
            <input
              type="file"
              id="file-upload"
              className="file-input"
              accept=".txt"
              onChange={handleFileChange}
              required
            />
            <label htmlFor="file-upload" className="file-upload-btn">
              Choose File
            </label>
            <span className="file-name">
              {fileName || 'No File chosen'}
            </span>
          </div>
        
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Processing...' : 'Upload Content'}
        </button>
      </form>
    </div>
  );
};

export default UploadContentForm;
