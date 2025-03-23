import React from 'react';
import './DocumentViewer.css';

const DocumentViewer = ({ document }) => {
    return (
        <div className="document-viewer">
            <h1>{document.title}</h1>
            {document.topics.map((topic, topicIndex) => (
                <div key={topicIndex} className="topic">
                    <h2>{topic.title}</h2>
                    {topic.subtopics.map((subtopic, subtopicIndex) => (
                        <div key={subtopicIndex} className="subtopic">
                            <h3>{subtopic.title}</h3>
                            {subtopic.paragraphs.map((paragraph, paragraphIndex) => (
                                <p key={paragraphIndex}>{paragraph}</p>
                            ))}
                            {subtopic.images.map((image, imageIndex) => (
                                <div key={imageIndex} className="image">
                                    <img src={image.url} alt={image.caption} />
                                    <p>{image.caption}</p>
                                </div>
                            ))}
                            {subtopic.tables.map((table, tableIndex) => (
                                <div key={tableIndex} className="table">
                                    <table>
                                        <tbody>
                                            {table.rows.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {row.map((cell, colIndex) => (
                                                        <td key={colIndex}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                            {subtopic.code.map((codeBlock, codeIndex) => (
                                <div key={codeIndex} className="code">
                                    <h4>Code ({codeBlock.language})</h4>
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
    );
};

export default DocumentViewer;