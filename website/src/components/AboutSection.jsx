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
      {/* Hero Banner Section */}
      {storyImageUrl && (
        <div className="about-hero-container">
          <img
            src={storyImageUrl}
            alt={storyTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* Section 1: Our Story */}
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

      {/* Section 2: Our Journey Image Banner */}
      {framingImageUrl && (
        <div className="about-hero-container">
          <img
            src={framingImageUrl}
            alt={framingTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* Section 2: Our Journey Text */}
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

      {/* Section 3: Vision Image Banner */}
      {visionImageUrl && (
        <div className="about-hero-container">
          <img
            src={visionImageUrl}
            alt={visionTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* Section 3: Vision Text */}
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

      {/* Section 4: Mission Image Banner */}
      {missionImageUrl && (
        <div className="about-hero-container">
          <img
            src={missionImageUrl}
            alt={missionTitle}
            className="about-hero-img"
          />
        </div>
      )}

      {/* Section 4: Mission Text */}
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

      {/* Section 5: Location Details & Hours */}
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