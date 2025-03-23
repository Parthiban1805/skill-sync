const mongoose = require('mongoose');
const Course = require('../models/learningmaterial'); // Adjust the path as needed
const coursesData = require('./learningmaterial.json'); // Importing the JSON data

// Replace with your MongoDB connection string
const mongoURI = 'mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
    insertCourses();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

async function insertCourses() {
  try {
    for (const course of coursesData) {
      // Find an existing course with the same ProgramName
      const existingCourse = await Course.findOne({ ProgramName: course.ProgramName });

      if (existingCourse) {
        console.log(`Course with ProgramName ${course.ProgramName} already exists. Updating levels and videos.`);

        for (const level of course.levels) {
          const existingLevel = existingCourse.levels.find(l => l.levelNo === level.levelNo);

          if (existingLevel) {
            console.log(`Level ${level.levelNo} already exists. Checking for new videos.`);

            // Append new videos to the existing level if not already present
            level.videos.forEach(newVideo => {
              const videoExists = existingLevel.videos.some(
                video => video.videoLink === newVideo.videoLink
              );

              if (!videoExists) {
                existingLevel.videos.push(newVideo);
                console.log(`Added new video to level ${level.levelNo}: ${newVideo.videoLink}`);
              }
            });
          } else {
            // Add the entire new level if it doesn't exist
            existingCourse.levels.push(level);
            console.log(`Added new level: ${level.levelNo}`);
          }
        }

        await existingCourse.save(); // Save the updated course
        console.log(`Updated course: ${course.ProgramName}`);
      } else {
        // Insert the new course
        await Course.create(course);
        console.log(`Inserted new course: ${course.ProgramName}`);
      }
    }
    console.log('Courses insertion/update process completed!');
    mongoose.connection.close(); // Close the connection after completion
  } catch (err) {
    console.error('Error inserting courses:', err);
    mongoose.connection.close(); // Close the connection on error
  }
}
