import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import './venuemanagement.css';

const VenueManagement = () => {
  const [venues, setVenues] = useState([]);
  const [editingVenue, setEditingVenue] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState(null);
  const [editingSlot, setEditingSlot] = useState({ venueId: null, timeIndex: null, slotIndex: null });

  useEffect(() => {
    fetchVenues();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchVenues = async () => {
    try {
      const response = await fetch('https://assessly-server.weacttech.com/skill-sync/venues');
      const data = await response.json();
      setVenues(data);
    } catch (err) {
      setError('Failed to fetch venues');
    }
  };

  const confirmDelete = (venue) => {
    setVenueToDelete(venue);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`https://assessly-server.weacttech.com/skill-sync/venues/${venueToDelete._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete venue');
      }
      
      setSuccess(`Successfully deleted ${venueToDelete.name}`);
      setShowDeleteModal(false);
      setVenueToDelete(null);
      fetchVenues();
      setTimeout(clearMessages, 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(clearMessages, 3000);
    }
  };

  const handleEdit = async (venue) => {
    if (editingVenue?.id === venue._id) {
      try {
        const response = await fetch(`https://assessly-server.weacttech.com/skill-sync/venues/${venue._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editingVenue.name,
            location: editingVenue.location,
            times: editingVenue.times
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update venue');
        }

        setSuccess(`Successfully updated ${venue.name}`);
        setEditingVenue(null);
        fetchVenues();
        setTimeout(clearMessages, 3000);
      } catch (err) {
        setError(err.message);
        setTimeout(clearMessages, 3000);
      }
    } else {
      setEditingVenue({ ...venue, id: venue._id });
    }
  };

  const handleTimeChange = (timeIndex, field, value) => {
    setEditingVenue(prev => {
      const newTimes = [...prev.times];
      newTimes[timeIndex] = { ...newTimes[timeIndex], [field]: value };
      return { ...prev, times: newTimes };
    });
  };

  const handleSlotChange = (timeIndex, slotIndex, field, value) => {
    setEditingVenue(prev => {
      const newTimes = [...prev.times];
      newTimes[timeIndex].slots[slotIndex] = {
        ...newTimes[timeIndex].slots[slotIndex],
        [field]: value
      };
      return { ...prev, times: newTimes };
    });
  };

  const addTimeSlot = () => {
    setEditingVenue(prev => ({
      ...prev,
      times: [...prev.times, {
        date: new Date().toISOString().split('T')[0],
        day: 'Monday',
        slots: [{
          startTime: '09:00',
          endTime: '17:00',
          available: true,
          seatCapacity: 60
        }]
      }]
    }));
  };

  const removeTimeSlot = (timeIndex) => {
    setEditingVenue(prev => ({
      ...prev,
      times: prev.times.filter((_, index) => index !== timeIndex)
    }));
  };

  const addSlot = (timeIndex) => {
    setEditingVenue(prev => {
      const newTimes = [...prev.times];
      newTimes[timeIndex].slots.push({
        startTime: '09:00',
        endTime: '17:00',
        available: true,
        seatCapacity: 60
      });
      return { ...prev, times: newTimes };
    });
  };

  const removeSlot = (timeIndex, slotIndex) => {
    setEditingVenue(prev => {
      const newTimes = [...prev.times];
      newTimes[timeIndex].slots = newTimes[timeIndex].slots.filter((_, index) => index !== slotIndex);
      return { ...prev, times: newTimes };
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  return (
    <div className="venue-container">
      <h1 className="venue-header">
        Venue Management
      </h1>
      
      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      {success && (
        <div className="success-message">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <Trash2 size={20} color="#ef4444" />
              Confirm Delete
            </div>
            <p>Are you sure you want to delete {venueToDelete?.name}?</p>
            <div className="modal-buttons">
              <button 
                className="button cancel-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={16} /> Cancel
              </button>
              <button 
                className="button confirm-button"
                onClick={handleDelete}
              >
                <Check size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {venues.map((venue) => (
        <div key={venue._id} className="venue-card">
          <div className="card-header">
            {editingVenue?.id === venue._id ? (
              <>
                <input
                  type="text"
                  value={editingVenue.name || ''}
                  onChange={(e) => setEditingVenue({ ...editingVenue, name: e.target.value })}
                  className="venue-input"
                  placeholder="Venue Name"
                />
                <input
                  type="text"
                  value={editingVenue.location || ''}
                  onChange={(e) => setEditingVenue({ ...editingVenue, location: e.target.value })}
                  className="venue-input"
                  placeholder="Location"
                />
              </>
            ) : (
              <>
                <div className="venue-name">
                  <Building size={16} color="#1e293b" />
                  {venue.name}
                </div>
                <div className="venue-location">
                  <MapPin size={14} color="#64748b" />
                  {venue.location}
                </div>
              </>
            )}
            
            <div className="button-group">
              <button
                onClick={() => handleEdit(venue)}
                className="button edit-button"
              >
                {editingVenue?.id === venue._id ? (
                  <><Check size={16} /> Save</>
                ) : (
                  <><Pencil size={16} /> Edit</>
                )}
              </button>
              <button
                onClick={() => confirmDelete(venue)}
                className="button delete-button"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>

          <div className="time-slots-container">
            {(editingVenue?.id === venue._id ? editingVenue.times : venue.times)?.map((time, timeIndex) => (
              <div key={timeIndex} className={editingVenue?.id === venue._id ? "time-slot-edit" : "time-slot"}>
                {editingVenue?.id === venue._id ? (
                  <>
                    <div className="slot-container">
                      <input
                        type="date"
                        value={formatDate(time.date)}
                        onChange={(e) => handleTimeChange(timeIndex, 'date', e.target.value)}
                        className="time-input"
                      />
                      <input
                        type="text"
                        value={time.day || ''}
                        onChange={(e) => handleTimeChange(timeIndex, 'day', e.target.value)}
                        className="time-input"
                      />
                      <button
                        onClick={() => removeTimeSlot(timeIndex)}
                        className="remove-button"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {time.slots?.map((slot, slotIndex) => (
                      <div key={slotIndex} className="slot-container">
                        <input
                          type="time"
                          value={slot.startTime || ''}
                          onChange={(e) => handleSlotChange(timeIndex, slotIndex, 'startTime', e.target.value)}
                          className="time-input"
                        />
                        <input
                          type="time"
                          value={slot.endTime || ''}
                          onChange={(e) => handleSlotChange(timeIndex, slotIndex, 'endTime', e.target.value)}
                          className="time-input"
                        />
                        <input
                          type="number"
                          value={slot.seatCapacity || 0}
                          onChange={(e) => handleSlotChange(timeIndex, slotIndex, 'seatCapacity', parseInt(e.target.value))}
                          className="capacity-input"
                        />
                        <input
                          type="checkbox"
                          checked={slot.available || false}
                          onChange={(e) => handleSlotChange(timeIndex, slotIndex, 'available', e.target.checked)}
                        />
                        <button
                          onClick={() => removeSlot(timeIndex, slotIndex)}
                          className="remove-button"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSlot(timeIndex)}
                      className="add-button"
                    >
                      <Plus size={16} /> Add Slot
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <Calendar size={14} color="#64748b" /> 
                      Date: {time.date ? new Date(time.date).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <Clock size={14} color="#64748b" />
                      Day: {time.day || 'N/A'}
                    </div>
                    {time.slots?.map((slot, slotIndex) => (
                      <div key={slotIndex}>
                        <Users size={14} color="#64748b" />
                        {slot.startTime || '00:00'} - {slot.endTime || '00:00'} 
                        (Capacity: {slot.seatCapacity || 0}, 
                        {slot.available ? ' Available' : ' Booked'})
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
            {editingVenue?.id === venue._id && (
              <button
                onClick={addTimeSlot}
                className="add-button"
              >
                <Plus size={16} /> Add Time Slot
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VenueManagement;