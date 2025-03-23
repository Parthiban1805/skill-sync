const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb+srv://weacttech:Parthiban1805@cluster0.qf0if.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the schema
const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  times: [
    {
      day: { type: String, required: true },
      slots: [
        {
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
          available: { type: Boolean, default: true },
          seatCapacity: { type: Number, default: 60 },
        },
      ],
    },
  ],
});

// Create the model
const Venue = mongoose.model("Venue", venueSchema);

// Data to be inserted
const venueData = {
  name: "Conference Hall A",
  location: "123 Main Street, City Center",
  times: [
    {
      day: "Wednesday",
      slots: [
        { startTime: "09:00 AM", endTime: "10:00 AM", available: true, seatCapacity: 60 },
        { startTime: "10:00 AM", endTime: "11:00 AM", available: true, seatCapacity: 60 },
        { startTime: "08:30 PM", endTime: "12:00 PM", available: true, seatCapacity: 60 },
      ],
    },
    {
      day: "Tuesday",
      slots: [
        { startTime: "01:00 PM", endTime: "02:00 PM", available: true, seatCapacity: 60 },
        { startTime: "02:00 PM", endTime: "03:00 PM", available: false, seatCapacity: 60 },
        { startTime: "9:40 PM", endTime: "11:00 PM", available: true, seatCapacity: 60 },
      ],
    },
  ],
};

// Insert data into the database
async function insertData() {
  try {
    await Venue.create(venueData);
    console.log("Data inserted successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error inserting data:", error);
    mongoose.connection.close();
  }
}

// Execute the function
insertData();
