import React, { useState, useEffect } from "react";
import { Check, X, Clock } from 'lucide-react';
import "./booking_modal.css";

const Modal = ({ show, onClose, onConfirm, slots }) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (show) {
            setIsAnimating(true);
        }
    }, [show]);

    if (!show) return null;

    const handleSlotChange = (event) => {
        const slotIndex = event.target.value;
        setSelectedSlot(slots[slotIndex]);
    };

    const confirmBooking = () => {
        if (selectedSlot) {
            onConfirm(selectedSlot);
            setIsAnimating(false);
        } else {
            alert("Please select a slot before confirming.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className={`modal-content ${isAnimating ? 'animate-modal' : ''}`}>
                <h3>
                    Book Slot
                </h3>
                <div className="dropdown-section">
                    <label htmlFor="slot-timings">Slot Timings</label>
                    <select
                        id="slot-timings"
                        value={selectedSlot ? slots.indexOf(selectedSlot) : ""}
                        onChange={handleSlotChange}
                        className="slot-dropdown"
                    >
                        <option value="" disabled>
                            Select a time slot...
                        </option>
                        {slots && slots.length > 0 ? (
                            slots.map((slot, index) => (
                                <option key={index} value={index}>
                                    {slot.startTime} - {slot.endTime} 
                                    {slot.available ? " (Available)" : " (Booked)"}
                                </option>
                            ))
                        ) : (
                            <option disabled>No slots available</option>
                        )}
                    </select>
                </div>
                <div className="modal-actions">
                    <button 
                        onClick={confirmBooking} 
                        className="confirm-button"
                        disabled={!selectedSlot}
                    >
                        <Check size={20} /> Book Now
                    </button>
                    <button 
                        onClick={onClose} 
                        className="cancel-button"
                    >
                        <X size={20} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;