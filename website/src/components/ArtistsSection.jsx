import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { getArtworkImageUrl, getArtistImageUrl } from '../services/api';
import { formatPrice } from '../services/currency';

export default function ArtistsSection({
  artists,
  selectedArtist,
  setSelectedArtist,
  loadingArtistDetail,
  handleViewArtistDetail,
  viewArtworkDetail,
  currency,
  exchangeRates
}) {
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [showBioModal, setShowBioModal] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const alphabets = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const filteredArtists = selectedLetter === 'ALL'
    ? artists
    : artists.filter(artist => {
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
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
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
          font-size: 0.8rem;
          font-weight: 600;
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
        }
        .alphabet-filter-btn.active {
          color: #000;
          background: var(--accent-gold);
          border-color: var(--accent-gold);
          font-weight: 700;
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
          font-size: 1.15rem !important;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
          line-height: 1.3;
        }
        .artist-card-title {
          font-size: 0.75rem;
          color: var(--accent-gold);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
          display: block;
        }
        .artist-card-bio {
          color: var(--text-secondary);
          font-size: 0.8rem;
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
          font-size: 0.8rem;
          font-weight: 600;
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
          font-weight: 700;
        }
        /* Style labels in the biography (first cell of table rows) */
        .artist-bio-rendered tr td:first-child,
        .artist-bio-rendered tr td:first-child * {
          color: var(--text-primary) !important;
          font-weight: 600 !important;
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
          font-size: 0.8rem;
          color: var(--bio-highlight);
          font-weight: 600;
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
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .bio-slideshow-info span:first-child {
          font-size: 0.8rem;
          color: #ffffff;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70%;
        }
        
        .bio-slideshow-info span:last-child {
          font-size: 0.8rem;
          color: var(--accent-gold);
          font-weight: 700;
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', color: 'var(--accent-gold)', fontSize: '1.25rem', fontWeight: 600 }}>
          Loading Artist Portfolio...
        </div>
      ) : selectedArtist ? (
        /* Artist Portfolio Detail View */
        <div>
          <button onClick={() => setSelectedArtist(null)} className="btn-secondary" style={{ marginBottom: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Artists List
          </button>
          
          <div className="glass-card" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '150px 1fr', gap: '2rem', alignItems: 'center', marginBottom: '3rem' }}>
            <img src={getArtistImageUrl(selectedArtist.profile_image) || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300'} alt={selectedArtist.name} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>ARTIST PORTFOLIO</span>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', marginTop: '0.25rem' }}>{selectedArtist.name}</h1>
              {selectedArtist.bio && selectedArtist.bio.trim() !== '' && selectedArtist.bio !== 'Biography not available.' ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <button 
                    onClick={() => setShowBioModal(true)} 
                    className="btn-secondary" 
                    style={{ 
                      padding: '0.5rem 1.25rem', 
                      fontSize: '0.85rem', 
                      color: 'var(--accent-gold)', 
                      borderColor: 'rgba(212, 175, 55, 0.4)',
                      background: 'rgba(212, 175, 55, 0.03)'
                    }}
                  >
                    Read Biography
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', marginTop: '0.5rem' }}>Biography not available.</p>
              )}
            </div>
          </div>

          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Artworks by {selectedArtist.name}</h2>
          {selectedArtist.artworks && selectedArtist.artworks.length > 0 ? (
            <div className="artworks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
              {selectedArtist.artworks.map((art) => (
                <div key={art.id} className="glass-card artwork-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'var(--transition-smooth)' }} onClick={() => viewArtworkDetail(art.id)}>
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', height: '240px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={art.id ? getArtworkImageUrl(art.id) : (art.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500')} alt={art.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', transition: 'transform 0.5s ease' }} className="art-grid-image" />
                    <div className="art-hover-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}>
                      <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>View Details <ArrowRight size={14} /></span>
                    </div>
                  </div>
                  <div style={{ marginTop: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>By {selectedArtist.name}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      {art.status === 'Available' || art.status === 'not_sold' ? (
                        <>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {formatPrice(art.price, currency, exchangeRates)}
                          </span>
                          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>Available</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)' }}>Sold Out</span>
                          <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>Sold</span>
                        </>
                      )}
                    </div>
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
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 className="gradient-title">Our Featured Artists</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Meet the master painters, sketchers, and sculptors whose masterpieces are exhibited in Mainframe The Gallery.</p>
          </div>

          {/* A-Z Alphabet Filter Navigation */}
          <div className="alphabet-filter-container">
            {alphabets.map(letter => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`alphabet-filter-btn ${selectedLetter === letter ? 'active' : ''}`}
              >
                {letter}
              </button>
            ))}
          </div>
          
          {filteredArtists.length > 0 ? (
            <div className="artists-grid-4col">
              {filteredArtists.map((artist) => (
                <div 
                  key={artist.id} 
                  className="glass-card artist-grid-card" 
                  onClick={() => handleViewArtistDetail(artist.id)}
                >
                  <div className="artist-card-img-container">
                    <img 
                      src={getArtistImageUrl(artist.profile_image) || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300'} 
                      alt={artist.name} 
                      className="artist-card-img"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300';
                      }}
                    />
                  </div>
                  <div className="artist-card-content">
                    <h2 className="artist-card-name">{artist.name}</h2>
                    <span className="artist-card-title">{artist.title || 'Resident Artist'}</span>
                    <p className="artist-card-bio">
                      {artist.bio && artist.bio.trim() !== '' && artist.bio !== 'Biography not available.' 
                        ? (artist.bio.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) + '...')
                        : 'Biography not available.'
                      }
                    </p>
                    <div className="artist-card-link-text">
                      View Portfolio →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              No featured artists found starting with the letter "{selectedLetter}".
            </div>
          )}
        </div>
      )}

      {/* 📜 ARTIST BIOGRAPHY MODAL */}
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
                  src={getArtistImageUrl(selectedArtist.profile_image) || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'} 
                  alt={selectedArtist.name} 
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    objectFit: 'cover', 
                    border: '1px solid var(--border-color)' 
                  }} 
                />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--bio-highlight)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Biography</span>
                  <h3 style={{ margin: '0.1rem 0 0 0', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>{selectedArtist.name}</h3>
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
                fontSize: '0.95rem', 
                lineHeight: '1.7',
                maxHeight: '60vh'
              }}
              className="custom-scrollbar"
            >
              <div className="bio-modal-layout">
                {/* Left Side: Biography text */}
                <div 
                  dangerouslySetInnerHTML={{ __html: formatBioHtml(selectedArtist.bio) }} 
                  className="artist-bio-rendered"
                />

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
                        <div className="bio-slideshow-info">
                          <span>{selectedArtist.artworks[currentSlideIndex].title}</span>
                          <span>{formatPrice(selectedArtist.artworks[currentSlideIndex].price, currency, exchangeRates)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No artworks uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'flex-end' }}>
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
