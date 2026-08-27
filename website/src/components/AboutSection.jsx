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

  const title = settings?.about_title || "About Mainframe";

  const subtitle = settings?.about_subtitle || "A premier gallery for contemporary art collections and bespoke framing craftsmanship.";

  const storyTitle = settings?.about_story_title || "Our Story";

  const storyContent = settings?.about_story_content || "Established with a mission to showcase fine art and foster dialogues between contemporary artists and curators, Mainframe The Gallery has stood as a hallmark of creativity in Karachi. We represent master painters, sketchers, and sculptors, and display collections ranging from historic calligraphy to avant-garde abstract works.";

  const framingTitle = settings?.about_framing_title || "Our Journey";

  const framingContent = settings?.about_framing_content || "Since inception, Mainframe has grown from a humble passion project into a premier visual arts gallery. Over the years, we have hosted numerous exhibitions, supported emerging talents, and crafted a signature curation space that bridges local mastery with global art lovers.";

  /* Vision & Mission Content */

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

    <div
      style={{
        animation: 'fadeIn 0.5s ease',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'var(--background-color)',
        color: 'var(--text-primary)',
        fontFamily: 'Montserrat, sans-serif'
      }}
    >

      {/* Hero Banner Section */}

      {storyImageUrl && (

        <div
          className="about-hero-container"
          style={{
            backgroundImage: `url(${storyImageUrl})`
          }}
        />

      )}

      {/* Section 1: Our Story */}

      <div
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          padding: '4rem 0',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >

        <div
          style={{
            width: '100%',
            padding: '0 2rem',
            boxSizing: 'border-box'
          }}
        >

          <h2
            className="about-story-heading"
            style={{
              color: 'var(--text-primary)',
              marginBottom: '1.5rem',
              fontSize: '14px',
              fontWeight: 400,
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {storyTitle}
          </h2>

          <p
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.8',
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {storyContent}
          </p>

        </div>

      </div>

      {/* Section 2: Our Journey Image Banner */}

      {framingImageUrl && (

        <div
          className="about-hero-container"
          style={{
            backgroundImage: `url(${framingImageUrl})`
          }}
        />

      )}

      {/* Section 2: Our Journey Text */}

      <div
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          padding: '4rem 0',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >

        <div
          style={{
            width: '100%',
            padding: '0 2rem',
            boxSizing: 'border-box'
          }}
        >

          <h2
            style={{
              color: 'var(--text-primary)',
              marginBottom: '1.5rem',
              fontSize: '14px',
              fontWeight: 400,
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {framingTitle}
          </h2>

          <p
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.8',
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {framingContent}
          </p>

        </div>

      </div>

      {/* Section 3: Vision Image Banner */}

      {visionImageUrl && (

        <div
          className="about-hero-container"
          style={{
            backgroundImage: `url(${visionImageUrl})`
          }}
        />

      )}

      <div
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          padding: '4rem 0',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >

        <div
          style={{
            width: '100%',
            padding: '0 2rem',
            boxSizing: 'border-box'
          }}
        >

          <h2
            style={{
              color: 'var(--text-primary)',
              marginBottom: '1.5rem',
              fontSize: '14px',
              fontWeight: 400,
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {visionTitle}
          </h2>

          <p
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.8',
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {visionContent}
          </p>

        </div>

      </div>

      {/* Section 4: Mission Image Banner */}

      {missionImageUrl && (

        <div
          className="about-hero-container"
          style={{
            backgroundImage: `url(${missionImageUrl})`
          }}
        />

      )}

      {/* Section 4: Mission Text */}

      <div
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          padding: '4rem 0',
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >

        <div
          style={{
            width: '100%',
            padding: '0 2rem',
            boxSizing: 'border-box'
          }}
        >

          <h2
            style={{
              color: 'var(--text-primary)',
              marginBottom: '1.5rem',
              fontSize: '14px',
              fontWeight: 400,
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {missionTitle}
          </h2>

          <p
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.8',
              fontFamily: 'Montserrat, sans-serif'
            }}
          >
            {missionContent}
          </p>

        </div>

      </div>

      {/* Section 5: Footer Location Details */}

      <div
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          padding: '4rem 0',
          color: 'var(--text-primary)',
          fontFamily: 'Montserrat, sans-serif'
        }}
      >

        <div
          style={{
            width: '100%',
            padding: '0 2rem',
            boxSizing: 'border-box'
          }}
        >

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '3rem'
            }}
          >

            <div>

              <strong
                style={{
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                Gallery Location
              </strong>

              <p
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: '1.6',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                F-73/9, Block 4 Clifton
                <br />
                Karachi, Pakistan
              </p>

            </div>

            <div>

              <strong
                style={{
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '14px',
                  fontWeight: 500,
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                Opening Hours
              </strong>

              <p
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: '1.6',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
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