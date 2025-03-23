// routes/documents.js
const express = require('express');
const router = express.Router();
const Document = require('../models/document');

// Create a new document
router.post('/', async (req, res) => {
  try {
    const { title, topics, userId } = req.body;
    
    const newDocument = new Document({
      title: title || 'Untitled Document',
      topics: topics || [],
      userId: userId // Now getting userId from request body
    });
    
    const savedDocument = await newDocument.save();
    res.status(201).json(savedDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all documents with pagination
router.get("/", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; // Default to page 1
      const limit = parseInt(req.query.limit) || 10; // Default to 10 documents per page
      const skip = (page - 1) * limit;
  
      const documents = await Document.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }); // Sort by creation date (newest first)
  
      const totalDocuments = await Document.countDocuments();
  
      res.json({
        documents,
        totalPages: Math.ceil(totalDocuments / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

// Get a specific document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a document
router.put('/:id', async (req, res) => {
  try {
    const { title, topics } = req.body;
    
    // Check if document exists
    let document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Update document
    document.title = title || document.title;
    document.topics = topics || document.topics;
    
    const updatedDocument = await document.save();
    res.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a document
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;