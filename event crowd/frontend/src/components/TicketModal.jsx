import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react';

const TicketModal = ({ registration, onClose }) => {
  const [qrUrl, setQrUrl] = useState('');
  const { ticketCode, checkedIn, checkInTime, event } = registration;
  const userName = registration.attendeeName || registration.user?.name || 'Attendee';
  const userEmail = registration.attendeeEmail || registration.user?.email || '';
  const userPhone = registration.attendeePhone || '';

  const qrPayload = registration.ticketToken || ticketCode;

  useEffect(() => {
    if (qrPayload) {
      QRCode.toDataURL(qrPayload, {
        width: 180,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [qrPayload]);

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="ticket-wrapper">
          <div className="ticket-card">
            
            {/* Ticket Top: Header */}
            <div className="ticket-header">
              <span style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 700, 
                letterSpacing: '1px', 
                fontSize: '0.8rem',
                color: 'var(--primary-start)',
                textTransform: 'uppercase'
              }}>
                Official Entry Pass
              </span>
              <h2 className="ticket-event-title" style={{ marginTop: '0.25rem' }}>{event.title}</h2>
            </div>

            {/* Ticket Body: Details and QR Code */}
            <div className="ticket-body">
              
              {/* Check in status badge */}
              <div>
                {checkedIn ? (
                  <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                    <CheckCircle size={14} />
                    Checked In
                  </span>
                ) : (
                  <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                    <Clock size={14} />
                    Entry Pending
                  </span>
                )}
              </div>

              {/* QR Code */}
              <div className="ticket-qr-container">
                {qrUrl ? (
                  <img src={qrUrl} alt="Ticket QR Code" style={{ display: 'block', width: '150px', height: '150px' }} />
                ) : (
                  <div style={{ width: '150px', height: '150px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Ticket Code */}
              <div className="ticket-code">{ticketCode}</div>

              {/* Ticket Meta Details */}
              <div className="ticket-detail-grid">
                <div className="ticket-detail-item">
                  <span className="ticket-detail-label">Attendee</span>
                  <span className="ticket-detail-value">{userName}</span>
                </div>
                <div className="ticket-detail-item">
                  <span className="ticket-detail-label">Ticket Price</span>
                  <span className="ticket-detail-value">
                    {event.price > 0 ? `₹${event.price.toLocaleString('en-IN')}` : 'Free Entry'}
                  </span>
                </div>
                <div className="ticket-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="ticket-detail-label">Gate Code</span>
                  <span className="ticket-detail-value" style={{ fontFamily: 'monospace' }}>
                    EC-{event._id.substring(event._id.length - 6).toUpperCase()}
                  </span>
                </div>
                {registration.paymentId && (
                  <div className="ticket-detail-item" style={{ gridColumn: 'span 2' }}>
                    <span className="ticket-detail-label">Payment ID</span>
                    <span className="ticket-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {registration.paymentId}
                    </span>
                  </div>
                )}
                <div className="ticket-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="ticket-detail-label">Contact Details</span>
                  <span className="ticket-detail-value">
                    {userEmail} {userPhone ? `| ${userPhone}` : ''}
                  </span>
                </div>
                <div className="ticket-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="ticket-detail-label">Date & Time</span>
                  <span className="ticket-detail-value">{formatDate(event.date)} at {event.time}</span>
                </div>
                <div className="ticket-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="ticket-detail-label">Venue</span>
                  <span className="ticket-detail-value">{event.venue}</span>
                </div>
              </div>

            </div>

            {/* Ticket Footer */}
            <div className="ticket-footer">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Please present this QR code at the gate for scanning.<br />
                Duplicate ticket scans are restricted.
              </span>
            </div>

          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            Print Ticket
          </button>
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default TicketModal;
