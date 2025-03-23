const SlotBooking = require('./models/slotbooking');

const convertTo24HourFormat = (time) => {
    const [hours, minutes, modifier] = time.split(/[:\s]/);
    let hour24 = parseInt(hours, 10);
    if (modifier === 'PM' && hour24 !== 12) hour24 += 12;
    if (modifier === 'AM' && hour24 === 12) hour24 = 0;
    const result = `${hour24.toString().padStart(2, '0')}:${minutes}`;
    console.log(`🕒 Converting time: ${time} -> ${result}`);
    return result;
};

const getTimeAsDate = (time24, dayOffset = 0) => {
    const [hours, minutes] = time24.split(':');
    const now = new Date();
    console.log(`📅 Original date before adjustment: ${now}`);
    
    now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    console.log(`⚡ After setting hours/minutes: ${now}`);
    
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
    
    console.log(`📊 Day Offset Calculation:
    - Booking Day: ${bookingDay} (index: ${bookingIndex})
    - Current Day: ${currentDay} (index: ${currentIndex})`);
    
    if (bookingIndex === -1 || currentIndex === -1) {
        console.log('⚠️ Warning: Invalid day name detected');
        return 0;
    }
    
    let offset = bookingIndex - currentIndex;
    if (offset > 0) offset -= 7;
    console.log(`📏 Calculated offset: ${offset} days`);
    return offset;
};

const deleteExpiredBookings = async () => {
    try {
        console.log('\n=== Starting Expired Bookings Check ===\n');
        
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentTime24 = now.toTimeString().slice(0, 5);

        console.log(`🌟 Current System Time Information:
- Date: ${now}
- Day: ${currentDay}
- 24h Time: ${currentTime24}\n`);

        const bookings = await SlotBooking.find({});
        console.log(`📚 Retrieved ${bookings.length} total bookings from database`);
        
        console.log('\n=== Processing Each Booking ===\n');
        
        const expiredBookings = bookings.filter((booking) => {
            console.log(`\n📝 Analyzing booking:
- ID: ${booking._id}
- Day: ${booking.day}
- Start Time: ${booking.startTime}
- End Time: ${booking.endTime}`);

            const dayOffset = getDayOffset(booking.day, currentDay);
            const bookingEndTime24 = convertTo24HourFormat(booking.endTime);
            const bookingEndTimeDate = getTimeAsDate(bookingEndTime24, dayOffset);
            const currentTimeDate = new Date();

            console.log(`\n⚖️ Time Comparison:
- Booking End Time: ${bookingEndTimeDate}
- Current Time: ${currentTimeDate}
- Is Expired: ${currentTimeDate > bookingEndTimeDate}`);
            
            return currentTimeDate > bookingEndTimeDate;
        });

        console.log('\n=== Results ===\n');
        
        if (expiredBookings.length > 0) {
            console.log('🔍 Found Expired Bookings:');
            expiredBookings.forEach(booking => {
                console.log(`- ID: ${booking._id}
  Day: ${booking.day}
  Start Time: ${booking.startTime}
  End Time: ${booking.endTime}`);
            });

            const expiredIds = expiredBookings.map((booking) => booking._id);
            const result = await SlotBooking.deleteMany({ _id: { $in: expiredIds } });
            console.log(`\n🗑️ Deletion Result: Removed ${result.deletedCount} bookings`);
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

// Run function
console.log('\n🚀 Starting Slot Booking Cleanup Process\n');
deleteExpiredBookings().catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
});