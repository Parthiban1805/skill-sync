import sodium from 'libsodium-wrappers';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import python from '../../assets/python.png';
import Modal from '../../components/booking_modal/booking_modal';
import './learningmaterial.css';

const fixDateAndTime = (day, startTime) => {
  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const today = new Date();
  const targetDay = dayMap[day];
  if (targetDay === undefined) {
    console.error(`Invalid day: ${day}`);
    return null;
  }

  // Calculate the difference in days
  const currentDay = today.getDay();
  const dayDifference = (targetDay - currentDay + 7) % 7;

  // Get the target date
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + dayDifference);

  const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) {
    console.error(`Invalid time format: ${startTime}`);
    return null;
  }

  let [_, hours, minutes, period] = timeMatch;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

  // Set the time on the target date
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate.toISOString();
};

const SuccessModal = ({ show, onClose, bookingDetails }) => {
  if (!show) return null;

  return (
    <div className="success-modal-overlay">
      <div className="success-modal">
        <div className="success-icon"></div>
        <h2>Booking Successful!</h2>
        <div className="booking-details">
          <p>Your slot has been confirmed for:</p>
          <p><strong>{bookingDetails?.day}</strong></p>
          <p><strong>{bookingDetails?.startTime} - {bookingDetails?.endTime}</strong></p>
        </div>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

const LearningMaterial = () => {
  const { courseId } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const [userId, setuserId] = useState(null);
  const [studentId, setstudentId] = useState(null);
  const [venueId, setVenueId] = useState(null);
  const [material, setMaterial] = useState(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookedSlot, setBookedSlot] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successBookingDetails, setSuccessBookingDetails] = useState(null);
  const [day, setDay] = useState(null);
  const [date, setDate] = useState(null);
  const [isSlotActive, setIsSlotActive] = useState(false);
  const navigate = useNavigate();
  
  // Effect to fetch user details from session storage
  useEffect(() => {
    const fetchAllData = async () => {
      await sodium.ready;
  
      const encryptedData = sessionStorage.getItem("token");
      if (!encryptedData) {
        console.error("❌ No token found in sessionStorage!");
        return;
      }
  
      try {
        const { encrypted, nonce } = JSON.parse(encryptedData);
        console.log("🔐 Encrypted Token:", encrypted);
        console.log("🔑 Nonce:", nonce);
  
        const cryptoKey = sodium.from_base64(import.meta.env.VITE_SECRET_KEY);
  
        const decrypted = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(encrypted),
          sodium.from_base64(nonce),
          cryptoKey
        );
        console.log("🛠️ Decrypted Token:", decrypted);
  
        const token = new TextDecoder().decode(decrypted);
        console.log("📝 Decoded Token:", token);
  
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        console.log("💼 Decoded Payload:", decodedPayload);
  
        const { userDetails } = decodedPayload;
        console.log("👥 User Details:", userDetails);
  
        if (!userDetails) {
          console.error("❌ userDetails not found in token!");
          return;
        }
  
        setUserDetails(userDetails);
  
        const { student_id, id } = userDetails;
        setstudentId(student_id);
        setuserId(id);
    
      } catch (error) {
        console.error("❌ Token decryption failed:", error);
      }
    };
  
    fetchAllData();
  }, []);

  // Effect to fetch material and slots when courseId and userId are available
  useEffect(() => {
    const fetchMaterialAndSlots = async () => {
      try {
        console.log("Fetching Data for Student ID:", studentId);
        console.log("Fetching Data for User ID:", userId);
  
        if (!courseId || !userId) {
          console.error("Missing courseId or userId!");
          return;
        }
  
        const materialResponse = await fetch(
          `http://localhost:5001/skill-sync/learning-material/${courseId}/${userId}`
        );
        const slotResponse = await fetch(
          'http://localhost:5001/skill-sync/venue/slots'
        );
  
        console.log("Material Response Status:", materialResponse.status);
        console.log("Slot Response Status:", slotResponse.status);
  
        if (!materialResponse.ok || !slotResponse.ok) {
          console.error("API call failed:", materialResponse.status, slotResponse.status);
          return;
        }
  
        const materialData = await materialResponse.json();
        const slotData = await slotResponse.json();
  
        console.log("Material Data:", materialData);
        console.log("Slot Data:", slotData);
  
        // Handle Material Data
        const levelMaterial = materialData.nextLevel || materialData.currentLevel;
        if (!levelMaterial) {
          console.warn("No material found for this course.");
          setMaterial(null);
        } else {
          setMaterial(levelMaterial);
          console.log("Material Level ID:", levelMaterial?.level_id);
  
          if (levelMaterial?.videos?.length > 0) {
            setSelectedSubtitle(levelMaterial.videos[0]);
          }
  
          if (levelMaterial?.level_id) {
            fetchBookedSlot(levelMaterial.level_id);
          } else {
            console.warn("No level_id found for the material.");
          }
        }
  
        // Handle Slot Data
        if (!slotData.venues || slotData.venues.length === 0) {
          console.warn("No available slots found.");
          setSlots([]);
          setDay("");
          setVenueId("");
        } else {
          setSlots(slotData.venues[0]?.slots || []);
          setDate(slotData.venues[0]?.date || "")
          setDay(slotData.venues[0]?.day || "");
          
          setVenueId(slotData.venues[0]?.venueId || "");
  
          console.log("Updated Slots:", slotData.venues[0]?.slots || []);
          console.log("Updated Day:", slotData.venues[0]?.day || "");
          console.log("Updated Venue ID:", slotData.venues[0]?.venueId || "");
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
  
    fetchMaterialAndSlots();
  }, [courseId, userId, studentId]);

  // Function to fetch booked slot
  const fetchBookedSlot = async (levelId) => {
    try {
      const response = await fetch(
        `http://localhost:5001/skill-sync/venue/booked/${studentId}/${levelId}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log("boking", data.booking)

        setBookedSlot(data.booking);
      }
    } catch (err) {
      console.error('Error fetching booked slot:', err);
    }
  };

  // Effect to check if slot is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (!bookedSlot) {
        console.warn("Skipping slot activation: bookedSlot is missing.");
        return;
      }
  
      // Step 1: Get today's day in the same format as bookedSlot.day
      const today = new Date();
      const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' }); // Example: "Monday"
  
      console.log("Today's Day:", currentDay);
      const day = bookedSlot.day;
      console.log("Booked Slot Day:", day);
  
      // Step 2: Compare today's day with bookedSlot day
      if (currentDay !== day) {
        console.warn("Skipping slot activation: today is not the booked slot's day.");
        return;
      }
  
      // Step 3: Fix and compare times
      const startTime = fixDateAndTime(day, bookedSlot.startTime);
      const endTime = fixDateAndTime(day, bookedSlot.endTime);
  
      if (!startTime || !endTime) {
        console.warn("Skipping: Invalid start or end time.");
        return;
      }
  
      const currentTime = new Date().toISOString();
      const slotStartTime = new Date(startTime).toISOString();
      const slotEndTime = new Date(endTime).toISOString();
  
      console.log("Checking slot activation...");
      console.log("Current Time:", currentTime);
      console.log("Slot Start Time:", slotStartTime);
      console.log("Slot End Time:", slotEndTime);
  
      if (slotStartTime <= slotEndTime) {
        if (currentTime >= slotStartTime && currentTime <= slotEndTime) {
          console.log("✅ Slot is now active.");
          setIsSlotActive(true);
          clearInterval(interval);
        } else if (currentTime > slotEndTime) {
          console.log("❌ Slot has expired.");
          setIsSlotActive(false);
          clearInterval(interval);
        }
      } else {
        if (currentTime >= slotStartTime || currentTime <= slotEndTime) {
          console.log("✅ Slot is now active.");
          setIsSlotActive(true);
          clearInterval(interval);
        } else {
          console.log("❌ Slot is not active.");
          setIsSlotActive(false);
        }
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [bookedSlot]);

  // Effect to navigate to assessment when slot is active
  useEffect(() => {
    if (isSlotActive && material?.level_id) {
      navigate(`/assessment/${material.level_id}/guidelines`);
    }
  }, [isSlotActive, material?.level_id, navigate]);

  const handleStudyMaterialClick = () => {
    navigate(`/studymaterial/${courseId}`);
  };
  
  const handleConfirmBooking = async (slot) => {
    setIsBooking(true);
    closeModal();

    try {
      const response = await fetch('http://localhost:5001/skill-sync/venue/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId,
          studentId,
          day,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          levelName: material.levelName,
          levelNo: material.levelNo,
          levelId: material.level_id,
        }),
      });

      if (response.ok) {
        setBookedSlot({
          day,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
        setSuccessBookingDetails({
          day,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
        setShowSuccessModal(true);
      } else {
        alert('Failed to book slot');
      }
    } catch (err) {
      console.error('Error booking slot:', err);
    } finally {
      setIsBooking(false);
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessBookingDetails(null);
  };

  if (!material) return <p>Loading course material...</p>;
  
  return (
    <div className="course-container">
      <h1 className="course-title">{material?.levelName || 'Course Title'}</h1>

      <div className="video-container">
        <div className="video-wrapper">
          <iframe
            src={selectedSubtitle?.videoLink || ''}
            title="Learning Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            frameBorder="0"
          />
        </div>
      </div>

      <div className="content-wrapper">
        <div className="playlist-section">
          <h2 className="playlist-title">Course Playlist</h2>
          <ul className="playlist-items">
            {material?.videos?.length > 0 ? (
              material.videos.map((video, index) => (
                <li
                  key={index}
                  className={`playlist-item ${selectedSubtitle === video ? 'active' : ''}`}
                  onClick={() => setSelectedSubtitle(video)}
                >
                  <div className="video-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <span className="playlist-text">{video.levelDescription}</span>
                </li>
              ))
            ) : (
              <li className="playlist-item">No videos available</li>
            )}
              <li
                  className="playlist-item study-material"
                  onClick={handleStudyMaterialClick}
                >
                  <div className="video-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="playlist-text">Study Material</span>
                </li>
          </ul>
        </div>

        <div className="course-details">
          <div className="details-card">
            <img
              src={python}
              alt={`${material?.levelName || ""} Programming`}
              className="course-image"
            />
            <div className="card-content">
              <h3 className="card-title">{material?.levelName || "Course Title"}</h3>
              {selectedSubtitle && (
                <div className="subtitle-description">
                  <h4>Current Level Description:</h4>
                  <p>{selectedSubtitle.levelDescription}</p>
                </div>
              )}
              <div className="assessment-section">
                <h4 className="assessment-title">Available Slots</h4>
                {bookedSlot ? (
                  <div>
                    <p>Your Booked Slot:</p>
                    <p>Day: {bookedSlot.day}</p>
                    <p>Start Time: {bookedSlot.startTime}</p>
                    <p>End Time: {bookedSlot.endTime}</p>
                  </div>
                ) : (
                  <>
                    <button className="book-slot-button" onClick={openModal}>
                      Book Slot
                    </button>
                    <Modal
                      show={showModal}
                      onClose={closeModal}
                      onConfirm={handleConfirmBooking}
                      slots={slots}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SuccessModal
        show={showSuccessModal}
        onClose={closeSuccessModal}
        bookingDetails={successBookingDetails}
      />
    </div>
  );
};

export default LearningMaterial;