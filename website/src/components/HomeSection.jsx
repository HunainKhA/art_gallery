import React, { useState, useEffect, useMemo } from 'react';
import { getArtworkImageUrl, getApiUrl } from '../services/api';

export default function HomeSection({ flashImages = [], exhibitions = [], artworks = [] }) {
  const [localImages, setLocalImages] = useState([]);

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

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Flash Images logic:
  // Desktop/Tablet: strictly uses desktop landscape banner (f.filename)
  // Mobile: media query activates and serves custom portrait mobile banner (f.mobile_filename || f.subcategory_id)
  const images = useMemo(() => {
    const flashList = (flashImages && flashImages.length > 0) ? flashImages : localImages;

    let list = [];
    if (flashList && flashList.length > 0) {
      list = flashList.map(flash => {
        if (isMobile) {
          return getArtworkImageUrl(flash.mobile_filename || flash.subcategory_id || flash.filename || flash.id);
        }
        return getArtworkImageUrl(flash.filename || flash.id);
      });
    } else if (exhibitions && exhibitions.length > 0) {
      list = exhibitions.slice(0, 8).map(ex => getApiUrl(`/api/crm/exhibitions/image/${ex.id}`));
    } else if (artworks && artworks.length > 0) {
      list = artworks.slice(0, 8).map(art => getArtworkImageUrl(art.filename || art.id));
    }

    // If only 1 flash image is currently uploaded, append artworks so the slider continues sliding seamlessly
    if (list.length === 1 && artworks && artworks.length > 0) {
      const extras = artworks.slice(0, 6).map(art => getArtworkImageUrl(art.filename || art.id));
      list = [...list, ...extras];
    }

    return list;
  }, [flashImages, exhibitions, artworks, localImages, isMobile]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // 4 seconds per slide

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div
        className="home-fullscreen-slider"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000000'
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
        backgroundColor: '#000000'
      }}
    >
      <style>{`
        .home-fullscreen-slider {
          width: 100vw;
          height: 100vh;
          max-width: 100%;
          background-color: #000000;
          box-sizing: border-box;
        }
        .home-slider-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
        }
        @media (min-width: 1025px) {
          .home-fullscreen-slider {
            height: 100vh;
            padding-top: 60px;
            padding-bottom: 20px;
          }
        }
        @media (max-width: 768px) {
          .home-fullscreen-slider {
            height: 100dvh !important;
            min-height: 100dvh !important;
            padding: 0 !important;
          }
          .home-slider-img {
            object-fit: contain !important;
            object-position: center center !important;
            background-color: #000000 !important;
          }
        }
      `}</style>
      {images.map((imgSrc, index) => {
        const isActive = index === currentIndex;

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : 'scale(1.03)',
              transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), transform 1.6s ease-out',
              zIndex: isActive ? 2 : 1,
              pointerEvents: isActive ? 'auto' : 'none',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={imgSrc}
              alt={`Slide ${index + 1}`}
              className="home-slider-img"
              style={{
                width: '100%',
                height: '100%',
                display: 'block'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
