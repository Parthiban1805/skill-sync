const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Import the User model
const User = require('../models/User'); // Path to your User model

// Load environment variables from .env file
dotenv.config();

async function seedDatabase() {
  try {
    // Connect to MongoDB (replace this with your actual connection string)
    await mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Password hashing
    const saltRounds = 10;

    // Dummy student data
    const students = [
      {
        roll_no:"Admin123",
        name: "admin",
        email: "admin@gmail.com",
        password: await bcrypt.hash("admin123", saltRounds),
        role: "admin",
      }
  
    ];

    // Insert the student data into the database
    await User.insertMany(students);

    console.log('Students saved successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    // Disconnect from the database after seeding
    mongoose.disconnect();
  }
}

seedDatabase();
