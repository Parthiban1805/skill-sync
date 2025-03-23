const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student'); // Path to your Student model
const User = require('../models/User'); // Path to your User model
const router = express.Router();

// Environment variables
const dotenv = require('dotenv');
dotenv.config();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login request received:', { email });

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check in Student model first
    let user = await Student.findOne({ email });
    console.log('Student model lookup result:', user);

    // If user is not found in Student model, check in User model
    if (!user) {
      user = await User.findOne({ email });
      console.log('User model lookup result:', user);
    }

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', { email });
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Prepare user details
    const userDetails = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user instanceof Student) {
      userDetails.student_id = user.student_id;
      userDetails.semester = user.semester;
      userDetails.year = user.year;
      userDetails.department = user.department;
      userDetails.programRegistered = user.programRegistered; 
      userDetails.programCompleted = user.programCompleted;
    }

    console.log('User details to be included in token:', userDetails);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role, userDetails },
      process.env.JWT_SECRET,
      { expiresIn: '10h' }
    );

    console.log('Generated token:', token);

    res.status(200).json({ token, userDetails });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post('/google-login', async (req, res) => {
  const { email, displayName, uid } = req.body;

  console.log("🔹 Google Login Attempt:", { email, displayName, uid });

  try {
    let user = null;
    let role = null;
    let userDetails = {};

    // Check the email across all schemas
    console.log("🔍 Searching for user in Student schema...");
    user = await Student.findOne({ email });
    if (user) {
      console.log("✅ Student found:", user);
      role = 'student';
      userDetails = {
        name: user.name,
        email: user.email,
        student_id: user.student_id,
        semester: user.semester,
        boarding: user.boarding,
        year: user.year,
        class_advisor: user.class_advisor,
        department: user.department,
        photo_url: user.photo_url,
      };
    } else {
      console.log("🔍 Searching for user in Teacher schema...");
      user = await Teacher.findOne({ email });
      if (user) {
        console.log("✅ Teacher found:", user);
        role = 'teacher';
        userDetails = {
          name: user.name,
          email: user.email,
          teacher_id: user.teacher_id,
          department: user.department,
          subjects: user.subjects,
          photo_url: user.photo_url,
        };
      } else {
        console.log("🔍 Searching for user in Admin schema...");
        user = await Admin.findOne({ email });
        if (user) {
          console.log("✅ Admin found:", user);
          role = 'admin';
          userDetails = {
            name: user.name,
            email: user.email,
          };
        }
      }
    }

    if (!user) {
      console.log("❌ No user found with email:", email);
      return res.status(400).json({ msg: 'No user found with this email' });
    }

    console.log("🔍 Searching for user in Google Users collection...");
    

    console.log("🔐 Generating JWT token...");
    const token = jwt.sign({ userDetails, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    userDetails.role = role;
    console.log("✅ Google Login Successful:", { token, userDetails });

    res.status(200).json({ token, userDetails });
  } catch (err) {
    console.error("❌ Error in /google-login:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});
module.exports = router;
