import React, { useState, useEffect } from 'react';
import { fetchWebsiteSettings, getApiUrl } from '../services/api';

export default function AboutSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWebsiteSettings()
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading settings:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          gap: '1rem',
          width: '100%',
          backgroundColor: 'var(--background-color)',
          color: 'var(--text-primary)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >
        <div
          className="spin-animation"
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(212, 175, 55, 0.1)',
            borderTop: '3px solid var(--accent-gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <span
          style={{
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontFamily: 'Montserrat, sans-serif'
          }}
        >
          Loading About Us...
        </span>
      </div>
    );
  }

  const storyTitle = settings?.about_story_title || "Our Story";
  const storyContent = settings?.about_story_content || "Established with a mission to showcase fine art and foster dialogues between contemporary artists and curators, Mainframe The Gallery has stood as a hallmark of creativity in Karachi. We represent master painters, sketchers, and sculptors, and display collections ranging from historic calligraphy to avant-garde abstract works.";

  const framingTitle = settings?.about_framing_title || "Our Journey";
  const framingContent = settings?.about_framing_content || "Since inception, Mainframe has grown from a humble passion project into a premier visual arts gallery. Over the years, we have hosted numerous exhibitions, supported emerging talents, and crafted a signature curation space that bridges local mastery with global art lovers.";

  const visionTitle = settings?.about_vision_title || "Our Vision";
  const visionContent = settings?.about_vision_content || "To connect individuals with exquisite art and foster an inclusive ecosystem that inspires creativity, supports local artists, and brings world-class visual culture into daily life.";

  const missionTitle = settings?.about_mission_title || "Our Mission";
  const missionContent = settings?.about_mission_content || "To represent creative talent, preserve heritage through custom conservation-grade framing, and provide a premium, curation-first gallery space for art curators and collectors.";

  const storyImageUrl = settings?.about_story_image
    ? getApiUrl(`/api/settings/image/${settings.about_story_image}`)
    : null;

  const framingImageUrl = settings?.about_framing_image
    ? getApiUrl(`/api/settings/image/${settings.about_framing_image}`)
    : null;

  const visionImageUrl = settings?.about_vision_image
    ? getApiUrl(`/api/settings/image/${settings.about_vision_image}`)
    : null;

  const missionImageUrl = settings?.about_mission_image
    ? getApiUrl(`/api/settings/image/${settings.about_mission_image}`)
    : null;

  return (
    <div className="about-page-wrapper">
      {/* Scoped CSS for 100% width image banners and flush left typography */}
      <style>{`
        .about-page-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 0 4rem 0 !important;
          box-sizing: border-box !important;
        }
        .about-hero-container {
          width: 100% !important;
          max-width: 100% !important;
          position: relative !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .about-hero-img {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 85vh !important;
          object-fit: cover !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .about-content-section {
          width: 100% !important;
          max-width: 100% !important;
          padding: 2.25rem 2rem !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          display: block !important;
          text-align: left !important;
        }
        .about-content-inner {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
          box-sizing: border-box !important;
        }
        .about-heading,
        .about-location-title {
          font-size: 14px !important;
          font-weight: 100 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          color: var(--text-primary) !important;
          margin: 0 0 0.65rem 0 !important;
          text-align: left !important;
          font-family: 'Montserrat', sans-serif !important;
          display: block !important;
        }
        .about-paragraph {
          font-size: 12px !important;
          font-weight: 100 !important;
          line-height: 1.85 !important;
          color: var(--text-primary) !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
          font-family: 'Montserrat', sans-serif !important;
          letter-spacing: 0.02em !important;
          max-width: 100% !important;
        }
        .about-location-section {
          padding-top: 1.5rem !important;
        }
        .about-location-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 3.5rem !important;
          margin: 0 !important;
          padding-top: 1.5rem !important;
          border-top: 1px solid var(--border-color) !important;
          text-align: left !important;
          width: 100% !important;
        }
        .about-location-col {
          text-align: left !important;
        }

        /* Dark Theme colors (Matching Our Story in dark theme) */
        body:not(.light-theme) .about-heading,
        body:not(.light-theme) .about-location-title,
        body:not(.light-theme) .about-story-heading,
        body:not(.light-theme) .about-paragraph,
        body:not(.light-theme) .about-content-inner,
        body:not(.light-theme) .about-content-inner * {
          color: var(--text-primary) !important;
          -webkit-text-fill-color: var(--text-primary) !important;
        }

        /* Light Theme pure black typography matching footer */
        body.light-theme .about-heading,
        body.light-theme .about-location-title,
        body.light-theme .about-story-heading,
        body.light-theme .about-paragraph,
        body.light-theme .about-content-inner,
        body.light-theme .about-content-inner p,
        body.light-theme .about-content-inner h2,
        body.light-theme .about-content-inner strong {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          opacity: 1 !important;
        }

        @media (max-width: 768px) {
          .about-content-section {
            padding: 1.75rem 1.25rem !important;
          }
          .about-hero-img {
            max-height: 50vh !important;
          }
          .about-location-grid {
            grid-template-columns: 1fr !important;
            gap: 1.75rem !important;
          }
        }
      `}</style>

      {/* 1. Our Story Picture (Top) */}
      {storyImageUrl && (
        <div className="about-hero-container">
          <img
            src={storyImageUrl}
            alt={storyTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* 1. Our Story Text */}
      <div className="about-content-section">
        <div className="about-content-inner">
          <h2 className="about-heading about-story-heading">
            {storyTitle}
          </h2>
          <p className="about-paragraph">
            {storyContent}
          </p>
        </div>
      </div>

      {/* 2. Our Journey Picture */}
      {framingImageUrl && (
        <div className="about-hero-container">
          <img
            src={framingImageUrl}
            alt={framingTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* 2. Our Journey Text */}
      <div className="about-content-section">
        <div className="about-content-inner">
          <h2 className="about-heading">
            {framingTitle}
          </h2>
          <p className="about-paragraph">
            {framingContent}
          </p>
        </div>
      </div>

      {/* 3. Our Vision Picture */}
      {visionImageUrl && (
        <div className="about-hero-container">
          <img
            src={visionImageUrl}
            alt={visionTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* 3. Our Vision Text */}
      <div className="about-content-section">
        <div className="about-content-inner">
          <h2 className="about-heading">
            {visionTitle}
          </h2>
          <p className="about-paragraph">
            {visionContent}
          </p>
        </div>
      </div>

      {/* 4. Our Mission Picture */}
      {missionImageUrl && (
        <div className="about-hero-container">
          <img
            src={missionImageUrl}
            alt={missionTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* 4. Our Mission Text */}
      <div className="about-content-section">
        <div className="about-content-inner">
          <h2 className="about-heading">
            {missionTitle}
          </h2>
          <p className="about-paragraph">
            {missionContent}
          </p>
        </div>
      </div>

      {/* 5. Location Details & Hours */}
      <div className="about-content-section about-location-section">
        <div className="about-content-inner">
          <div className="about-location-grid">
            <div className="about-location-col">
              <strong className="about-location-title">
                Gallery Location
              </strong>
              <p className="about-paragraph">
                F-73/9, Block 4 Clifton
                <br />
                Karachi, Pakistan
              </p>
            </div>

            <div className="about-location-col">
              <strong className="about-location-title">
                Opening Hours
              </strong>
              <p className="about-paragraph">
                Monday - Saturday: 11:00 AM - 8:00 PM
                <br />
                (Sunday Closed)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}