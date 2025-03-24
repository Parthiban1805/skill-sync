const SlotBooking = require('./models/slotbooking');

const convertTo24HourFormat = (time) => {
    const [hours, minutes, modifier] = time.split(/[:\s]/);
    let hour24 = parseInt(hours, 10);
    if (modifier === 'PM' && hour24 !== 12) hour24 += 12;
    if (modifier === 'AM' && hour24 === 12) hour24 = 0;
    const result = `${hour24.toString().padStart(2, '0')}:${minutes}`;
    return result;
};

const getTimeAsDate = (time24, dayOffset = 0) => {
    const [hours, minutes] = time24.split(':');
    const now = new Date();
    
    now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    if (dayOffset !== 0) {
        now.setDate(now.getDate() + dayOffset);
        console.log(`🔄 After day offset (${dayOffset}): ${now}`);
    }
    return now;
};

const getDayOffset = (bookingDay, currentDay) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bookingIndex = days.indexOf(bookingDay);
    const currentIndex = days.indexOf(currentDay);
    
    if (bookingIndex === -1 || currentIndex === -1) {
        console.log('⚠️ Warning: Invalid day name detected');
        return 0;
    }
    
    let offset = bookingIndex - currentIndex;
    if (offset > 0) offset -= 7;
    return offset;
};

const deleteExpiredBookings = async () => {
    try {
        
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentTime24 = now.toTimeString().slice(0, 5);

      

        const bookings = await SlotBooking.find({});
        
        
        const expiredBookings = bookings.filter((booking) => {
           

            const dayOffset = getDayOffset(booking.day, currentDay);
            const bookingEndTime24 = convertTo24HourFormat(booking.endTime);
            const bookingEndTimeDate = getTimeAsDate(bookingEndTime24, dayOffset);
            const currentTimeDate = new Date();

           
            
            return currentTimeDate > bookingEndTimeDate;
        });

        
        if (expiredBookings.length > 0) {
            expiredBookings.forEach(booking => {
                console.log(`- ID: ${booking._id}
  Day: ${booking.day}
  Start Time: ${booking.startTime}
  End Time: ${booking.endTime}`);
            });

            const expiredIds = expiredBookings.map((booking) => booking._id);
            const result = await SlotBooking.deleteMany({ _id: { $in: expiredIds } });
        } else {
            console.log('✨ No expired bookings found');
        }
        
        console.log('\n=== Operation Complete ===\n');
    } catch (err) {
        console.error('❌ Error in deleteExpiredBookings:', err);
        console.error('Stack trace:', err.stack);
        throw err;
    }
};

deleteExpiredBookings().catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
});