import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, X, Lock } from 'lucide-react';
import { getArtworkImageUrl, getArtistImageUrl, getArtistAvatarSvg } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';

export default function ArtistsSection({
  artists,
  selectedArtist,
  setSelectedArtist,
  loadingArtistDetail,
  handleViewArtistDetail,
  viewArtworkDetail,
  currency,
  exchangeRates,
  websiteSettings = { hide_prices: false },
  guestSession,
  setIsGuestModalOpen
}) {
  const [selectedLetter, setSelectedLetter] = useState(() => {
    try {
      return sessionStorage.getItem('artists_selected_letter') || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  const [showBioModal, setShowBioModal] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const alphabets = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const handleLetterSelect = (letter) => {
    setSelectedLetter(letter);
    try {
      sessionStorage.setItem('artists_selected_letter', letter);
    } catch {}
  };

  const sortedArtists = [...artists].sort((a, b) =>
    (a.name || '').trim().localeCompare((b.name || '').trim(), undefined, { sensitivity: 'base' })
  );

  const filteredArtists = selectedLetter === 'ALL'
    ? sortedArtists
    : sortedArtists.filter(artist => {
      const name = (artist.name || '').trim();
      // Remove leading spaces, quotes, etc., for clean letter matching
      const cleanName = name.replace(/^["'\s]+/, '').toUpperCase();
      return cleanName.startsWith(selectedLetter);
    });

  React.useEffect(() => {
    let interval;
    if (showBioModal && selectedArtist && selectedArtist.artworks && selectedArtist.artworks.length > 0) {
      setCurrentSlideIndex(0);
      interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % selectedArtist.artworks.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showBioModal, selectedArtist]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowBioModal(false);
      }
    };
    if (showBioModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBioModal]);

  const formatBioHtml = (bioHtml) => {
    if (!bioHtml) return '';
    let formatted = bioHtml;
    // Replace dark text colors with CSS theme variable
    formatted = formatted.replace(/color:\s*#333333/gi, 'color: var(--text-secondary)');
    formatted = formatted.replace(/color:\s*#333/gi, 'color: var(--text-secondary)');
    formatted = formatted.replace(/color:\s*#666666/gi, 'color: var(--text-secondary)');
    formatted = formatted.replace(/color:\s*#666/gi, 'color: var(--text-secondary)');
    formatted = formatted.replace(/color:\s*#888888/gi, 'color: var(--text-secondary)');
    formatted = formatted.replace(/color:\s*#888/gi, 'color: var(--text-secondary)');

    // Replace orange, gold, yellow, and red highlights with var(--bio-highlight)
    formatted = formatted.replace(/color:\s*(#d4af37|#ff9900|#ffa500|#ffa600|orange|gold|rgb\(\s*255\s*,\s*165\s*,\s*0\s*\))/gi, 'color: var(--bio-highlight)');

    // Replace hardcoded white backgrounds with transparent
    formatted = formatted.replace(/background-color:\s*#ffffff/gi, 'background-color: transparent');
    formatted = formatted.replace(/background-color:\s*#fff/gi, 'background-color: transparent');
    formatted = formatted.replace(/background:\s*#ffffff/gi, 'background: transparent');
    formatted = formatted.replace(/background:\s*#fff/gi, 'background: transparent');
    return formatted;
  };

  return (
    <div className="page-content artists-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>
      <style>{`
        .alphabet-filter-container {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 3rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 1.5rem;
        }
        .alphabet-filter-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 100 !important;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
          user-select: none;
        }
        .alphabet-filter-btn:hover {
          color: var(--accent-gold);
          border-color: var(--accent-gold);
          background: rgba(212, 175, 55, 0.05);
          font-weight: 400 !important;
        }
        .alphabet-filter-btn.active {
          color: #000;
          background: var(--accent-gold);
          border-color: var(--accent-gold);
          font-weight: 400 !important;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
        }
        .alphabet-filter-btn:first-child {
          width: 54px;
          border-radius: 16px;
        }
        .artists-grid-4col {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }
        @media (max-width: 1200px) {
          .artists-grid-4col {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 992px) {
          .artists-grid-4col {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 576px) {
          .artists-grid-4col {
            grid-template-columns: 1fr;
          }
        }
        .artist-grid-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .artist-grid-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-gold);
          box-shadow: var(--shadow-gold), var(--shadow-premium);
        }
        .artist-card-img-container {
          height: 220px;
          overflow: hidden;
          background-color: var(--bg-input);
          border-bottom: 1px solid var(--border-color);
        }
        .artist-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .artist-grid-card:hover .artist-card-img {
          transform: scale(1.04);
        }
        .artist-card-content {
          padding: 1.25rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .artist-card-name {
          font-size: 14px !important;
          font-weight: 100;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
          line-height: 1.3;
        }
        .artist-card-title {
          font-size: 12px;
          color: var(--accent-gold);
          font-weight: 100;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
          display: block;
        }
        .artist-card-bio {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.6;
          margin: 0 0 1.25rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .artist-card-link-text {
          margin-top: auto;
          font-size: 12px;
          font-weight: 100;
          color: var(--accent-gold);
          transition: transform 0.3s ease;
        }
        .artist-grid-card:hover .artist-card-link-text {
          transform: translateX(4px);
        }
        
        /* Custom Table/Formatting inside the biography */
        .artist-bio-rendered {
          color: var(--text-secondary);
        }
        .artist-bio-rendered table {
          width: 100% !important;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-color) !important;
        }
        .artist-bio-rendered td {
          padding: 1rem 1.25rem !important;
          border: 1px solid var(--border-color) !important;
          vertical-align: top;
          color: var(--text-secondary);
        }
        body.light-theme .artist-bio-rendered table,
        body.light-theme .artist-bio-rendered td {
          border-color: rgba(0, 0, 0, 0.15) !important;
        }
        .artist-bio-rendered p {
          margin-bottom: 1rem;
        }
        .artist-bio-rendered strong,
        .artist-bio-rendered b,
        .artist-bio-rendered h1,
        .artist-bio-rendered h2,
        .artist-bio-rendered h3 {
          color: var(--text-primary) !important;
          font-weight: 100;
        }
        /* Style labels in the biography (first cell of table rows) */
        .artist-bio-rendered tr td:first-child,
        .artist-bio-rendered tr td:first-child * {
          color: var(--text-primary) !important;
          font-weight: 100 !important;
        }

        .status-inquiry {
          color: #000000 !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          font-family: 'Montserrat', sans-serif !important;
        }
        .status-available {
          color: #10b981 !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          font-family: 'Montserrat', sans-serif !important;
        }
        .status-sold {
          color: #ef4444 !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          font-family: 'Montserrat', sans-serif !important;
        }
        
        /* Biography Modal Layout */
        .bio-modal-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2.5rem;
          align-items: start;
        }
        
        .bio-slides-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: sticky;
          top: 0;
        }
        
        .bio-artist-profile {
          display: flex;
          gap: 1rem;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 1rem;
        }
        
        body.light-theme .bio-artist-profile {
          background: rgba(0, 0, 0, 0.02);
        }
        
        .bio-artist-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }
        
        .bio-slideshow-title {
          font-size: 12px;
          color: var(--bio-highlight);
          font-weight: 100;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        
        .bio-slideshow-frame {
          position: relative;
          width: 100%;
          height: 250px;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        
        @keyframes bioSlideIn {
          0% {
            transform: translateX(50px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .bio-slideshow-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          animation: bioSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .bio-slideshow-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(6px);
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          z-index: 10;
        }
        
        .bio-slideshow-info span,
        .bio-slideshow-info span:first-child {
          font-size: 12px !important;
          color: #ffffff !important;
          font-weight: 300 !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .bio-slideshow-info span:last-child {
          font-size: 12px !important;
          color: #ffffff !important;
          font-weight: 300 !important;
        }
        
        @media (max-width: 768px) {
          .bio-modal-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .bio-slides-column {
            position: static;
          }
        }
      `}</style>
      {loadingArtistDetail ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: 100 }}>
          Loading Artist Portfolio...
        </div>
      ) : selectedArtist ? (
        /* Artist Portfolio Detail View */
        <div>
          <button onClick={() => setSelectedArtist(null)} className="btn-secondary" style={{ marginBottom: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Artists List
          </button>

          <div className="glass-card" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '150px 1fr', gap: '2rem', alignItems: 'center', marginBottom: '3rem' }}>
            <img
              src={getArtistImageUrl(selectedArtist.profile_image, selectedArtist.name)}
              alt={selectedArtist.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getArtistAvatarSvg(selectedArtist.name);
              }}
              style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }}
            />
            <div>
              <h1 style={{ fontSize: '14px', marginBottom: '0.5rem', marginTop: '0.25rem' }}>{selectedArtist.name}</h1>
              {selectedArtist.bio && selectedArtist.bio.trim() !== '' && selectedArtist.bio !== 'Biography not available.' ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => setShowBioModal(true)}
                    className="btn-secondary"
                    style={{
                      padding: '0.5rem 1.25rem',
                      fontSize: '12px',
                      color: 'var(--accent-gold)',
                      borderColor: 'rgba(212, 175, 55, 0.4)',
                      background: 'rgba(212, 175, 55, 0.03)'
                    }}
                  >
                    Read Biography
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'Montserrat', marginTop: '0.5rem' }}>Biography not available.</p>
              )}
            </div>
          </div>

          <h2 style={{ fontSize: '14px', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>  {selectedArtist.name}</h2>
          {selectedArtist.artworks && selectedArtist.artworks.length > 0 ? (
            <div className="artworks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
              {selectedArtist.artworks.map((art) => (
                <div key={art.id} className="glass-card artwork-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'var(--transition-smooth)' }} onClick={() => viewArtworkDetail(art.id, selectedArtist.artworks)}>
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', height: '260px', width: '100%', backgroundColor: 'transparent' }}>
                    <img src={art.id ? getArtworkImageUrl(art.id) : (art.image || '')} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} className="art-grid-image" />
                    <div className="art-hover-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}>
                      <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '12px', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>View Details <ArrowRight size={14} /></span>
                    </div>
                  </div>
                  <div style={{ marginTop: '1.25rem' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>{art.medium_name || 'Oil on Canvas'}</p>
                    {(() => {
                      const dims = renderDimensions(art.width, art.length);
                      return (
                        <>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>
                            {dims.cmStr}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>
                            {dims.inStr}
                          </p>
                        </>
                      );
                    })()}
                    <h3 style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 0 0.25rem 0' }}>{art.title}</h3>
                    {!(art.status && (art.status.toLowerCase() === 'return' || art.status.toLowerCase() === 'archive' || art.status.toLowerCase() === 'archived')) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        {art.status && (art.status.toLowerCase() === 'sold' || art.status.toLowerCase() === 'soldout' || art.status.toLowerCase() === 'sold_out') ? (
                          <span className="status-sold" style={{ fontSize: '12px', fontWeight: 400, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                            Sold
                          </span>
                        ) : (
                          <>
                            <span 
                              className="status-inquiry" 
                              style={{ 
                                fontSize: '12px', 
                                fontWeight: 400, 
                                color: 'var(--text-primary)', 
                                fontFamily: 'Montserrat, sans-serif',
                                cursor: (!websiteSettings?.hide_prices && !guestSession) ? 'pointer' : 'default'
                              }}
                              onClick={(e) => {
                                if (!websiteSettings?.hide_prices && !guestSession && setIsGuestModalOpen) {
                                  e.stopPropagation();
                                  setIsGuestModalOpen(true);
                                }
                              }}
                              title={(!websiteSettings?.hide_prices && !guestSession) ? "Click to login & view price" : ""}
                            >
                              {(!websiteSettings?.hide_prices && guestSession && (!guestSession.expiry || new Date(guestSession.expiry) > new Date()))
                                ? formatPrice(art.price, currency, exchangeRates)
                                : 'Inquiry'}
                            </span>
                            <span className="status-available" style={{ fontSize: '12px', color: '#10b981', fontWeight: 400, fontFamily: 'Montserrat, sans-serif' }}>
                              Available
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No artworks registered for this artist.</p>
          )}
        </div>
      ) : (
        /* Artists Directory View */
        <div>


          {/* A-Z Alphabet Filter Navigation */}
          <div className="alphabet-filter-container">
            {alphabets.map(letter => (
              <button
                key={letter}
                onClick={() => handleLetterSelect(letter)}
                className={`alphabet-filter-btn ${selectedLetter === letter ? 'active' : ''}`}
              >
                {letter}
              </button>
            ))}
          </div>

          {filteredArtists.length > 0 ? (
            <div className="artists-grid-4col">
              {filteredArtists.map((artist) => {
                const hasProfilePic = artist.profile_image && artist.profile_image !== 'NULL' && artist.profile_image !== 'null' && artist.profile_image !== '' && !artist.profile_image.includes('undefined');
                const cardImgSrc = artist.latest_artwork_image
                  ? getArtworkImageUrl(artist.latest_artwork_image)
                  : (hasProfilePic ? getArtistImageUrl(artist.profile_image) : getArtistAvatarSvg(artist.name));

                return (
                  <div
                    key={artist.id}
                    className="glass-card artist-grid-card"
                    onClick={() => handleViewArtistDetail(artist.id)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  >
                    <div className="artist-card-img-container" style={{ height: '280px', overflow: 'hidden' }}>
                      <img
                        src={cardImgSrc}
                        alt={artist.name}
                        className="artist-card-img"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          if (hasProfilePic) {
                            e.target.src = getArtistImageUrl(artist.profile_image);
                          } else {
                            e.target.src = getArtistAvatarSvg(artist.name);
                          }
                        }}
                      />
                    </div>
                    <div className="artist-card-content" style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'space-between' }}>
                      <h2 className="artist-card-name" style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {artist.name}
                      </h2>
                      <div className="artist-card-link-text" style={{ fontSize: '13px', color: 'var(--accent-gold)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        View Artworks →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              No featured artists found starting with the letter "{selectedLetter}".
            </div>
          )}
        </div>
      )}

      {/*  ARTIST BIOGRAPHY MODAL */}
      {showBioModal && selectedArtist && (
        <div
          onClick={() => setShowBioModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '1100px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'var(--bg-dark, #0a0b0d)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <img
                  src={
                    (selectedArtist.profile_image && selectedArtist.profile_image !== 'NULL' && selectedArtist.profile_image !== 'null' && selectedArtist.profile_image !== '')
                      ? getArtistImageUrl(selectedArtist.profile_image)
                      : getArtworkImageUrl(selectedArtist.latest_artwork_image || selectedArtist.id)
                  }
                  alt={selectedArtist.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    objectFit: 'cover',
                    border: '1px solid var(--border-color)'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    if (selectedArtist.id) {
                      e.target.src = getArtworkImageUrl(selectedArtist.id);
                    }
                  }}
                />
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--bio-highlight)', fontWeight: 100, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Biography</span>
                  <h3 style={{ margin: '0.1rem 0 0 0', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 100 }}>{selectedArtist.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setShowBioModal(false)}
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                  e.currentTarget.style.color = 'var(--accent-gold)';
                  e.currentTarget.style.borderColor = 'var(--accent-gold)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div
              style={{
                padding: '2rem',
                overflowY: 'auto',
                flex: 1,
                color: 'var(--text-secondary)',
                fontSize: '12px',
                lineHeight: '1.7',
                maxHeight: '60vh'
              }}
              className="custom-scrollbar"
            >
              <div className="bio-modal-layout">
                {/* Left Side: Biography text */}
                {selectedArtist.bio && selectedArtist.bio.trim() ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: formatBioHtml(selectedArtist.bio) }}
                    className="artist-bio-rendered"
                  />
                ) : (
                  <div style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '150px'
                  }}>
                    Biography not available
                  </div>
                )}

                {/* Right Side: Work Slideshow */}
                <div className="bio-slides-column">
                  {/* Artworks Slideshow */}
                  {selectedArtist.artworks && selectedArtist.artworks.length > 0 ? (
                    <div>
                      <h4 className="bio-slideshow-title" style={{ marginTop: 0 }}>Artist's Work Gallery</h4>
                      <div className="bio-slideshow-frame">
                        <img
                          src={getArtworkImageUrl(selectedArtist.artworks[currentSlideIndex].id)}
                          alt={selectedArtist.artworks[currentSlideIndex].title}
                          className="bio-slideshow-img"
                          key={currentSlideIndex}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No artworks uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-color)', background: 'white', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBioModal(false)} className="btn-secondary" style={{ padding: '0.5rem 1.5rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
