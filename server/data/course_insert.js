const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('../models/Course'); // Path to your Course model

// Load environment variables from .env file
dotenv.config();

const courseData = {
  "courses": [
    {
      "courseName": "C",
      "courseDescription": "Learn the basics of C programming, data structures, and algorithms.",
      "noOfLevels": 5,
      "levels": [
        {
          "levelNo": 1,
          "levelDescription": "Introduction to C programming.",
          "videoLinks": ["https://example.com/c-intro"]
        },
        {
          "levelNo": 2,
          "levelDescription": "Control structures and loops.",
          "videoLinks": ["https://example.com/c-loops"]
        },
        {
          "levelNo": 3,
          "levelDescription": "Functions and pointers.",
          "videoLinks": ["https://example.com/c-functions"]
        },
        {
          "levelNo": 4,
          "levelDescription": "Structures and file handling.",
          "videoLinks": ["https://example.com/c-structures"]
        },
        {
          "levelNo": 5,
          "levelDescription": "Advanced topics and project.",
          "videoLinks": ["https://example.com/c-project"]
        }
      ]
    },
    {
      "courseName": "C++",
      "courseDescription": "Master object-oriented programming with C++.",
      "noOfLevels": 5,
      "levels": [
        {
          "levelNo": 1,
          "levelDescription": "Introduction to C++.",
          "videoLinks": ["https://example.com/cpp-intro"]
        },
        {
          "levelNo": 2,
          "levelDescription": "Classes and objects.",
          "videoLinks": ["https://example.com/cpp-classes"]
        },
        {
          "levelNo": 3,
          "levelDescription": "Inheritance and polymorphism.",
          "videoLinks": ["https://example.com/cpp-inheritance"]
        },
        {
          "levelNo": 4,
          "levelDescription": "STL and templates.",
          "videoLinks": ["https://example.com/cpp-stl"]
        },
        {
          "levelNo": 5,
          "levelDescription": "Advanced topics and project.",
          "videoLinks": ["https://example.com/cpp-project"]
        }
      ]
    },
    {
      "courseName": "Python",
      "courseDescription": "Learn Python programming from beginner to advanced levels.",
      "noOfLevels": 5,
      "levels": [
        {
          "levelNo": 1,
          "levelDescription": "Introduction to Python and basics.",
          "videoLinks": ["https://example.com/python-intro"]
        },
        {
          "levelNo": 2,
          "levelDescription": "Control flow and functions.",
          "videoLinks": ["https://example.com/python-control"]
        },
        {
          "levelNo": 3,
          "levelDescription": "Data structures and modules.",
          "videoLinks": ["https://example.com/python-data"]
        },
        {
          "levelNo": 4,
          "levelDescription": "OOP and file handling.",
          "videoLinks": ["https://example.com/python-oop"]
        },
        {
          "levelNo": 5,
          "levelDescription": "Advanced topics and project.",
          "videoLinks": ["https://example.com/python-project"]
        }
      ]
    },
    {
      "courseName": "Java",
      "courseDescription": "Learn Java programming and build robust applications.",
      "noOfLevels": 5,
      "levels": [
        {
          "levelNo": 1,
          "levelDescription": "Introduction to Java and basics.",
          "videoLinks": ["https://example.com/java-intro"]
        },
        {
          "levelNo": 2,
          "levelDescription": "Control structures and arrays.",
          "videoLinks": ["https://example.com/java-control"]
        },
        {
          "levelNo": 3,
          "levelDescription": "Classes, objects, and methods.",
          "videoLinks": ["https://example.com/java-classes"]
        },
        {
          "levelNo": 4,
          "levelDescription": "Inheritance and polymorphism.",
          "videoLinks": ["https://example.com/java-inheritance"]
        },
        {
          "levelNo": 5,
          "levelDescription": "Advanced topics and project.",
          "videoLinks": ["https://example.com/java-project"]
        }
      ]
    },
    {
      "courseName": "MySQL",
      "courseDescription": "Learn database management and SQL queries with MySQL.",
      "noOfLevels": 5,
      "levels": [
        {
          "levelNo": 1,
          "levelDescription": "Introduction to databases and MySQL.",
          "videoLinks": ["https://example.com/mysql-intro"]
        },
        {
          "levelNo": 2,
          "levelDescription": "Basic SQL queries.",
          "videoLinks": ["https://example.com/mysql-queries"]
        },
        {
          "levelNo": 3,
          "levelDescription": "Joins and subqueries.",
          "videoLinks": ["https://example.com/mysql-joins"]
        },
        {
          "levelNo": 4,
          "levelDescription": "Stored procedures and triggers.",
          "videoLinks": ["https://example.com/mysql-procedures"]
        },
        {
          "levelNo": 5,
          "levelDescription": "Database design and project.",
          "videoLinks": ["https://example.com/mysql-project"]
        }
      ]
    }
  ]
};

async function seedCourses() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Insert the course data
    await Course.insertMany(courseData.courses);

    console.log('Courses inserted successfully!');
  } catch (err) {
    console.error('Error inserting courses:', err);
  } finally {
    // Disconnect from MongoDB after seeding
    mongoose.disconnect();
  }
}

seedCourses();
