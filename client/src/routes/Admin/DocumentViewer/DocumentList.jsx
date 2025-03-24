import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocumentList.css';

const DocumentList = () => {
    const [documents, setDocuments] = useState([]);
    const [currentDocument, setCurrentDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalDocuments: 0
    });
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    
    const navigate = useNavigate();
    
    // Fetch document list from server
    const fetchDocuments = async (page = 1) => {
        setLoading(true);
        try {
        const res = await axios.get(`https://assessly-server.weacttech.com/skill-sync/all-documents?page=${page}&limit=10`);
        setDocuments(res.data.documents);
        setPagination({
            currentPage: res.data.currentPage,
            totalPages: res.data.totalPages,
            totalDocuments: res.data.totalDocuments
        });
        setError(null);
        } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents. Please try again later.');
        } finally {
        setLoading(false);
        }
    };
    
    // Fetch specific document by title
    const fetchDocumentByTitle = async (title) => {
        setLoading(true);
        try {
        const res = await axios.get(`https://assessly-server.weacttech.com/skill-sync/documents/${title}`);
        setCurrentDocument(res.data);
        setError(null);
        } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document. Please try again later.');
        setCurrentDocument(null);
        } finally {
        setLoading(false);
        }
    };
    
    // Delete document
    const deleteDocument = async (title, e) => {
        e.stopPropagation(); // Prevent document selection when clicking delete
        
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
        return;
        }
        
        try {
        await axios.delete(`https://assessly-server.weacttech.com/skill-sync/documents/${title}`);
        showToast(`Document "${title}" deleted successfully`, 'success');
        
        // Refresh document list
        fetchDocuments(pagination.currentPage);
        
        // Clear current document if it was the deleted one
        if (currentDocument && currentDocument.title === title) {
            setCurrentDocument(null);
        }
        } catch (err) {
        console.error('Error deleting document:', err);
        showToast('Error deleting document', 'error');
        }
    };
    
    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
        }, 3000);
    };
    
    // Initial load of documents
    useEffect(() => {
        fetchDocuments();
    }, []);
    
    // Handle pagination
    const handlePageChange = (page) => {
        fetchDocuments(page);
    };
    
    return (
        <div className="document-explorer">
        <header className="header">
            <h1>Document Explorer</h1>
            <div className="header-actions">
            <button className="btn primary" onClick={() => navigate('/editor')}>
                Create New Document
            </button>
            </div>
        </header>
        
        <div className="main-container">
            {/* Left sidebar - Document list */}
            <aside className="document-list">
            <h2>Documents ({pagination.totalDocuments})</h2>
            
            {loading && !currentDocument && documents.length === 0 ? (
                <div className="loading">Loading documents...</div>
            ) : error && !documents.length ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                <ul className="document-items">
                    {documents.map((doc) => (
                    <li 
                        key={doc._id} 
                        className={`document-item ${currentDocument && currentDocument.title === doc.title ? 'active' : ''}`}
                        onClick={() => fetchDocumentByTitle(doc.title)}
                    >
                        <span className="document-item-title">{doc.title}</span>
                        <div className="document-item-actions">
                        <button 
                            className="btn icon"
                            title="Edit Document"
                            onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/editor/${doc.title}`);
                            }}
                        >
                            ✎
                        </button>
                        <button 
                            className="btn icon danger"
                            title="Delete Document"
                            onClick={(e) => deleteDocument(doc.title, e)}
                        >
                            ✕
                        </button>
                        </div>
                    </li>
                    ))}
                </ul>
                
                {/* Pagination controls */}
                {pagination.totalPages > 1 && (
                    <div className="pagination">
                    <button 
                        className="btn pagination-btn"
                        disabled={pagination.currentPage === 1}
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                    >
                        &laquo; Prev
                    </button>
                    
                    <span className="pagination-info">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    
                    <button 
                        className="btn pagination-btn"
                        disabled={pagination.currentPage === pagination.totalPages}
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                    >
                        Next &raquo;
                    </button>
                    </div>
                )}
                </>
            )}
            </aside>
            
            {/* Main content - Document viewer */}
            <main className="document-viewer">
            {loading && currentDocument ? (
                <div className="loading">Loading document...</div>
            ) : error && !currentDocument ? (
                <div className="error-message">{error}</div>
            ) : !currentDocument ? (
                <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
                <p>Select a document to view its contents</p>
                </div>
            ) : (
                <div className="document-content">
                <div className="document-header">
                    <h1>{currentDocument.title}</h1>
                    <div className="document-actions">
                    <button 
                        className="btn primary"
                        onClick={() => navigate(`/editor/${currentDocument.title}`)}
                    >
                        Edit Document
                    </button>
                    </div>
                </div>
                
                <div className="document-body">
                    {currentDocument.topics.map((topic, topicIndex) => (
                    <div key={topicIndex} className="topic-section">
                        <h2 className="topic-title">{topic.title}</h2>
                        
                        {topic.subtopics.map((subtopic, subtopicIndex) => (
                        <div key={subtopicIndex} className="subtopic-section">
                            <h3 className="subtopic-title">{subtopic.title}</h3>
                            
                            {/* Paragraphs */}
                            {subtopic.paragraphs.map((paragraph, paragraphIndex) => (
                            <p key={paragraphIndex} className="content-paragraph">
                                {paragraph}
                            </p>
                            ))}
                            
                            {/* Images */}
                            {subtopic.images.map((image, imageIndex) => (
                            <figure key={imageIndex} className="content-image">
                                <img src={image.url} alt={image.caption} />
                                {image.caption && <figcaption>{image.caption}</figcaption>}
                            </figure>
                            ))}
                            
                            {/* Tables */}
                            {subtopic.tables.map((table, tableIndex) => (
                            <div key={tableIndex} className="content-table">
                                <table>
                                <tbody>
                                    {table.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                        <td key={cellIndex}>{cell}</td>
                                        ))}
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>
                            ))}
                            
                            {/* Code blocks */}
                            {subtopic.code.map((codeBlock, codeIndex) => (
                            <div key={codeIndex} className="content-code">
                                <div className="code-language">{codeBlock.language}</div>
                                <pre>
                                <code>{codeBlock.code}</code>
                                </pre>
                            </div>
                            ))}
                        </div>
                        ))}
                    </div>
                    ))}
                </div>
                </div>
            )}
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

export default DocumentList;