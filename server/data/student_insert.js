const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Student = require('../models/Student');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

const saltRounds = 10;

const insertStudentData = async () => {
  const hashedPassword = await bcrypt.hash("12345", saltRounds);

  const studentData = {
    student_id: "S11",
    name: "test1",
    email: "test12@gmail.com",
    password: hashedPassword,
    semester: "3",
    year: "2025",
    department: "Computer Science",
    role:"Student",
    programRegistered: [
      {
        ProgramName: "C",
        levelNo: 1,
        levelName: "C level-1",
        statuslevel: "not-completed"
      },
      {
        ProgramName: "C++",
        levelNo: 1,
        levelName: "C++ level-1",
        statuslevel: "not-completed"
      },
      {
        ProgramName: "Python",
        levelNo: 1,
        levelName: "Python level-1",
        statuslevel: "not-completed"
      },
      {
        ProgramName: "Java",
        levelNo: 1,
        levelName: "Java level-1",
        statuslevel: "not-completed"
      },
   
    ],
    programCompleted: [
      {
        ProgramName: "C",
        levelNo: 1,
        levelName: "C level-1",
        status: "not-completed"
      },
      {
        ProgramName: "C++",
        levelNo: 1,
        levelName: "C++ level-1",
        status: "not-completed"
      },
      {
        ProgramName: "Python",
        levelNo: 1,
        levelName: "Python level-1",
        status: "not-completed"
      },
      {
        ProgramName: "Java",
        levelNo: 1,
        levelName: "Java level-1",
        status: "not-completed"
      },
     
    ]
  };

  try {
    await Student.create(studentData);
    console.log('Student data inserted successfully!');
    process.exit();
  } catch (err) {
    console.error('Error while inserting student data:', err.message);
    process.exit(1);
  }
};

connectDB().then(insertStudentData);
