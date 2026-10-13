import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LiveCrowdWidget from '../components/LiveCrowdWidget';
import { socket, joinEventRoom, leaveEventRoom } from '../socket';
import { 
  Users, Calendar, Ticket, CheckSquare, Plus, Edit2, Trash2, Search, X, RefreshCw, Radio
} from 'lucide-react';

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to parse 12h time string (e.g., "09:00 AM") to 24h string (e.g., "09:00")
const parseTime12hTo24h = (time12h) => {
  if (!time12h) return '';
  const trimmed = time12h.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';
  let [_, hoursStr, minutes, ampm] = match;
  let hours = parseInt(hoursStr, 10);
  ampm = ampm.toUpperCase();
  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

// Helper to parse slot string (e.g., "09:00 AM - 05:00 PM") to start and end times
const parseTimeSlot = (timeSlotStr) => {
  if (!timeSlotStr || !timeSlotStr.includes('-')) {
    return { startTime: '', endTime: '' };
  }
  const parts = timeSlotStr.split('-');
  return {
    startTime: parseTime12hTo24h(parts[0]),
    endTime: parseTime12hTo24h(parts[1])
  };
};

// Helper to format 24h time (e.g., "17:00") to 12h AM/PM string (e.g., "05:00 PM")
const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour 0 should be 12
  const minutes = minutesStr;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
};

