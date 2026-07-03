import React, { useState, useEffect } from 'react';
import { getArtworkImageUrl } from '../services/api';

export default function HomeSection({ flashImages }) {
  // Default fallback premium art images
  const defaultImages = [
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200",
    "https://images.unsplash.com/photo-1579783928621-7a13d66a6211?w=1200",
    "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=1200",
    "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=1200"
  ];

  // Get image sources (prioritize actual Flash Images uploaded in Control Panel)
  const images = (flashImages && flashImages.length > 0)
    ? flashImages.map(flash => getArtworkImageUrl(flash.filename || flash.id))
    : defaultImages;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      // Trigger fade out
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        setFade(true); // Trigger fade in
      }, 200); // 200ms buffer for fade transition
    }, 2000); // Slide changes every 2 second

    return () => clearInterval(interval);
  }, [images]);

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Welcome Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'fadeInDown 0.6s ease' }}>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: 'var(--accent-gold, #cfa15c)',
          display: 'block',
          marginBottom: '0.5rem'
        }}>
          Welcome to
        </span>
        <h1 className="gradient-title" style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0 0 0.75rem 0', letterSpacing: '0.05em' }}>
          Mainframe The Gallery
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
          Karachi's premier destination for master contemporary art collections and bespoke conservation framing.
        </p>
      </div>

      {/* Sliding Image Banner */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          height: '480px',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-premium, 0 20px 40px rgba(0,0,0,0.3))'
        }}
      >
        {/* Absolute Background Sliding Image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src={images[currentIndex]}
            alt="Mainframe Slider Background"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.3s ease-in-out',
              opacity: fade ? 1 : 0.05
            }}
          />
        </div>
      </div>

    </div>
  );
}
