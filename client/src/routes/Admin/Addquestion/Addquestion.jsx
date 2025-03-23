import React, { useState } from "react";
import Swal from "sweetalert2";
import './AddQuestion.css';

const AddQuestion = () => {
    const [title, setTitle] = useState("");
    const [levelName, setlevelName] = useState("");
    const [levelNo, setlevelNo] = useState("");
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName('');
        }
    };
   
    const handleSubmit = async (event) => {
        event.preventDefault();
  
        const formData = new FormData();
        formData.append('ProgramName', event.target[0].value);
        formData.append('LevelName', event.target[1].value);
        formData.append('LevelNo', event.target[2].value);
  
        const fileInput = event.target[3]; 
        if (fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }
  
        if (!formData.get('ProgramName') || !formData.get('LevelName') || !formData.get('LevelNo')) {
            Swal.fire({
                title: 'Error!',
                text: 'All fields are required.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }
  
        try {
            const response = await fetch('http://localhost:5001/skill-sync/questions', {
                method: 'POST',
                body: formData,
            });
  
            const data = await response.json();
            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Assessment added successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });
                setTitle("");
                setlevelName("");
                setlevelNo("");
                setFileName("");
                document.getElementById("file-upload").value = "";
            } else {
                Swal.fire({
                    title: 'Error!',
                    text: data.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to submit form.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    };
  
    return (
        <div className="question-container">
            <form className="question-form" onSubmit={handleSubmit}>
            <h1>Add a New Question</h1>
                <div className="question-form-element">
                    <label>Program Name </label>
                    <input
                        className="input-field"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div className="question-form-element">
                    <label>Level Name:</label>
                    <input
                        className="input-field"
                        type='text'
                        value={levelName}
                        onChange={(e) => setlevelName(e.target.value)}
                        required
                    />
                </div>
                <div className="question-form-element">
                    <label>Level No.:</label>
                    <input
                        className="input-field"
                        type='text'
                        value={levelNo}
                        onChange={(e) => setlevelNo(e.target.value)}
                        required
                    />
                </div>
                <label className='form-label'>Upload CSV</label>
                <div className="custom-file-input">
                    <input
                        type="file"
                        id="file-upload"
                        className="file-input"
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="file-upload-btn">
                        Choose File
                    </label>
                    <span className="file-name">
                        {fileName || 'No File chosen'}
                    </span>
                </div>      
                <button className="upload-questions-btn">
                            Upload Questions
                        </button>      
                </form>
        </div>
    );
};

export default AddQuestion;
