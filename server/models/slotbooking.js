const mongoose = require('mongoose');

const slotbookingSchema=new mongoose.Schema({
    student_id: { type: String, required: true},
    venueId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Venue' },
    day: { type: String, required: true },
    date: { type: Date, required: true }, 

    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    levelName: { type: String, required: true },
    levelno:{type:Number,required:true},
    levelId: {
        type:mongoose.Schema.Types.ObjectId,  
        required: true,
        ref: 'AvailableProgram.levels',             
    },
})
const SlotBooking= mongoose.model('slotbooking', slotbookingSchema);
module.exports = SlotBooking;
