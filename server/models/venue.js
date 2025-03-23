const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    times: [
      {
        date: { type: Date, required: true }, 

        day: { type: String, required: true },
        slots: [
          {
            startTime: { type: String, required: true },
            endTime: { type: String, required: true },
            available: { type: Boolean, default: true },
            seatCapacity: { type: Number, default: 60 },
          }
        ]
      }
    ]
  });
  
  const Venue = mongoose.model('Venue', venueSchema);
  
  // Booking function
  module.exports = Venue;
