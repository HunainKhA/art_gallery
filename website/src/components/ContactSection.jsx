import React from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';

export default function ContactSection() {
  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Google Map Section */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.3rem', margin: 0 }}>Find Us on Google Maps</h2>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem', alignItems: 'start' }}>

        {/* Contact Information card */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h2 style={{ color: 'var(--accent-gold)', fontSize: '1.4rem' }}>Gallery Location</h2>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <MapPin color="var(--accent-gold)" size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Address</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>F-73/8, Block 4 Clifton
                Karachi, Pakistan</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Phone color="var(--accent-gold)" size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Phone & Inquiries</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>+92 21 35870000 | info@mainframethegallery.com</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Clock color="var(--accent-gold)" size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Opening Hours</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>Mon - Sat: 11:00 AM - 8:00 PM (Sunday Closed)</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '1.5rem' }}>Send Us a Message</h2>
          <form onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully! Our curator will contact you."); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your Name</label>
              <input type="text" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email Address</label>
              <input type="email" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Message / Artwork Code Inquiry</label>
              <textarea rows="4" style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', resize: 'none' }} required placeholder="Enter details about calligraphic paintings or frame services..." />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>Send Inquiry Message</button>
          </form>
        </div>

      </div>
    </div>
  );
}
