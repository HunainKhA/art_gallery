import React, { useState } from 'react';
import { MapPin, Phone, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { sendContactMessage } from '../services/api';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;

    setSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await sendContactMessage(formData);
      setStatus({
        type: 'success',
        message: res.message || 'Thank you! Your message has been sent to our gallery team.'
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Contact submit error:', err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to send message. Please try again or contact us directly.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content contact-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Google Map Section */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'var(--accent-gold)', fontSize: '18px', margin: 0 }}>Find Us on Google Maps</h2>
        <div style={{
          width: '100%',
          height: '280px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3621.597099161152!2d67.02904327436288!3d24.809246147306844!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33da65f8eb67f%3A0x2b80eec03a51e91c!2sMainframe%20The%20Gallery!5e0!3m2!1sen!2s!4v1782214173454!5m2!1sen!2s"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mainframe The Gallery Location Map"
          ></iframe>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        {/* <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Contact Us
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Get in touch, inquire about pricing, or schedule a custom framing consultation.
        </p> */}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2.5rem',
        alignItems: 'stretch',
        maxWidth: '1000px',
        margin: '0 auto 2rem'
      }}>

        {/* Contact Information card */}
        <div className="glass-card" style={{
          padding: '2rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Gallery Location
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', margin: 'auto 0', padding: '1.5rem 0' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <MapPin color="var(--text-primary)" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'block', fontWeight: 500 }}>Address</strong>
                <p style={{ color: 'var(--text-primary)', fontSize: '12px', marginTop: '0.25rem', lineHeight: '1.5', fontWeight: 400 }}>
                  F-73/9, Block 4 Clifton<br />Karachi, Pakistan
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <Phone color="var(--text-primary)" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'block', fontWeight: 500 }}>Phone & Inquiries</strong>
                <p style={{ color: 'var(--text-primary)', fontSize: '12px', marginTop: '0.25rem', lineHeight: '1.5', fontWeight: 400 }}>
                  +92 21 35870000 | info@mainframethegallery.com
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <Clock color="var(--text-primary)" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'block', fontWeight: 500 }}>Opening Hours</strong>
                <p style={{ color: 'var(--text-primary)', fontSize: '12px', marginTop: '0.25rem', lineHeight: '1.5', fontWeight: 400 }}>
                  Mon - Sat: 11:00 AM - 8:00 PM<br />(Sunday Closed)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-card" style={{
          padding: '2rem 2.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '1.25rem', fontWeight: 500 }}>
            Send Us a Message
          </h2>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {status.type === 'success' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                fontSize: '13px'
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{status.message}</span>
              </div>
            )}

            {status.type === 'error' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{status.message}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '0.35rem', fontWeight: 400 }}>
                Your Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '0.35rem', fontWeight: 400 }}>
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '0.35rem', fontWeight: 400 }}>
                Message / Artwork Code Inquiry
              </label>
              <textarea
                rows="3"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.65rem 1.25rem',
                fontSize: '12px',
                fontWeight: 300,
                marginTop: '0.25rem',
                border: 'none',
                fontFamily: 'Montserrat, sans-serif',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Sending Message...' : 'Send Inquiry Message'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
