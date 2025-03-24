import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DocumentEditor.css';

const DocumentEditor = ({ match, history }) => {
    const [document, setDocument] = useState({
        title: '',
        topics: [],
        levelNo: "",
        levelName: '',
        ProgramName: '',
        description: ''
    });
    const [csvFile, setCsvFile] = useState(null);

    const [tableSize, setTableSize] = useState({ rows: 3, cols: 3 });
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { id } = useParams();
    
    const documentId = match?.params?.id;
    const isNewDocument = !id;
    const navigate = useNavigate();

    // Fetch document from server on initial render if editing an existing document
    useEffect(() => {
        if (!isNewDocument) {
            fetchDocument();
        }
    }, [documentId]);
    
    const fetchDocument = async () => {
        setLoading(true);
        try {
            // Change to match server.js endpoint
            const res = await axios.get(`http://localhost:5000/skill-sync/documents/${id}`);
            
            // If the document uses the old structure, convert it to the new structure
            const fetchedDocument = res.data;
            const convertedDocument = convertToNewStructure(fetchedDocument);
            
            setDocument(convertedDocument);
            showToast('Document loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading document:', error);
            showToast('Error loading document', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Convert old document structure to new structure if needed
    const convertToNewStructure = (doc) => {
        if (!doc.topics) return doc;

        const newDoc = {
            ...doc,
            topics: doc.topics.map(topic => {
                if (!topic.subtopics) return topic;

                return {
                    ...topic,
                    subtopics: topic.subtopics.map(subtopic => {
                        // Check if already using new structure
                        if (subtopic.contentItems) return subtopic;

                        // Convert old structure to new structure
                        const contentItems = [];

                        // Add paragraphs
                        (subtopic.paragraphs || []).forEach(text => {
                            contentItems.push({
                                type: 'paragraph',
                                content: text
                            });
                        });

                        // Add images
                        (subtopic.images || []).forEach(image => {
                            contentItems.push({
                                type: 'image',
                                url: image.url,
                                caption: image.caption
                            });
                        });

                        // Add tables
                        (subtopic.tables || []).forEach(table => {
                            contentItems.push({
                                type: 'table',
                                rows: table.rows
                            });
                        });

                        // Add code blocks
                        (subtopic.code || []).forEach(code => {
                            contentItems.push({
                                type: 'code',
                                language: code.language,
                                code: code.code
                            });
                        });

                        return {
                            ...subtopic,
                            contentItems
                        };
                    })
                };
            })
        };

        return newDoc;
    };

    // Save document to server including the CSV file if provided
    const saveDocument = async () => {
        setSaving(true);
    
        try {
            const formData = new FormData();
    
            // Append basic fields
            formData.append('ProgramName', document.ProgramName || '');
            formData.append('levelNo', document.levelNo || 0);
            formData.append('levelName', document.levelName || '');
            formData.append('description', document.description || '');
    
            // Convert topics to JSON and append
            formData.append('topics', JSON.stringify(document.topics));
    
            // Add CSV file if it exists
            if (csvFile) {
                formData.append('quizFile', csvFile);
            }
    
            // Log FormData contents
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
    
            const response = await axios.post('https://assessly-server.weacttech.com/skill-sync/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
    
            showToast('Document saved successfully', 'success');
        } catch (err) {
            console.error('Error saving document:', err);
            showToast('Error saving document', 'error');
        } finally {
            setSaving(false);
        }
    };
    
    // Add a new topic
    const addTopic = () => {
        setDocument({
            ...document,
            topics: [
                ...document.topics, 
                { title: '', subtopics: [] }
            ],
        });
        showToast('Topic added successfully', 'success');
    };

    // Add a new subtopic to a specific topic
    const addSubtopic = (topicIndex) => {
        if (topicIndex === undefined || topicIndex < 0 || topicIndex >= document.topics.length) return;
    
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics.push({
            title: '',
            contentItems: [] // Use contentItems array for all content types
        });
    
        setDocument({ ...document, topics: updatedTopics });
        showToast('Subtopic added successfully', 'success');
    };

    // Add a new paragraph to a specific subtopic
    const addParagraph = (topicIndex, subtopicIndex) => {
        if (!isValidSubtopic(topicIndex, subtopicIndex)) return;
        
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems.push({
            type: 'paragraph',
            content: ''
        });
        
        setDocument({ ...document, topics: updatedTopics });
    };

    // Add a new image to a specific subtopic
    const addImage = (topicIndex, subtopicIndex) => {
        if (!isValidSubtopic(topicIndex, subtopicIndex)) return;
        
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems.push({
            type: 'image',
            url: '',
            caption: ''
        });
        
        setDocument({ ...document, topics: updatedTopics });
    };

    // Add a new table to a specific subtopic
    const addTable = (topicIndex, subtopicIndex) => {
        if (!isValidSubtopic(topicIndex, subtopicIndex)) return;
        
        const updatedTopics = [...document.topics];
        const rows = Array.from({ length: tableSize.rows }, () =>
            Array.from({ length: tableSize.cols }, () => '')
        );
        
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems.push({
            type: 'table',
            rows
        });
        
        setDocument({ ...document, topics: updatedTopics });
    };

    // Add a new code block to a specific subtopic
    const addCode = (topicIndex, subtopicIndex) => {
        if (!isValidSubtopic(topicIndex, subtopicIndex)) return;
        
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems.push({
            type: 'code',
            language: '',
            code: ''
        });
        
        setDocument({ ...document, topics: updatedTopics });
    };

    // Helper function to validate topic and subtopic indices
    const isValidSubtopic = (topicIndex, subtopicIndex) => {
        return (
            document.topics &&
            topicIndex !== undefined &&
            topicIndex >= 0 &&
            topicIndex < document.topics.length &&
            document.topics[topicIndex].subtopics &&
            subtopicIndex !== undefined &&
            subtopicIndex >= 0 &&
            subtopicIndex < document.topics[topicIndex].subtopics.length
        );
    };

    // Handle changes in document title
    const handleDocumentTitleChange = (e) => {
        setDocument({ ...document, title: e.target.value });
    };

    // Handle changes in topic title
    const handleTopicTitleChange = (e, topicIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].title = e.target.value;
        setDocument({ ...document, topics: updatedTopics });
    };

    // Handle changes in subtopic title
    const handleSubtopicTitleChange = (e, topicIndex, subtopicIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].title = e.target.value;
        setDocument({ ...document, topics: updatedTopics });
    };

    // Handle changes in paragraph content
    const handleParagraphChange = (e, topicIndex, subtopicIndex, contentIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems[contentIndex].content = e.target.value;
        setDocument({ ...document, topics: updatedTopics });
    };

    // Handle changes in image fields
    const handleImageChange = (e, topicIndex, subtopicIndex, contentIndex, field) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems[contentIndex][field] = e.target.value;
        setDocument({ ...document, topics: updatedTopics });
    };

    // Handle uploading Image files
    const handleImageFileUpload = async (e, topicIndex, subtopicIndex, contentIndex) => {
        const file = e.target.files[0];
        if (!file) return;

        // For proper image storage, you'd want to use a cloud storage service
        // This is a simplified example using base64 encoding
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const updatedTopics = [...document.topics];
            updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems[contentIndex].url = dataUrl;
            setDocument({ ...document, topics: updatedTopics });
        };
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            showToast('Error reading image file', 'error');
        };
        reader.readAsDataURL(file);
    };

    // Handle changes in table cells
    const handleTableCellChange = (e, topicIndex, subtopicIndex, contentIndex, rowIndex, colIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems[contentIndex].rows[rowIndex][colIndex] = e.target.value;
        setDocument({ ...document, topics: updatedTopics });
    };

    // Handle changes in code fields
    const handleCodeChange = (e, topicIndex, subtopicIndex, contentIndex, field) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems[contentIndex][field] = e.target.value;
        setDocument({ ...document, topics: updatedTopics });
    };

    // Delete a topic
    const deleteTopic = (topicIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics.splice(topicIndex, 1);
        setDocument({ ...document, topics: updatedTopics });
        showToast('Topic deleted', 'error');
    };

    // Delete a subtopic
    const deleteSubtopic = (topicIndex, subtopicIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics.splice(subtopicIndex, 1);
        setDocument({ ...document, topics: updatedTopics });
        showToast('Subtopic deleted', 'error');
    };

    // Delete a content item (paragraph, image, table, or code)
    const deleteContentItem = (topicIndex, subtopicIndex, contentIndex) => {
        const updatedTopics = [...document.topics];
        updatedTopics[topicIndex].subtopics[subtopicIndex].contentItems.splice(contentIndex, 1);
        setDocument({ ...document, topics: updatedTopics });
    };

    // Count paragraphs across all topics and subtopics
    const countParagraphs = () => {
        return document.topics.reduce((count, topic) => 
            count + topic.subtopics.reduce((subcount, subtopic) => 
                subcount + subtopic.contentItems.filter(item => item.type === 'paragraph').length, 0), 0);
    };

    // Handle CSV file selection
    const handleCSVUpload = (event) => {
        setCsvFile(event.target.files[0]); // Store the selected file in state
        showToast('CSV file selected, will be uploaded when you save the document', 'success');
    };

    // Upload CSV Questions - now integrated with the main saveDocument function
    const uploadCsvQuestion = () => {
        // If there's a CSV file selected, trigger the save document function
        if (csvFile) {
            saveDocument();
        } else {
            showToast('Please select a CSV file first', 'error');
        }
    };

    // Show toast notifications
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            setToast({ show: false, message: '', type: '' });
        }, 3000);
    };

    // Auto-save document to server
    useEffect(() => {
        const autoSaveDocument = async () => {
            if (document.title.trim() !== '' && !isNewDocument) {
                try {
                    await axios.post('http://localhost:5000/skill-sync/documents', document);
                    console.log('Document auto-saved successfully');
                } catch (error) {
                    console.error('Error auto-saving document:', error);
                }
            }
        };

        // Set up auto-save interval
        const saveInterval = setInterval(autoSaveDocument, 30000); // Every 30 seconds

        // Clear interval on component unmount
        return () => clearInterval(saveInterval);
    }, [document, documentId, isNewDocument]);

    if (loading) {
        return <div className="loading">Loading document...</div>;
    }

    return (
        <div className="app">
            <header className="header">
                <h1>Document Editor</h1>
                <div className="header-actions">
                    <button 
                        className={`btn primary ${saving ? 'loading' : ''}`} 
                        onClick={saveDocument}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Document'}
                    </button>
                </div>
            </header>
            
            <div className="main-container">
                <aside className="sidebar">
                    <div className="sidebar-section">
                        <h3>Document Structure</h3>
                        <button className="btn primary" onClick={addTopic}>Add Topic</button>
                    </div>
                    
                    <div className="sidebar-section">
                        <h3>Table Settings</h3>
                        <div className="input-group">
                            <label>Rows:</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={tableSize.rows}
                                onChange={(e) => setTableSize({ ...tableSize, rows: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="input-group">
                            <label>Columns:</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={tableSize.cols}
                                onChange={(e) => setTableSize({ ...tableSize, cols: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="sidebar-section csv-upload-section">
                            <h3>Upload CSV</h3>
                            <div className="file-input-container">
                                <input 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleCSVUpload} 
                                    id="csvFileInput" 
                                />
                                {csvFile && (
                                    <div className="selected-file">
                                        <span>Selected: {csvFile.name}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                className="upload-questions-btn" 
                                onClick={uploadCsvQuestion}
                                disabled={!csvFile}
                            >
                                Upload Questions
                            </button>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h3>Document Stats</h3>
                        <div className="stats">
                            <div className="stat-item">
                                <span className="stat-label">Topics:</span>
                                <span className="stat-value">{document.topics.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Subtopics:</span>
                                <span className="stat-value">
                                    {document.topics.reduce((count, topic) => count + topic.subtopics.length, 0)}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Paragraphs:</span>
                                <span className="stat-value">{countParagraphs()}</span>
                            </div>
                        </div>
                    </div>
                
                </aside>

                <main className="content">
                <div className="document-header">
                        <input
                            type="text"
                            className="document-title"
                            placeholder="Document Title"
                            value={document.title}
                            onChange={handleDocumentTitleChange}
                        />
                        <div className="additional-fields">
                            <div className="input-group">
                                <label>Level Number:</label>
                                <input
                                    type="number"
                                    placeholder="Level Number"
                                    value={document.levelNo}
                                    onChange={(e) => setDocument({ ...document, levelNo: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Level Name:</label>
                                <input
                                    type="text"
                                    placeholder="Level Name"
                                    value={document.levelName}
                                    onChange={(e) => setDocument({ ...document, levelName: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Program Name:</label>
                                <input
                                    type="text"
                                    placeholder="Program Name"
                                    value={document.ProgramName}
                                    onChange={(e) => setDocument({ ...document, ProgramName: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Description:</label>
                                <textarea
                                    placeholder="Description"
                                    value={document.description}
                                    onChange={(e) => setDocument({ ...document, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    {document.topics.length === 0 && (
                        <div className="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="12"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            <p>Your document is empty. Start by adding a topic.</p>
                        </div>
                    )}

                    {/* Render topics */}
                    {document.topics.map((topic, topicIndex) => (
                        <div key={topicIndex} className="topic-container">
                            <div className="topic-header">
                                <input
                                    type="text"
                                    className="topic-title"
                                    placeholder="Topic Title"
                                    value={topic.title}
                                    onChange={(e) => handleTopicTitleChange(e, topicIndex)}
                                />
                                <div className="topic-actions">
                                    <button className="btn small" onClick={() => addSubtopic(topicIndex)}>Add Subtopic</button>
                                    <button className="btn small danger" onClick={() => deleteTopic(topicIndex)}>Delete</button>
                                </div>
                            </div>

                            {/* Render subtopics */}
                            {topic.subtopics.map((subtopic, subtopicIndex) => (
                                <div key={subtopicIndex} className="subtopic-container">
                                    <div className="subtopic-header">
                                        <div className="subtopic-title-container">
                                            <input
                                                type="text"
                                                className="subtopic-title"
                                                placeholder="Subtopic Title"
                                                value={subtopic.title}
                                                onChange={(e) => handleSubtopicTitleChange(e, topicIndex, subtopicIndex)}
                                            />
                                            <button 
                                                className="btn small danger" 
                                                title="Delete Subtopic"
                                                onClick={() => deleteSubtopic(topicIndex, subtopicIndex)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        
                                        <div className="content-actions">
                                            <button 
                                                className="btn small" 
                                                title="Add Paragraph"
                                                onClick={() => addParagraph(topicIndex, subtopicIndex)}
                                            >
                                                Paragraph
                                            </button>
                                            <button 
                                                className="btn small" 
                                                title="Add Image"
                                                onClick={() => addImage(topicIndex, subtopicIndex)}
                                            >
                                                Image
                                            </button>
                                            <button 
                                                className="btn small" 
                                                title="Add Table"
                                                onClick={() => addTable(topicIndex, subtopicIndex)}
                                            >
                                                Table
                                            </button>
                                            <button 
                                                className="btn small" 
                                                title="Add Code"
                                                onClick={() => addCode(topicIndex, subtopicIndex)}
                                            >
                                                Code
                                            </button>
                                        </div>
                                    </div>

                                    <div className="subtopic-content">
                                        {/* Render content items in the order they were added */}
                                        {subtopic.contentItems && subtopic.contentItems.map((item, contentIndex) => {
                                            // Determine what content to render based on the item type
                                            switch (item.type) {
                                                case 'paragraph':
                                                    return (
                                                        <div key={contentIndex} className="paragraph-container">
                                                            <div className="paragraph-header">
                                                                <span className="content-label">Paragraph</span>
                                                                <button 
                                                                    className="btn icon danger"
                                                                    onClick={() => deleteContentItem(topicIndex, subtopicIndex, contentIndex)}
                                                                >✕</button>
                                                            </div>
                                                            <textarea
                                                                className="paragraph-content"
                                                                placeholder="Enter paragraph text..."
                                                                value={item.content}
                                                                onChange={(e) => handleParagraphChange(e, topicIndex, subtopicIndex, contentIndex)}
                                                            />
                                                        </div>
                                                    );
                                                
                                                case 'image':
                                                    return (
                                                        <div key={contentIndex} className="image-container">
                                                            <div className="content-header">
                                                                <span className="content-label">Image</span>
                                                                <button 
                                                                    className="btn icon danger"
                                                                    onClick={() => deleteContentItem(topicIndex, subtopicIndex, contentIndex)}
                                                                >✕</button>
                                                            </div>
                                                            <div className="image-inputs">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Image URL"
                                                                    value={item.url}
                                                                    onChange={(e) => handleImageChange(e, topicIndex, subtopicIndex, contentIndex, 'url')}
                                                                />
                                                                
                                                                <div className="file-upload-section">
                                                                    <span className="upload-divider">Or</span>
                                                                    <label className="btn small secondary">
                                                                        Upload Image
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            hidden
                                                                            onChange={(e) => handleImageFileUpload(e, topicIndex, subtopicIndex, contentIndex)}
                                                                        />
                                                                    </label>
                                                                </div>

                                                                <input
                                                                    type="text"
                                                                    placeholder="Image Caption"
                                                                    value={item.caption}
                                                                    onChange={(e) => handleImageChange(e, topicIndex, subtopicIndex, contentIndex, 'caption')}
                                                                />
                                                            </div>
                                                            {item.url && (
                                                                <div className="image-preview">
                                                                    <img 
                                                                        src={item.url} 
                                                                        alt={item.caption || 'Preview'} 
                                                                        onError={(e) => e.target.src = '/placeholder-image.png'} 
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                
                                                case 'table':
                                                    return (
                                                        <div key={contentIndex} className="table-container">
                                                            <div className="content-header">
                                                                <span className="content-label">Table</span>
                                                                <button 
                                                                    className="btn icon danger"
                                                                    onClick={() => deleteContentItem(topicIndex, subtopicIndex, contentIndex)}
                                                                >✕</button>
                                                            </div>
                                                            <div className="table-wrapper">
                                                                <table className="data-table">
                                                                    <tbody>
                                                                        {item.rows.map((row, rowIndex) => (
                                                                            <tr key={rowIndex}>
                                                                                {row.map((cell, colIndex) => (
                                                                                    <td key={colIndex}>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={cell}
                                                                                            onChange={(e) => handleTableCellChange(e, topicIndex, subtopicIndex, contentIndex, rowIndex, colIndex)}
                                                                                        />
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                
                                                case 'code':
                                                    return (
                                                        <div key={contentIndex} className="code-container">
                                                            <div className="content-header">
                                                                <span className="content-label">Code</span>
                                                                <button 
                                                                    className="btn icon danger"
                                                                    onClick={() => deleteContentItem(topicIndex, subtopicIndex, contentIndex)}
                                                                >✕</button>
                                                            </div>
                                                            <div className="code-inputs">
                                                                <select 
                                                                    value={item.language}
                                                                    onChange={(e) => handleCodeChange(e, topicIndex, subtopicIndex, contentIndex, 'language')}
                                                                >
                                                                    <option value="">Select language</option>
                                                                    <option value="javascript">JavaScript</option>
                                                                    <option value="python">Python</option>
                                                                    <option value="java">Java</option>
                                                                    <option value="csharp">C#</option>
                                                                    <option value="html">HTML</option>
                                                                    <option value="css">CSS</option>
                                                                    <option value="c">C</option>
                                                                    <option value="c++">C++</option>


                                                                </select>
                                                                <textarea
                                                                    className="code-editor"
                                                                    placeholder="Enter code here..."
                                                                    value={item.code}
                                                                    onChange={(e) => handleCodeChange(e, topicIndex, subtopicIndex, contentIndex, 'code')}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                
                                                default:
                                                    return null;
                                            }
                                        })}

                                        {/* Show empty state if no content items */}
                                        {(!subtopic.contentItems || subtopic.contentItems.length === 0) && (
                                            <div className="empty-content">
                                                <p>No content yet. Add a paragraph, image, table, or code block to continue.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {topic.subtopics.length === 0 && (
                                <div className="empty-subtopic">
                                    <p>No subtopics yet. Add a subtopic to continue.</p>
                                </div>
                            )}
                        </div>
                    ))}
                </main>
            </div>

            {/* Toast notification */}
            {toast.show && (
                <div className={`toast ${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default DocumentEditor;