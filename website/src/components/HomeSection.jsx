import React, { useState, useEffect, useMemo } from 'react';
import { getArtworkImageUrl } from '../services/api';

export default function HomeSection({ flashImages }) {
  // Default fallback premium art images
  const defaultImages = useMemo(() => [], []);

  // Get image sources (prioritize actual Flash Images uploaded in Control Panel)
  const images = useMemo(() => (flashImages && flashImages.length > 0)
    ? flashImages.map(flash => getArtworkImageUrl(flash.filename || flash.id))
    : defaultImages, [flashImages, defaultImages]);

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
    <div className="home-fullscreen-slider">
      <img
        src={images[currentIndex] || ''}
        alt="Mainframe Slider Background"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'opacity 0.6s ease-in-out',
          opacity: fade ? 1 : 0.1
        }}
      />
    </div>
  );
}
