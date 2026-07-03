import React from 'react';

export default function AboutSection() {
  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <h1 className="gradient-title">
          About Mainframe
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          A premier gallery for contemporary art collections and bespoke framing craftsmanship.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.8' }}>
        <div>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem', fontSize: '1.5rem' }}>Our Story</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Established with a mission to showcase fine art and foster dialogues between contemporary artists and curators, **Mainframe The Gallery** has stood as a hallmark of creativity in Karachi. We represent master painters, sketchers, and sculptors, and display collections ranging from historic calligraphy to avant-garde abstract works.
          </p>
        </div>
        <div>
          <h2 style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem', fontSize: '1.5rem' }}>Bespoke Framing Services</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            At Mainframe, we believe a frame does not just enclose a painting—it elevates it. Our "Framer's Heaven" workshop offers custom double and triple framing with premium local and imported mouldings, acid-free mats, and museum UV glass coatings.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '1rem' }}>
          <div>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.5rem' }}>Gallery Location</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>F-73/8, Block 4 Clifton
              Karachi, Pakistan</p>
          </div>
          <div>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.5rem' }}>Opening Hours</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Monday - Saturday: 11:00 AM - 8:00 PM (Sunday Closed)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
