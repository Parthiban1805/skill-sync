const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');

const Venue = require('../models/venue');
const SlotBooking = require('../models/slotbooking') // Define slot booking model

const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const upload = multer({ dest: 'uploads/' });


router.post('/add-venue', upload.single('file'), async (req, res) => {
  const { name, location } = req.body;

  console.log('Received request to add venue');
  console.log('Name:', name);
  console.log('Location:', location);

  if (!name || !location || !req.file) {
    console.log('Missing required fields: name, location, or file');
    return res.status(400).json({ error: 'Name, location, and CSV file are required.' });
  }

  const filePath = req.file.path;
  console.log('Uploaded file path:', filePath);

  try {
    const times = [];
    console.log('Parsing CSV file...');

    // Parse the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          console.log('Processing row:', row);
          
          // Ensure row contains necessary data and use `date` as the actual date column
          if (row.date && row.startTime && row.endTime && row.available && row.seatCapacity) {
            // Parse the date from 'dd.mm.yyyy' format
            const [day, month, year] = row.date.split('.');
            const parsedDate = new Date(`${year}-${month}-${day}`); // Convert to YYYY-MM-DD format
            
            if (!parsedDate.getTime()) {
              console.log(`Invalid date format for ${row.date}`);
              return;
            }

            const dayName = getDayName(parsedDate); // Get the day name for reference

            const slot = {
              date: parsedDate, // Store actual date
              day: dayName, // Keep day name for reference
              slots: [
                {
                  startTime: row.startTime,
                  endTime: row.endTime,
                  available: row.available.toLowerCase() === 'true',
                  seatCapacity: parseInt(row.seatCapacity, 10),
                },
              ],
            };
            console.log('Parsed slot:', slot);
            times.push(slot);
          } else {
            console.log('Skipping invalid row:', row);
          }
        })
        .on('end', () => {
          console.log('CSV parsing completed. Parsed times:', times);
          resolve();
        })
        .on('error', (error) => {
          console.error('Error while parsing CSV:', error);
          reject(error);
        });
    });

    // Save the venue data to the database
    console.log('Saving venue to the database...');
    const venue = new Venue({
      name,
      location,
      times,
    });

    await venue.save();
    console.log('Venue saved successfully:', venue);

    // Clean up the uploaded file
    console.log('Cleaning up uploaded file...');
    fs.unlinkSync(filePath);

    res.status(201).json({ message: 'Venue added successfully!', venue });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ error: 'Failed to process the CSV file.' });
  }
});


  
router.get('/venue/slots', async (req, res) => {
  try {
    console.log('Fetching slots for today across all venues...');

    // Get today's date and time
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = today.toTimeString().split(' ')[0]; // Get current time in HH:MM:SS format

    console.log(`Calculated today's date: ${today.toISOString()}, day: ${dayName}, time: ${currentTime}`);

    // Fetch all venues that have slots for today's day
    const venues = await Venue.find({ 'times.day': dayName });

    if (venues.length === 0) {
      console.warn(`No venues found for day: ${dayName}`);
      return res.status(200).json({ message: `No venues found for ${dayName}` });
    }

    // Process each venue to find available slots
    const venueSlots = venues.map((venue) => {
      // Find all time objects for today's day
      const daySlots = venue.times.filter((t) => t.day === dayName);

      // Flatten slots from multiple time entries & filter available slots
      const availableSlots = daySlots.flatMap((t) => t.slots)
        .filter((slot) => {
          // Convert startTime to 24-hour format for comparison
          const slotStartTime24 = convertTo24HourFormat(slot.startTime);
          return slotStartTime24 > currentTime; // Only future slots
        });

      return {
        venueId: venue._id,
        venueName: venue.name, // Assuming venue has a 'name' field
        day: dayName,
        date: today.toISOString().split('T')[0], // Use only the date part
        slots: availableSlots,
      };
    }).filter((venue) => venue.slots.length > 0); // Remove venues with no available slots

    // Log the results before sending the response
    console.log('Available venues and slots:', venueSlots);

    if (venueSlots.length === 0) {
      console.warn(`No available slots found for ${dayName}`);
      return res.status(200).json({ message: `No available slots for ${dayName}` });
    }

    res.json({ message: 'Available slots retrieved successfully.', venues: venueSlots });

  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Function to convert 12-hour format to 24-hour format
const convertTo24HourFormat = (time) => {
  const [hours, minutes, modifier] = time.split(/[:\s]/);
  let hour24 = parseInt(hours, 10);
  if (modifier === 'PM' && hour24 !== 12) hour24 += 12;
  if (modifier === 'AM' && hour24 === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, '0')}:${minutes}:00`; // Return in HH:MM:SS format
};



router.get('/venue/slots/tomorrow', async (req, res) => {
    try {
        console.log('Venue model:', Venue);

        console.log('Fetching slots for tomorrow...');

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const dayName = getDayName(tomorrow);
        console.log(`Calculated tomorrow's date: ${tomorrow.toISOString()}, day: ${dayName}`);

        const venue = await Venue.findOne({ 'times.day': dayName });
        if (!venue) {
            console.warn(`No venue found for day: ${dayName}`);
            return res.status(200).json({ message: `No venue found for ${dayName}` });
        }

        const daySlots = venue.times.find((t) => t.day === dayName);
        console.log(`Found venue: ${venue._id}, slots for ${dayName}:`, daySlots?.slots || []);

        res.json({
            venueId: venue._id,
            day: dayName,
            date: tomorrow.toISOString().split('T')[0],
            slots: daySlots?.slots || [],
        });
    } catch (err) {
        console.error('Error fetching slots:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



router.post('/venue/book', async (req, res) => {
  const { venueId, day,date, startTime, levelName, levelNo, levelId, endTime, studentId } = req.body;

  try {
      console.log('Booking slot request received:', { venueId, day, startTime, levelName, levelNo, levelId, endTime, studentId });

      const venue = await Venue.findById(venueId);
      if (!venue) {
          console.warn(`Venue not found for ID: ${venueId}`);
          return res.status(404).json({ message: 'Venue not found' });
      }

      console.log(`Found venue: ${venueId}`);

      // Retrieve all slots for the given day
      const daySlots = venue.times
          .filter((t) => t.day === day)
          .flatMap((t) => t.slots); // Flatten slot arrays

      if (!daySlots.length) {
          console.warn(`No slots available for day: ${day}`);
          return res.status(404).json({ message: 'No slots available for the specified day' });
      }

      console.log(`All slots available for ${day}:`, JSON.stringify(daySlots, null, 2));

      // Find the requested slot
      const slot = daySlots.find((s) => s.startTime.trim() === startTime.trim());
      
      if (!slot) {
          console.warn(`Slot not found for startTime: ${startTime}`);
          return res.status(404).json({ message: 'Slot not found' });
      }

      console.log(`Found slot:`, slot);

      if (!slot.available || slot.seatCapacity <= 0) {
          console.warn(`Slot is unavailable or fully booked. Slot details:`, slot);
          return res.status(400).json({ message: 'Slot is fully booked or unavailable' });
      }

      // Update slot availability
      slot.seatCapacity -= 1;
      if (slot.seatCapacity === 0) {
          slot.available = false;
      }

      console.log(`Updated slot after booking:`, slot);

      // Save changes to the venue
      await venue.save();

      // Save the booking request to the database
      const newBooking = new SlotBooking({
          student_id: studentId,
          date,
          day,
          venueId,
          startTime,
          endTime,
          levelName,
          levelno: levelNo,
          levelId,
      });

      await newBooking.save();

      console.log('Slot booking successful and saved:', newBooking);

      res.json({ message: 'Slot booked successfully!', slot, booking: newBooking });
  } catch (err) {
      console.error('Error booking slot:', err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/venue/booked/:studentId/:levelId', async (req, res) => {
    const { studentId, levelId } = req.params;

    try {
        const booking = await SlotBooking.findOne({ student_id: studentId,   levelId:levelId});
        if (!booking) {
            return res.status(404).json({ message: 'No booking found for the user.' });
        }

        res.json({ message: 'Booking found.', booking });
    } catch (err) {
        console.error('Error fetching booked slot:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/venues', async (req, res) => {
  try {
    const venues = await Venue.find();
    res.json(venues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single venue
router.get('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (venue) {
      res.json(venue);
    } else {
      res.status(404).json({ message: 'Venue not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create venue
router.post('/venues', async (req, res) => {
  const venue = new Venue({
    name: req.body.name,
    location: req.body.location,
    times: req.body.times
  });

  try {
    const newVenue = await venue.save();
    res.status(201).json(newVenue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update venue
router.put('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (req.body.name) venue.name = req.body.name;
    if (req.body.location) venue.location = req.body.location;
    if (req.body.times) venue.times = req.body.times;

    const updatedVenue = await venue.save();
    res.json(updatedVenue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.delete('/venues/:id', async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    await Venue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;
