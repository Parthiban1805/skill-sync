const mongoose = require('mongoose');
const fs = require('fs');

// Import the schema
const ProgramSchema = new mongoose.Schema({
  ProgramName: { type: String, required: true },
  ProgramDescription: { type: String, required: true },
  noOfLevels: { type: Number, required: true },
  levels: [
    {
      levelNo: { type: Number, required: true },
      levelName: { type: String, required: true },
    },
  ],
});

const ProgrammingLanguage = mongoose.model('AvailableProgram', ProgramSchema);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// Function to import data
const importData = async () => {
  try {
    // Read data from the JSON file
    const data = JSON.parse(fs.readFileSync('programs.json', 'utf-8'));

    // Insert the data into the collection
    await ProgrammingLanguage.insertMany(data);

    console.log('Data successfully imported!');
    process.exit(); // Exit after successful execution
  } catch (err) {
    console.error('Error while importing data:', err.message);
    process.exit(1);
  }
};

// Connect to DB and call importData
connectDB().then(importData);
