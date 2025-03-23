const mongoose = require('mongoose');
const { Quiz } = require('../models/document'); // Update with the correct path

async function deleteUnwantedQuizzes() {
    try {
        await mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });

        const topicIdToKeep = '67d1bd15314747bfeb3d096e';

        const result = await Quiz.deleteMany({ topic: { $ne: topicIdToKeep } });

        console.log(`Deleted ${result.deletedCount} quiz documents that do not belong to topic ${topicIdToKeep}`);
        
        mongoose.connection.close();
    } catch (error) {
        console.error('Error deleting quizzes:', error);
    }
}

deleteUnwantedQuizzes();