const AdminDashboard = () => {
  const { getAuthHeaders } = useAuth();
  
  // Dashboard overall summary metrics
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalCheckIns: 0
  });
  
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regSearch, setRegSearch] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  // Event modal creation state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [capacityLimit, setCapacityLimit] = useState(50);
  const [category, setCategory] = useState('Tech');
  const [bannerUrl, setBannerUrl] = useState('');
  const [price, setPrice] = useState(0);

  const categories = ['Tech', 'Music', 'Arts', 'Food', 'General'];
  
  // Banner presets
  const bannerPresets = [
    { name: 'Tech / Neon Coding', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60' },
    { name: 'Music / Laser Stage', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60' },
    { name: 'Arts / Modern Exhibition', url: 'https://images.unsplash.com/photo-1531058020387-3be344559be6?w=800&auto=format&fit=crop&q=60' },
    { name: 'Food / Culinary Gastronomy', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=60' }
  ];

  const fetchSummaryAndEvents = async () => {
    try {
      // 1. Fetch live metrics status
      const metricsRes = await fetch('/api/analytics/live-status', {
        headers: getAuthHeaders(),
      });
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.summary);
        setEvents(metricsData.events || []);

        // Default-select first event if none selected
        if (!selectedEventId && metricsData.events?.length > 0) {
          setSelectedEventId(metricsData.events[0].eventId);
        }
      }
    } catch (error) {
      console.error('Error loading admin statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`/api/registrations/event/${selectedEventId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch (error) {
      console.error('Error fetching registrations list:', error);
    }
  };

  useEffect(() => {
    fetchSummaryAndEvents();

    if (socket.connected) {
      setIsSocketConnected(true);
    } else {
      socket.connect();
    }

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    fetchRegistrations();

    if (selectedEventId) {
      joinEventRoom(selectedEventId);

      const handleAttendanceUpdate = (data) => {
        console.log('[AdminDashboard] Live attendance update received via Socket.IO:', data);
        if (data.eventId === selectedEventId) {
          // Update event currentCount
          setEvents((prevEvents) =>
            prevEvents.map((evt) =>
              evt.eventId === data.eventId
                ? { ...evt, currentCount: data.currentCount, capacityLimit: data.capacityLimit }
                : evt
            )
          );

          // Update registrations table
          if (data.registration) {
            setRegistrations((prevRegs) => {
              const idx = prevRegs.findIndex((r) => r._id === data.registration._id);
              if (idx !== -1) {
                const copy = [...prevRegs];
                copy[idx] = { ...copy[idx], ...data.registration };
                return copy;
              } else {
                return [data.registration, ...prevRegs];
              }
            });
          }

          // Update metrics summary
          fetchSummaryAndEvents();
        }
      };

      socket.on('attendanceUpdated', handleAttendanceUpdate);

      return () => {
        leaveEventRoom(selectedEventId);
        socket.off('attendanceUpdated', handleAttendanceUpdate);
      };
    }
  }, [selectedEventId]);

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setVenue('');
    setCapacityLimit(50);
    setCategory('Tech');
    setBannerUrl(bannerPresets[0].url);
    setPrice(0);
    setShowEventModal(true);
  };

  const handleOpenEditModal = (eventObj) => {
    setEditingEvent(eventObj);
    setTitle(eventObj.title);
    setDescription(eventObj.description);
    // Format date string to YYYY-MM-DD for standard date input field
    const dateFormatted = new Date(eventObj.date).toISOString().substring(0, 10);
    setDate(dateFormatted);
    const { startTime: sTime, endTime: eTime } = parseTimeSlot(eventObj.time);
    setStartTime(sTime);
    setEndTime(eTime);
    setVenue(eventObj.venue);
    setCapacityLimit(eventObj.capacityLimit);
    setCategory(eventObj.category);
    setBannerUrl(eventObj.bannerUrl);
    setPrice(eventObj.price || 0);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to permanently delete this event? All registered tickets will be removed.')) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        alert('Event successfully removed.');
        if (selectedEventId === eventId) {
          setSelectedEventId('');
        }
        fetchSummaryAndEvents();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete event');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();

    // Client-side verification
    const todayStr = getTodayDateString();
    if (date < todayStr) {
      alert('Event date must be in the future.');
      return;
    }

    if (date === todayStr) {
      const now = new Date();
      const currentHoursStr = String(now.getHours()).padStart(2, '0');
      const currentMinutesStr = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHoursStr}:${currentMinutesStr}`;
      if (startTime <= currentTimeStr) {
        alert('Event start time must be in the future.');
        return;
      }
    }

    if (startTime && endTime && startTime >= endTime) {
      alert('Event end time must be after start time.');
      return;
    }

    const timeSlotString = `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;

    const eventBody = {
      title,
      description,
      date,
      time: timeSlotString,
      venue,
      capacityLimit: Number(capacityLimit),
      category,
      bannerUrl,
      price: Number(price)
    };

    try {
      const url = editingEvent ? `/api/events/${editingEvent._id}` : '/api/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(eventBody)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save event');
      }

      setShowEventModal(false);
      fetchSummaryAndEvents();
    } catch (error) {
      alert(error.message);
    }
  };

  // Filter registrations by search keyword
  const filteredRegistrations = registrations.filter(reg => {
    const searchVal = regSearch.toLowerCase();
    return (
      reg.user?.name?.toLowerCase().includes(searchVal) ||
      reg.user?.email?.toLowerCase().includes(searchVal) ||
      reg.ticketCode?.toLowerCase().includes(searchVal)
    );
  });

  const selectedEventDetails = events.find(e => e.eventId === selectedEventId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>
              Crowd Control <span className="gradient-text">Console</span>
            </h1>
            <span 
              className={`badge ${isSocketConnected ? 'badge-success' : 'badge-warning'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <Radio size={12} style={{ animation: isSocketConnected ? 'pulseGlow 1.5s infinite' : 'none' }} />
              {isSocketConnected ? 'LIVE SOCKET STREAM' : 'SOCKET DISCONNECTED'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Manage events, monitor live occupants at the venue, and view real-time ticket databases.
          </p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary">
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: '1.25rem' 
      }}>
        
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', padding: '0.75rem', borderRadius: '10px' }}>
            <Calendar className="gradient-text" size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>TOTAL EVENTS</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.totalEvents}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', padding: '0.75rem', borderRadius: '10px' }}>
            <Users className="gradient-text" size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>REGISTERED USERS</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.totalUsers}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', padding: '0.75rem', borderRadius: '10px' }}>
            <Ticket className="gradient-text" size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>TICKETS ISSUED</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.totalRegistrations}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', padding: '0.75rem', borderRadius: '10px' }}>
            <CheckSquare className="gradient-text" size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CHECKED IN</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{metrics.totalCheckIns}</span>
          </div>
        </div>

      </div>

      {/* Main split dashboard view */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Events List & Registrations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Events List Container */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Active Event Catalog</h3>
            
            {loading ? (
              <p>Loading Catalog...</p>
            ) : events.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No events active. Create one to begin monitoring.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {events.map((evt) => (
                  <div 
                    key={evt.eventId} 
                    onClick={() => setSelectedEventId(evt.eventId)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1rem', 
                      background: selectedEventId === evt.eventId ? 'rgba(255, 65, 108, 0.05)' : 'rgba(255,255,255,0.01)', 
                      borderRadius: '10px', 
                      border: selectedEventId === evt.eventId ? '1px solid var(--border-glow)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <div>
                      <h4 style={{ color: 'white', fontSize: '0.95rem' }}>{evt.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Capacity: {evt.capacityLimit} | Booked: {evt.registrationsCount}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          const originalObj = {
                            _id: evt.eventId,
                            title: evt.title,
                            capacityLimit: evt.capacityLimit,
                            bannerUrl: events.find(x => x.eventId === evt.eventId)?.bannerUrl || '',
                            // lookup rest of the details from our fetched events list
                            ...events.find(x => x.eventId === evt.eventId)
                          };
                          handleOpenEditModal(originalObj);
                        }}
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem', borderRadius: '6px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(evt.eventId)}
                        className="btn btn-danger" 
                        style={{ padding: '0.35rem', borderRadius: '6px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registrations Attendee Table */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>Registered Attendees</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  For Selected Event: {selectedEventDetails?.title || 'None Selected'}
                </span>
              </div>
              
              {/* Search registrations */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Filter by name..." 
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem 0.4rem 2rem', fontSize: '0.8rem' }}
                />
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Ticket Code</th>
                    <th>Status</th>
                    <th>Checked In At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No registrants found.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg._id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'white' }}>{reg.user?.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reg.user?.email}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{reg.ticketCode}</td>
                        <td>
                          {reg.checkedIn ? (
                            <span className="badge badge-success">Checked-In</span>
                          ) : (
                            <span className="badge-warning" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>Pending</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {reg.checkedIn && reg.checkInTime
                            ? new Date(reg.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Live Crowd Monitor */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          {selectedEventDetails ? (
            <LiveCrowdWidget 
              event={{
                title: selectedEventDetails.title,
                currentCount: selectedEventDetails.currentCount,
                capacityLimit: selectedEventDetails.capacityLimit
              }}
              registrations={registrations}
            />
          ) : (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an event from the catalog to activate live monitoring dashboard.
            </div>
          )}
        </div>

      </div>

      {/* Creation/Edit Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '550px', border: '1px solid var(--border-glow)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem' }}>{editingEvent ? 'Edit Event Details' : 'Create Live Event'}</h3>
              <button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Event Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Web3 Creators Summit" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Provide an overview of the agenda..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={date} 
                    min={getTodayDateString()}
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Start Time</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">End Time</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Venue Location</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Silicon Valley Center, Room 40" 
                  value={venue} 
                  onChange={(e) => setVenue(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Capacity Limit</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={capacityLimit} 
                    onChange={(e) => setCapacityLimit(Number(e.target.value))} 
                    required 
                    min="1"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c} style={{ background: 'var(--bg-secondary)', color: 'white' }}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Price (₹)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={price} 
                    onChange={(e) => setPrice(Number(e.target.value))} 
                    required 
                    min="0"
                    placeholder="0 for free"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Event Banner Design Preset</label>
                <select className="form-control" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)}>
                  {bannerPresets.map((p) => (
                    <option key={p.url} value={p.url} style={{ background: 'var(--bg-secondary)', color: 'white' }}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEventModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Responsive layout fix for columns on mobile */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: 3fr 2fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};

export default AdminDashboard;
