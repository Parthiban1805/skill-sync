import axios from 'axios';
import React, { useState } from 'react';
import Swal from 'sweetalert2';
import './Venue.css';

const AddVenue = () => {
  const [venue, setVenue] = useState({
    name: '',
    location: '',
    csvFile: null,
  });
  const [fileName, setFilename] = useState('');

  const handleChange = (field, value) => {
    setVenue({ ...venue, [field]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setVenue({ ...venue, csvFile: e.target.files[0] });
      setFilename(e.target.files[0].name);
    } else {
      setVenue({ ...venue, csvFile: null });
      setFilename('');
    }
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append('name', venue.name);
      formData.append('location', venue.location);
      if (venue.csvFile) {
        formData.append('file', venue.csvFile);
      }

      const response = await axios.post('https://assessly-server.weacttech.com/skill-sync/add-venue', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200 || response.status === 201) {
        Swal.fire({
          title: 'Success!',
          text: 'Venue added successfully!',
          icon: 'success',
          confirmButtonText: 'OK',
        });

        // Reset the form
        setVenue({
          name: '',
          location: '',
          csvFile: null,
        });
        setFilename('');
        document.getElementById('fileInput').value = '';
      } else {
        throw new Error('Failed to add venue');
      }
    } catch (error) {
      console.error('Error adding venue:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to add venue.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  return (
    <div className="add-venue-container">
      <h1 className="add-venue-title">Add Venue</h1>
      <div className="add-venue-field">
        <label>Venue Name:</label>
        <input
          type="text"
          value={venue.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />
      </div>
      <div className="add-venue-field">
        <label>Location:</label>
        <input
          type="text"
          value={venue.location}
          onChange={(e) => handleChange('location', e.target.value)}
        />
      </div>
      <div className="custom-file-input">
        <input
          type="file"
          id="fileInput"
          className="file-input"
          accept=".csv"
          onChange={handleFileChange}
        />
        <label htmlFor="fileInput" className="file-upload-btn">
          Choose File
        </label>
        <span className="file-name">
          {fileName || 'No File chosen'}
        </span>
      </div>
      <button className="add-venue-submit" onClick={handleSubmit}>Submit</button>
    </div>
  );
};

export default AddVenue;