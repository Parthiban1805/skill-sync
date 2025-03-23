const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
app.use(express.json());

const cors = require('cors');
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { existsSync, unlinkSync } = require("fs");
const cron = require('node-cron');

const PORT=5001
const loginRoute=require('./routes/loginRoute');
const learningMaterialRoute=require('./routes/learningRoute')
const programRoute=require('./routes/programRoute')
const eligibleLevelRoute=require("./routes/eligiblelevelRoute")
const move_program_studentRoute=require('./routes/move_program_student_registerRoute')
const venueRoute=require('./routes/venueRoute')
const questionaddRoute=require('./routes/questionaddRoute');
const compilerRoute=require('./routes/compilerRoute')
const submitRoute=require('./routes/submitRoute')
const mycourseRoute=require('./routes/mycourseRoute')
const deleteExpiredBookings = require('./deleteExpiredBookings'); // Assuming the function is exported
const adminRoute=require('./routes/AdminRoute')
const studymaterialRoute=require('./routes/studymaterialRoute');
const PracticeMarkRoute = require('./routes/praticescoreRoute');
const practicequestionaddRoute=require('./routes/practicequestionaddRoute')
const documentRoute=require('./routes/documentRoute')
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
const conn = mongoose.connection;
  
conn.once('open', () => {
    console.log('MongoDB connection is open');
  });
module.exports = conn;
cron.schedule('* * * * *', () => {
  console.log('Running task to delete expired bookings...');
  deleteExpiredBookings();
});
app.use('/skill-sync',loginRoute);
app.use('/skill-sync',learningMaterialRoute);
app.use('/skill-sync',programRoute);
app.use('/skill-sync',learningMaterialRoute);
app.use('/skill-sync',eligibleLevelRoute);
app.use('/skill-sync',move_program_studentRoute);
app.use('/skill-sync',venueRoute);
app.use('/skill-sync',questionaddRoute);
app.use('/skill-sync',compilerRoute);
app.use('/skill-sync',submitRoute);
app.use('/skill-sync',mycourseRoute);
app.use('/skill-sync',adminRoute)
app.use('/skill-sync',studymaterialRoute)
app.use('/skill-sync',PracticeMarkRoute)
app.use('/skill-sync',practicequestionaddRoute);
app.use('/skill-sync',documentRoute)
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
