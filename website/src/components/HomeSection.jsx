import React, { useState, useEffect, useMemo } from 'react';
import { getArtworkImageUrl, getApiUrl } from '../services/api';

export default function HomeSection({ flashImages = [], exhibitions = [], artworks = [] }) {
  // Get image sources (prioritize actual Flash Images, fallback to exhibitions or latest artworks)
  const images = useMemo(() => {
    if (flashImages && flashImages.length > 0) {
      return flashImages.map(flash => getArtworkImageUrl(flash.filename || flash.id));
    }
    if (exhibitions && exhibitions.length > 0) {
      return exhibitions.slice(0, 8).map(ex => getApiUrl(`/api/crm/exhibitions/image/${ex.id}`));
    }
    if (artworks && artworks.length > 0) {
      return artworks.slice(0, 8).map(art => getArtworkImageUrl(art.filename || art.id));
    }
    return [];
  }, [flashImages, exhibitions, artworks]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Stays on screen for 4 seconds before sliding

    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div
        className="home-fullscreen-slider"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent'
        }}
      />
    );
  }

  return (
    <div
      className="home-fullscreen-slider"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'transparent'
      }}
    >
      {images.map((imgSrc, index) => {
        let position = 'next';
        if (index === currentIndex) {
          position = 'active';
        } else if (
          index === (currentIndex - 1 + images.length) % images.length
        ) {
          position = 'prev';
        }

        let transformVal = 'translateX(100%)';
        let zIndexVal = 1;
        let transitionVal = 'transform 0.9s cubic-bezier(0.25, 1, 0.5, 1)';

        if (position === 'active') {
          transformVal = 'translateX(0)';
          zIndexVal = 2;
        } else if (position === 'prev') {
          transformVal = 'translateX(-100%)';
          zIndexVal = 1;
        } else {
          // Off-screen to the right without animation
          transformVal = 'translateX(100%)';
          zIndexVal = 0;
          transitionVal = 'none';
        }

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transform: transformVal,
              transition: transitionVal,
              zIndex: zIndexVal,
              willChange: 'transform'
            }}
          >
            <img
              src={imgSrc}
              alt={`Slide ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                display: 'block'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
