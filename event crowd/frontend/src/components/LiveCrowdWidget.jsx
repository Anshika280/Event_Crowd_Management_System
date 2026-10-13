import React from 'react';
import { Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const LiveCrowdWidget = ({ event, registrations = [] }) => {
  if (!event) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Select an event to view live crowd monitoring metrics.
      </div>
    );
  }

  const { title, currentCount, capacityLimit } = event;
  
  // Calculate occupancy percentage
  const percentOccupied = capacityLimit > 0 
    ? Math.min(Math.round((currentCount / capacityLimit) * 100), 100) 
    : 0;

  // Gauge SVG details
  const radius = 75;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentOccupied / 100) * circumference;

  // Determine warning levels
  const isNearCapacity = percentOccupied >= 90;
  const isFull = percentOccupied >= 100;

  // Filter registrations that are checked in, sorted by latest check-in
  const checkedInUsers = registrations
    .filter(r => r.checkedIn)
    .sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));

  return (
    <div className={`glass-panel ${isNearCapacity ? 'pulse-warning' : ''}`} style={{ padding: '1.75rem', transition: 'var(--transition-smooth)' }}>
      
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulseGlow 1.5s infinite' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Real-Time Occupancy Monitor
            </span>
          </div>
          <h3 style={{ fontSize: '1.25rem', marginTop: '0.15rem' }}>{title}</h3>
        </div>
        <div>
          {isFull ? (
            <span className="badge badge-danger" style={{ padding: '0.4rem 0.8rem', animation: 'pulseGlow 1s infinite alternate' }}>
              <AlertTriangle size={14} />
              FULL
            </span>
          ) : isNearCapacity ? (
            <span className="badge badge-warning" style={{ padding: '0.4rem 0.8rem' }}>
              <AlertTriangle size={14} />
              CRITICAL
            </span>
          ) : (
            <span className="badge badge-success" style={{ padding: '0.4rem 0.8rem' }}>
              <CheckCircle size={14} />
              STABLE
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* SVG Circular Gauge */}
        <div className="gauge-wrapper">
          <svg className="gauge-circle" viewBox="0 0 180 180">
            <defs>
              <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary-start)" />
                <stop offset="100%" stopColor="var(--primary-end)" />
              </linearGradient>
            </defs>
            <circle
              className="gauge-track"
              cx="90"
              cy="90"
              r={radius}
            />
            <circle
              className="gauge-fill"
              cx="90"
              cy="90"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="gauge-inner-text">
            <span className="gauge-value">{percentOccupied}%</span>
            <span className="gauge-label">Occupied</span>
          </div>
        </div>

        {/* Quick Numbers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: '1', minWidth: '180px' }}>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Inside</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{currentCount}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}> active attendees</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Capacity Limit</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{capacityLimit}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}> maximum permitted</span>
          </div>

        </div>

      </div>

      {/* Live Check-in Log */}
      <div style={{ marginTop: '2rem' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} className="gradient-text" />
          Recent Check-Ins ({checkedInUsers.length})
        </h4>

        <div style={{ 
          maxHeight: '160px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border-light)'
        }}>
          {checkedInUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No check-ins recorded yet for this event.
            </div>
          ) : (
            checkedInUsers.map((reg) => (
              <div 
                key={reg._id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.5rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  borderLeft: '2px solid var(--success)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'white' }}>{reg.user?.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    ({reg.user?.email})
                  </span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {new Date(reg.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default LiveCrowdWidget;
