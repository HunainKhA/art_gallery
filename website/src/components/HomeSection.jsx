import React, { useState, useEffect, useMemo } from 'react';
import { getArtworkImageUrl, getApiUrl } from '../services/api';

export default function HomeSection({ flashImages = [], exhibitions = [], artworks = [] }) {
  const [localImages, setLocalImages] = useState([]);

  // Track device category for responsive auto-sizer slider (mobile, tablet, desktop)
  const [deviceType, setDeviceType] = useState(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width <= 640) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 640) {
        setDeviceType('mobile');
      } else if (width <= 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Self-healing direct fetch if parent state is loading/empty
  useEffect(() => {
    if (flashImages.length === 0 && exhibitions.length === 0 && artworks.length === 0) {
      fetch(getApiUrl('/api/crm/flashimages'))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalImages(data);
          } else {
            return fetch(getApiUrl('/api/artworks?limit=8'))
              .then(r => r.json())
              .then(artData => {
                if (Array.isArray(artData) && artData.length > 0) {
                  setLocalImages(artData.map(a => ({ filename: a.filename || a.id })));
                }
              });
          }
        })
        .catch(e => console.warn("Fallback slider fetch error:", e));
    }
  }, [flashImages, exhibitions, artworks]);

  // Get image sources based on Responsive Device detection (Mobile, Tablet, Desktop)
  const images = useMemo(() => {
    const flashList = (flashImages && flashImages.length > 0) ? flashImages : localImages;

    if (flashList && flashList.length > 0) {
      if (deviceType === 'mobile') {
        const mobileFlashes = flashList.filter(f => f.category_id === 'Mobile');
        if (mobileFlashes.length > 0) {
          return mobileFlashes.map(flash => getArtworkImageUrl(flash.filename || flash.id));
        }
        const tabFlashes = flashList.filter(f => f.category_id === 'Tablet' || f.category_id === 'All');
        if (tabFlashes.length > 0) {
          return tabFlashes.map(flash => getArtworkImageUrl(flash.filename || flash.id));
        }
      } else if (deviceType === 'tablet') {
        const tabFlashes = flashList.filter(f => f.category_id === 'Tablet');
        if (tabFlashes.length > 0) {
          return tabFlashes.map(flash => getArtworkImageUrl(flash.filename || flash.id));
        }
        const mobFlashes = flashList.filter(f => f.category_id === 'Mobile' || f.category_id === 'All');
        if (mobFlashes.length > 0) {
          return mobFlashes.map(flash => getArtworkImageUrl(flash.filename || flash.id));
        }
      } else {
        // Desktop
        const deskFlashes = flashList.filter(f => !f.category_id || f.category_id === 'Desktop' || f.category_id === 'All');
        if (deskFlashes.length > 0) {
          return deskFlashes.map(flash => getArtworkImageUrl(flash.filename || flash.id));
        }
      }

      // Universal fallback if no device-specific match
      return flashList.map(flash => getArtworkImageUrl(flash.filename || flash.id));
    }

    if (exhibitions && exhibitions.length > 0) {
      return exhibitions.slice(0, 8).map(ex => getApiUrl(`/api/crm/exhibitions/image/${ex.id}`));
    }
    if (artworks && artworks.length > 0) {
      return artworks.slice(0, 8).map(art => getArtworkImageUrl(art.filename || art.id));
    }
    return [];
  }, [flashImages, exhibitions, artworks, localImages, deviceType]);

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
