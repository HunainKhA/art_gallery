import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Users, ShoppingCart, Home, Info, Calendar,
  BookOpen, Flame, Video, Mail, Search, Sun, Moon, Lock, Unlock,
  Menu, X, User, Check
} from 'lucide-react';
import { getLogoUrl, getApiUrl } from '../services/api';

export default function MainLayout({ children, state }) {
  const {
    activeTab,
    setActiveTab,
    exhibitionFilter,
    setExhibitionFilter,
    framerHeavenTab,
    setFramerHeavenTab,
    cartItems,
    searchQuery,
    handleSidebarSearch,
    handleSearchSubmit,
    setSelectedArtist,
    setSelectedCategory,
    setSelectedArtworkId,
    setSelectedExhibition,
    theme,
    toggleTheme,
    currency,
    setCurrency,
    websiteSettings,
    guestSession,
    setIsGuestModalOpen,
    handleGuestLogout
  } = state;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [exhibitions, setExhibitions] = useState([]);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [showSubscribePopup, setShowSubscribePopup] = useState(false);

  const lastScrollYRef = useRef(0);

  // Navbar is visible if locked open by click, hovered at top, or mobile menu open
  const isHeaderVisible = isPinnedOpen || isHovered || isMenuOpen;

  // Reset navbar to hidden on tab/view changes
  useEffect(() => {
    setIsPinnedOpen(false);
    setIsHovered(false);
    setIsMenuOpen(false);
    lastScrollYRef.current = 0;
  }, [activeTab]);

  // Auto-hide hover navbar when scrolling down (unless pinned open by click)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      const prevScrollY = lastScrollYRef.current;
      const delta = currentScrollY - prevScrollY;

      if (delta > 8 && currentScrollY > 60 && !isPinnedOpen) {
        setIsHovered(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPinnedOpen]);

  // Hover at top of screen (<= 35px) to peek navbar; leave (> 110px) to slide back up
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (window.innerWidth <= 1180) return;
      if (isPinnedOpen || isMenuOpen) return;

      if (e.clientY <= 35) {
        setIsHovered(true);
      } else if (e.clientY > 110) {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPinnedOpen, isMenuOpen]);

  const handleSubscribeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!subscribeEmail || !subscribeEmail.includes('@')) return;
    try {
      await fetch(getApiUrl('/api/subscribers/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail })
      });
    } catch (err) {
      console.error("Subscription error:", err);
    }
    setShowSubscribePopup(true);
    setSubscribeEmail('');
  };

  // Fetch exhibitions list on mount
  useEffect(() => {
    fetch(getApiUrl('/api/crm/exhibitions'))
      .then(res => res.json())
      .then(data => {
        setExhibitions(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error loading exhibitions for marquee:", err));
  }, []);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Determine active/upcoming exhibitions marquee message
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getExhibitionStatus = (activeDateStr, expDateStr) => {
    if (!activeDateStr) return 'previous';
    const start = new Date(activeDateStr);
    start.setHours(0, 0, 0, 0);
    if (expDateStr) {
      const end = new Date(expDateStr);
      end.setHours(23, 59, 59, 999);
      if (today < start) return 'upcoming';
      if (today > end) return 'previous';
      return 'current';
    } else {
      if (start.getTime() === today.getTime()) return 'current';
      if (start < today) return 'previous';
      return 'upcoming';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const activeOrUpcoming = exhibitions.filter(ex =>
    ['current', 'upcoming'].includes(getExhibitionStatus(ex.active_date, ex.exp_date))
  );

  // const marqueeTexts = activeOrUpcoming.map(ex => {
  //   const artistPart = ex.artist_name ? ` by ${ex.artist_name}` : '';
  //   const datePart = ex.exp_date
  //     ? `from ${formatDate(ex.active_date)} to ${formatDate(ex.exp_date)}`
  //     : `starting ${formatDate(ex.active_date)}`;
  //   return `★ Exhibition: "${ex.document_name}"${artistPart} (${datePart}) ★`;
  // });

  // const marqueeMessage = marqueeTexts.length > 0
  //   ? (marqueeTexts.join("       ") + "       ").repeat(4)
  //   : "";

  return (
    <div className={`app-wrapper  ${activeTab === 'home' ? 'is-home-view' : ''} ${activeTab === 'about' ? 'is-about-view' : ''}`}>

      {/* Hamburger Toggle Button (outside translated container so it stays fixed permanently) */}
      <button
        className={`hamburger-btn ${(isMenuOpen || isPinnedOpen) ? 'is-menu-active' : ''}`}
        onClick={() => {
          if (window.innerWidth > 1180) {
            // Desktop: toggle lock open / close
            setIsPinnedOpen(prev => !prev);
            setIsHovered(false);
          } else {
            // Mobile/Tablet: toggle full top-to-bottom shutter overlay menu
            setIsMenuOpen(prev => !prev);
          }
        }}
        aria-label="Toggle Menu"
      >
        {(isMenuOpen || isPinnedOpen) ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Invisible Top Edge Hover Strip to catch mouse hover at the top of screen */}
      <div
        className="top-hover-trigger-bar"
        onMouseEnter={() => {
          if (window.innerWidth > 1180 && !isPinnedOpen) {
            setIsHovered(true);
          }
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '35px',
          zIndex: 1090,
          pointerEvents: isHeaderVisible ? 'none' : 'auto'
        }}
      />

      {/* FLOATING HEADER GROUP (NAVBAR + MARQUEE) */}
      <div
        className={`floating-header-group ${isMenuOpen ? 'menu-open' : ''} ${!isHeaderVisible ? 'header-hidden' : ''}`}
        onMouseEnter={() => {
          if (window.innerWidth > 1180 && !isPinnedOpen) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (window.innerWidth > 1180 && !isPinnedOpen) {
            setIsHovered(false);
          }
        }}
      >
        {/*  TOP NAVBAR */}
        <header className="top-navbar">
          {/* Brand Logo (Left side) */}
          <div
            className="navbar-brand"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            onClick={() => {
              setActiveTab('home');
              setSelectedArtist(null);
              setSelectedCategory(null);
              setSelectedArtworkId(null);
              setIsMenuOpen(false);
            }}
          >
            <div className="logo-border-draw">
              <img
                src={getLogoUrl()}
                alt="Logo"
                style={{
                  height: '75px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          </div>

          {/*  Horizontal Navigation Links (Center) */}
          <nav className="desktop-nav">
            <button
              onClick={() => { setActiveTab('home'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveTab('about'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
            >
              About Us
            </button>
            <button
              onClick={() => { setActiveTab('collections'); setSelectedArtist(null); setSelectedCategory(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'collections' ? 'active' : ''}`}
            >
              Collections
            </button>
            <button
              onClick={() => { setActiveTab('artists'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'artists' ? 'active' : ''}`}
            >
              Artists
            </button>
            <button
              onClick={() => { setActiveTab('exhibitions'); setExhibitionFilter && setExhibitionFilter('previous'); setSelectedArtist(null); setSelectedArtworkId(null); setSelectedExhibition(null); }}
              className={`nav-link ${activeTab === 'exhibitions' ? 'active' : ''}`}
            >
              Exhibitions
            </button>
            <button
              onClick={() => { setActiveTab('catalogues'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'catalogues' ? 'active' : ''}`}
            >
              Catalogues
            </button>
            <button
              onClick={() => { setActiveTab('framer_heaven'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'framer_heaven' ? 'active' : ''}`}
            >
              Framer's Heaven
            </button>
            {/* <button
              onClick={() => { setActiveTab('videos'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'videos' ? 'active' : ''}`}
            >
              Videos
            </button> */}
            <button
              onClick={() => { setActiveTab('contact'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`nav-link ${activeTab === 'contact' ? 'active' : ''}`}
            >
              Contact Us
            </button>
          </nav>

          {/* Action Controls & Hamburger (Right side) */}
          <div className="navbar-actions">

            {/*  Guest Auth Button */}
            {!guestSession ? (
              <div
                onClick={() => setIsGuestModalOpen(true)}
                className="guest-btn-floating"
                title="Login"
              >
                <User size={17} className="login-lock-icon" />
              </div>
            ) : (
              <div
                onClick={() => setIsGuestModalOpen(true)}
                className="guest-btn-floating active"
                title="Session Unlocked"
              >
                <User size={17} />
                <button
                  onClick={(e) => { e.stopPropagation(); handleGuestLogout(); }}
                  className="guest-mini-lock-btn"
                >
                  Lock
                </button>
              </div>
            )}

            {/*  Floating Cart Button */}
            {!websiteSettings?.hide_add_to_cart && (
              <div
                onClick={() => { setActiveTab('shop'); setSelectedArtist(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
                className={`shop-btn-floating ${activeTab === 'shop' ? 'active' : ''}`}
              >
                <ShoppingCart size={20} />
                {cartItems.length > 0 && <span className="cart-count">{cartItems.length}</span>}
              </div>
            )}


            <div className="theme-switch-floating">
              <Moon size={12} style={{ color: theme === 'dark' ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
              <label className="theme-switch">
                <input
                  type="checkbox"
                  checked={theme === 'light'}
                  onChange={toggleTheme}
                />
                <span className="theme-slider"></span>
              </label>
              <Sun size={12} style={{ color: theme === 'light' ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
            </div>

          </div>
        </header>

        {/* 📜 SCROLLING MARQUEE BANNER
        {marqueeMessage && (
          <div className="exhibition-marquee-bar">
            <div className="marquee-content">
              {marqueeMessage}
            </div>
          </div>
        )} */}
      </div>

      {/* 📂 SLIDE-DOWN TRANSPARENT NAVIGATION OVERLAY */}
      <div className={`slide-down-menu ${isMenuOpen ? 'is-open' : ''}`}>

        {/* Overlay Navigation Links */}
        <nav className="overlay-nav">
          <button
            onClick={() => { setActiveTab('home'); setSelectedArtist(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
            className={`overlay-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          >
            Home
          </button>

          <button
            onClick={() => { setActiveTab('about'); setSelectedArtist(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
            className={`overlay-nav-btn ${activeTab === 'about' ? 'active' : ''}`}
          >
            About Us
          </button>

          <button
            onClick={() => { setActiveTab('collections'); setSelectedArtist(null); setSelectedCategory(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
            className={`overlay-nav-btn ${activeTab === 'collections' ? 'active' : ''}`}
          >
            Collections
          </button>

          <button
            onClick={() => { setActiveTab('artists'); setSelectedArtist(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
            className={`overlay-nav-btn ${activeTab === 'artists' ? 'active' : ''}`}
          >
            Artists
          </button>

          {/* Exhibitions Accordion Option */}
          <div className="overlay-nav-group">
            <button
              onClick={() => { setActiveTab('exhibitions'); setExhibitionFilter && setExhibitionFilter('previous'); setSelectedArtist(null); setSelectedArtworkId(null); setSelectedExhibition(null); }}
              className={`overlay-nav-btn ${activeTab === 'exhibitions' ? 'active' : ''}`}
            >
              Exhibitions
            </button>
            {activeTab === 'exhibitions' && (
              <div className="overlay-submenu">
                <button
                  onClick={() => { setExhibitionFilter('previous'); setSelectedExhibition(null); setIsMenuOpen(false); }}
                  className={`overlay-submenu-btn ${exhibitionFilter === 'previous' ? 'active' : ''}`}
                >
                  Previous Shows
                </button>
                <button
                  onClick={() => { setExhibitionFilter('current'); setSelectedExhibition(null); setIsMenuOpen(false); }}
                  className={`overlay-submenu-btn ${exhibitionFilter === 'current' ? 'active' : ''}`}
                >
                  Current Shows
                </button>
                <button
                  onClick={() => { setExhibitionFilter('upcoming'); setSelectedExhibition(null); setIsMenuOpen(false); }}
                  className={`overlay-submenu-btn ${exhibitionFilter === 'upcoming' ? 'active' : ''}`}
                >
                  Upcoming Shows
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => { setActiveTab('catalogues'); setSelectedArtist(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
            className={`overlay-nav-btn ${activeTab === 'catalogues' ? 'active' : ''}`}
          >
            Catalogues
          </button>

          {/* Framer's Heaven Accordion Option */}
          <div className="overlay-nav-group">
            <button
              onClick={() => { setActiveTab('framer_heaven'); setSelectedArtist(null); setSelectedArtworkId(null); }}
              className={`overlay-nav-btn ${activeTab === 'framer_heaven' ? 'active' : ''}`}
            >
              Framer's Heaven
            </button>
            {activeTab === 'framer_heaven' && (
              <div className="overlay-submenu">
                <button
                  onClick={() => { setFramerHeavenTab('Product'); setIsMenuOpen(false); }}
                  className={`overlay-submenu-btn ${framerHeavenTab === 'Product' ? 'active' : ''}`}
                >
                  • Products
                </button>
                <button
                  onClick={() => { setFramerHeavenTab('Service'); setIsMenuOpen(false); }}
                  className={`overlay-submenu-btn ${framerHeavenTab === 'Service' ? 'active' : ''}`}
                >
                  • Services
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => { setActiveTab('contact'); setSelectedArtist(null); setSelectedArtworkId(null); setIsMenuOpen(false); }}
            className={`overlay-nav-btn ${activeTab === 'contact' ? 'active' : ''}`}
          >
            Contact Us
          </button>
        </nav>

      </div>

      {/*  MAIN CONTENT AREA */}
      <main className={`main-content ${activeTab === 'about' ? 'is-about-view' : ''}`} style={activeTab === 'about' ? { paddingTop: 0 } : {}}>

        {children}

        {/* Global Footer in Main Panel */}
        <footer className="global-footer">
          <div className="footer-left">
            <div className="footer-copyright">
              <p style={{ margin: 0 }}>© 2026 Mainframe The Gallery. All Rights Reserved.</p>
              <p style={{ margin: 0 }}>Developed by <a href="https://www.facebook.com/hunain.khan.942/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Hunain Khan</a>.</p>
            </div>
            {/* Social Icons & Try Frames Promo below copyright */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
              <div className="footer-socials" style={{ margin: 0 }}>
                <a href="https://www.facebook.com/mainframethegallery" target="_blank" rel="noopener noreferrer" title="Facebook" className="facebook-link">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="https://www.instagram.com/mainframethegallery" target="_blank" rel="noopener noreferrer" title="Instagram" className="instagram-link">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="twitter-link">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                </a>
              </div>

              {/* Try Frames on your Painting Promo */}
              <div className="try-frames-footer-promo" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="try-frames-label" style={{ fontSize: '12px' }}>
                  Try Frames on your Painting
                </span>
                <a
                  href="https://karachi.mainframethegallery.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="try-frames-btn"
                >
                  TRY IT
                </a>
              </div>
            </div>
          </div>

          {/* Footer Right Column: Subscribe & Search Bar */}
          <div className="footer-right-column">
            {/* Newsletter / Subscribe Box */}
            <div className="footer-search footer-subscribe-box">
              <form
                onSubmit={handleSubscribeSubmit}
                style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}
              >
                <input
                  type="email"
                  placeholder="Subscribe to Newsletter..."
                  className="footer-search-input footer-subscribe-input"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="footer-search-icon footer-subscribe-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto'
                  }}
                  title="Subscribe to updates"
                >
                  <Mail size={16} />
                </button>
              </form>
            </div>

            {/*  Footer Search Bar */}
            <div className="footer-search">
              <input
                type="text"
                placeholder="Search painting..."
                className="footer-search-input"
                value={searchQuery}
                onChange={(e) => handleSidebarSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
              />
              <Search
                size={16}
                className="footer-search-icon"
                style={{ cursor: 'pointer' }}
                onClick={handleSearchSubmit}
              />
            </div>
          </div>
        </footer>

      </main>

      {/* Subscribe Confirmation Message Box */}
      {showSubscribePopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem',
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setShowSubscribePopup(false)}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              background: 'var(--bg-glass)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSubscribePopup(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <Check size={28} />
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: 500,
              margin: '0 0 0.75rem 0',
              color: 'var(--text-primary)',
              fontFamily: 'Montserrat, sans-serif'
            }}>
              Thank You!
            </h3>

            <p style={{
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              margin: '0 0 1.75rem 0',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 400
            }}>
              thanks for subscribe now you can receive our updates Via email
            </p>

            <button
              className="btn-primary"
              onClick={() => setShowSubscribePopup(false)}
              style={{
                padding: '0.65rem 2.25rem',
                fontSize: '13px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: 'var(--accent-gold)',
                color: '#000000'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/923008285600"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp"
        className="whatsapp-fab"
        style={{ borderRadius: '50%' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* CSS Animation & Hover Effects */}
      <style>{`
        /* Logo Border Draw Animation (Works across all pages & themes) */
        .logo-border-draw {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border-radius: 0;
          overflow: visible;
        }

        .logo-border-draw::before,
        .logo-border-draw::after {
          content: '';
          position: absolute;
          pointer-events: none;
        }

        .logo-border-draw::after {
          inset: 2px;
          background: transparent;
          border-radius: 0;
          z-index: 0;
        }

        /* 4-side animated border lines (Dark Theme: White/Gold, Light Theme: Dark/Black) */
        .logo-border-draw::before {
          inset: 0;
          z-index: 2;
          background:
            linear-gradient(90deg,  #ffffff, #ffffff) top    left  / 0% 2px no-repeat,
            linear-gradient(180deg, #ffffff, #ffffff) top    right / 2px 0% no-repeat,
            linear-gradient(270deg, #ffffff, #ffffff) bottom right / 0% 2px no-repeat,
            linear-gradient(0deg,   #ffffff, #ffffff) bottom left  / 2px 0% no-repeat;
          background-position:
            top left,
            top right,
            bottom right,
            bottom left;
        }

        body.light-theme .logo-border-draw::before {
          background:
            linear-gradient(90deg,  #000000, #000000) top    left  / 0% 2px no-repeat,
            linear-gradient(180deg, #000000, #000000) top    right / 2px 0% no-repeat,
            linear-gradient(270deg, #000000, #000000) bottom right / 0% 2px no-repeat,
            linear-gradient(0deg,   #000000, #000000) bottom left  / 2px 0% no-repeat;
          background-position:
            top left,
            top right,
            bottom right,
            bottom left;
        }

        .logo-border-draw img {
          position: relative;
          z-index: 3;
        }

        /* Trigger animation on hover over logo or brand on ANY page */
        .logo-border-draw:hover::before,
        .navbar-brand:hover .logo-border-draw::before {
          animation: logoBorderDraw 2.5s linear forwards;
        }

        @keyframes logoBorderDraw {
          0% {
            background-size:
              0%   2px,
              2px  0%,
              0%   2px,
              2px  0%;
          }
          50% {
            background-size:
              100% 2px,
              2px  0%,
              100% 2px,
              2px  0%;
          }
          100% {
            background-size:
              100% 2px,
              2px  100%,
              100% 2px,
              2px  100%;
          }
        }
        .artwork-card:hover {
          border-color: var(--accent-gold);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.6);
        }
        .artwork-card:hover .art-grid-image {
          transform: scale(1.05);
        }
        .artwork-card:hover .art-hover-overlay {
          opacity: 1;
        }
        .artist-card-link:hover {
          border-color: var(--accent-gold);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.5);
        }
        .artist-card-link:hover .artist-arrow {
          transform: translateX(4px);
          opacity: 1;
          color: var(--accent-gold);
        }
        .category-visual-card:hover .category-img-container {
          border-color: var(--accent-gold) !important;
          transform: translateY(-3px);
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
        }
        .category-visual-card:hover span {
          color: var(--accent-gold) !important;
        }
        .btn-add-to-cart-grid:hover {
          transform: scale(1.1);
          background-color: var(--accent-gold) !important;
          color: #000 !important;
          border-color: var(--accent-gold) !important;
        }
        
        /* Floating Overrides for Top Bar positioning */
        /* Floating Overrides for Top Bar positioning */
        .navbar-actions {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 0.85rem;
          padding-right: 4.5rem !important; /* Pushes theme switcher and cart left to make room for fixed hamburger */
          flex-shrink: 0 !important;
        }
        .theme-switch-floating, 
        .shop-btn-floating, 
        .guest-btn-floating,
        .hamburger-btn {
          color: var(--accent-gold, #d4af37) !important; /* Golden in dark theme */
        }

        body.light-theme .theme-switch-floating, 
        body.light-theme .shop-btn-floating, 
        body.light-theme .guest-btn-floating,
        body.light-theme .hamburger-btn {
          color: #000000 !important; /* Pure black in light theme */
        }

        .theme-switch-floating, 
        .shop-btn-floating, 
        .guest-btn-floating {
          position: static !important;
          top: auto !important;
          right: auto !important;
          height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          transition: var(--transition-smooth) !important;
          margin: 0 !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          flex-shrink: 0 !important;
        }

        .hamburger-btn {
          position: fixed !important;
          top: 28px !important;
          right: 1.5rem !important; /* Moved further right to avoid overlapping */
          z-index: 1200 !important;
          width: 44px !important;
          height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0px !important;
          transition: var(--transition-smooth) !important;
          margin: 0 !important;
          background: transparent !important;
          cursor: pointer !important;
          color: var(--text-primary);
        }

        body.light-theme .hamburger-btn {
          color: #000000 !important;
        }

        .hamburger-btn.is-menu-active {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        
        /* Ensure SVGs inside buttons are properly sized and visible */
        .guest-btn-floating svg, 
        .shop-btn-floating svg, 
        .hamburger-btn svg {
          width: 20px !important;
          height: 20px !important;
        }
        
        .guest-btn-floating, 
        .shop-btn-floating {
          width: 38px !important;
          padding: 0 !important;
        }
        .guest-btn-floating.active {
          width: auto !important;
          padding: 0 0.85rem !important;
        }
        .theme-switch-floating {
          padding: 0 0.65rem !important;
          width: auto !important;
        }
        
        /* Active States styling */
        .guest-btn-floating.active {
          color: var(--accent-green) !important;
          background: transparent !important;
          border: none !important;
        }
        .shop-btn-floating.active {
          color: var(--accent-gold) !important;
          background: transparent !important;
          border: none !important;
        }
        body.light-theme .shop-btn-floating.active {
          color: #000000 !important;
        }
        
        /* Hover states & Navbar visibility */
        .theme-switch-floating:hover, 
        .shop-btn-floating:hover, 
        .guest-btn-floating:hover {
          color: var(--accent-gold) !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        body.light-theme .theme-switch-floating:hover, 
        body.light-theme .shop-btn-floating:hover, 
        body.light-theme .guest-btn-floating:hover {
          color: #000000 !important;
        }

        .hamburger-btn:hover {
          border-color: var(--accent-gold) !important;
          color: var(--accent-gold) !important;
          box-shadow: var(--shadow-gold), var(--shadow-premium) !important;
          background: var(--bg-hover) !important;
        }
        body.light-theme .hamburger-btn:hover {
          color: #000000 !important;
        }

        .hamburger-btn.is-menu-active:hover {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          color: var(--accent-gold) !important;
        }

        /* Home View overrides to maintain dark backdrop contrast on top of slider */
        .app-wrapper.is-home-view .theme-switch-floating, 
        .app-wrapper.is-home-view .shop-btn-floating, 
        .app-wrapper.is-home-view .guest-btn-floating {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .app-wrapper.is-home-view .hamburger-btn {
          background: rgba(0, 0, 0, 0.35) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          text-shadow: 0 1px 4px rgba(0,0,0,0.8) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
        .app-wrapper.is-home-view .theme-switch-floating:hover, 
        .app-wrapper.is-home-view .shop-btn-floating:hover, 
        .app-wrapper.is-home-view .guest-btn-floating:hover {
          color: var(--accent-gold) !important;
        }
        .app-wrapper.is-home-view .hamburger-btn:hover {
          border-color: var(--accent-gold) !important;
          color: var(--accent-gold) !important;
        }
        .app-wrapper.is-home-view .hamburger-btn.is-menu-active {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .app-wrapper.is-home-view .hamburger-btn.is-menu-active:hover {
          color: var(--accent-gold) !important;
        }
        
        .guest-mini-lock-btn {
          background: none;
          border: none;
          color: var(--accent-red);
          cursor: pointer;
          font-size: 0.75rem;
          text-decoration: underline;
          padding: 0;
          margin-left: 0.25rem;
          font-weight: 600;
          transition: var(--transition-smooth);
        }
        .guest-mini-lock-btn:hover {
          color: #ff5f5f;
        }
        .login-lock-icon {
          color: var(--accent-gold) !important;
          transition: var(--transition-smooth);
        }
        .guest-btn-floating.active svg {
          color: var(--accent-green) !important;
        }
        
        /* Desktop Navigation row styling */
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 1.15rem;
        }
        .nav-link {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 400;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0.5rem 0.15rem;
          position: relative;
          transition: var(--transition-smooth);
        }
        .nav-link:hover {
          color: var(--accent-gold);
        }
        .nav-link.active {
          color: var(--accent-gold);
          font-weight: 400;
        }
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-gold);
          border-radius: 2px;
        }

        body.light-theme .nav-link {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          opacity: 1 !important;
        }
        body.light-theme .nav-link:hover,
        body.light-theme .nav-link.active {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        body.light-theme .nav-link.active::after {
          background: #000000 !important;
          background-color: #000000 !important;
        }
        
        /* Home View overrides for nav-links (always white text on dark background slider) */
        .app-wrapper.is-home-view .nav-link {
          color: rgba(255, 255, 255, 0.85) !important;
          text-shadow: 0 1px 4px rgba(0,0,0,0.8) !important;
        }
        .app-wrapper.is-home-view .nav-link:hover,
        .app-wrapper.is-home-view .nav-link.active {
          color: var(--accent-gold) !important;
        }
        
        /* Global Footer Layout */
        .global-footer {
          position: relative;
          border-top: 1px solid var(--border-color);
          padding: 2.5rem 5%;
          margin-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          color: var(--text-muted);
          font-size: 0.85rem;
          background: transparent;
        }
        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .footer-copyright {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          text-align: left;
        }
        .footer-socials {
          display: flex;
          flex-direction: row;
          gap: 0.75rem;
          align-items: center;
        }
        .footer-socials a {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: var(--transition-smooth);
        }
        .footer-socials a:hover { transform: scale(1.2); }
        .footer-socials a.facebook-link:hover  { color: #1877F2; }
        .footer-socials a.instagram-link:hover { color: #E1306C; }
        .footer-socials a.twitter-link:hover   { color: #1DA1F2; }
        .footer-socials a.whatsapp-link:hover  { color: #25D366; }

        .try-frames-footer-promo {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
        }
        .try-frames-label {
          font-size: 12px;
          font-weight: 300;
          color: var(--text-muted);
          font-family: 'Montserrat', sans-serif;
          letter-spacing: 0.02em;
          transition: color 0.3s ease;
        }
        .try-frames-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem 0.85rem;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-radius: 4px;
          text-decoration: none;
          transition: all 0.2s ease;
          border: none !important;
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          cursor: pointer;
          font-family: 'Montserrat', sans-serif;
        }
        .try-frames-btn:hover {
          background: rgba(255, 255, 255, 0.16) !important;
          color: var(--accent-gold, #d4af37) !important;
          border: none !important;
        }

        /* Light Theme - Deep Solid Black Footer Text */
        body.light-theme .global-footer,
        body.light-theme .global-footer p,
        body.light-theme .global-footer a,
        body.light-theme .footer-copyright,
        body.light-theme .footer-copyright p,
        body.light-theme .footer-copyright a,
        body.light-theme .footer-socials a,
        body.light-theme .footer-socials svg,
        body.light-theme .try-frames-label,
        body.light-theme .footer-subscribe-btn,
        body.light-theme .footer-subscribe-btn svg,
        body.light-theme .footer-search-input {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          opacity: 1 !important;
          stroke: #000000 !important;
          font-weight: 400 !important;
        }
        body.light-theme .try-frames-btn {
          color: #000000 !important;
          border: none !important;
          background: rgba(0, 0, 0, 0.06) !important;
        }
        body.light-theme .try-frames-btn:hover {
          background: rgba(0, 0, 0, 0.12) !important;
          color: #000000 !important;
          border: none !important;
        }
        
        /* Minimalist Footer Search Bar - Line only, magnifying glass on the right */
        .footer-search {
          position: relative;
          display: flex;
          align-items: center;
          width: 260px;
          margin-left: auto;
          margin-right: 5.5rem;
          transition: all 0.3s ease;
        }

        .footer-search-input {
          width: 100%;
          padding: 0.4rem 2rem 0.4rem 0 !important;
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid var(--border-color) !important;
          border-radius: 0 !important;
          color: var(--text-primary) !important;
          font-size: 0.88rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          outline: none;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          transition: all 0.3s ease;
        }
        body.light-theme .footer-search-input {
          color: #1a1a1a !important;
        }
        .footer-search-input::placeholder {
          color: var(--text-muted);
          font-style: normal;
          font-weight: 400;
          opacity: 0.65;
          letter-spacing: 0.04em;
        }
        .footer-search-input:focus {
          border-bottom: 1px solid var(--accent-gold) !important;
        }
        .footer-search-icon {
          position: absolute;
          right: 0.25rem;
          color: var(--text-muted) !important;
          pointer-events: none;
          transition: all 0.3s ease;
        }
        
        /* Highlight icon gold when input is focused */
        .footer-search:focus-within .footer-search-icon {
          color: var(--accent-gold) !important;
          transform: scale(1.1);
        }

        /* Footer Right Column (Subscribe on top, Search on bottom) */
        .footer-right-column {
          display: flex;
          flex-direction: row;
          gap: 1.15rem;
          margin-left: auto;
          align-items: flex-end;
        }

        .footer-subscribe-btn:hover {
          color: var(--accent-gold) !important;
          transform: scale(1.15);
        }

        /* Responsive styling for footer layout */
        @media (max-width: 768px) {
          .global-footer {
            flex-direction: column-reverse;
            text-align: center;
            padding: 2.5rem 1.5rem;
            gap: 1.5rem;
          }
          .footer-copyright {
            position: static;
            transform: none;
            padding-left: 0;
            white-space: normal;
          }
          .footer-right-column {
            margin: 0 auto;
            width: 100%;
            align-items: center;
          }
          .footer-search {
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }
        }
        
        /* Responsive design rules for nav & single row header layout */
        @media (max-width: 1180px) {
          .desktop-nav {
            display: none !important;
          }
          .top-navbar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .navbar-actions {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
          }
        }
        .hamburger-btn {
          display: flex !important;
        }
        @media (max-width: 768px) {
          .top-navbar {
            height: 72px !important;
            padding: 0 1rem !important;
            flex-wrap: nowrap !important;
          }
          .navbar-brand img {
            height: 48px !important;
          }
          .navbar-actions {
            gap: 0.45rem !important;
            padding-right: 3.25rem !important;
            flex-wrap: nowrap !important;
          }
          .hamburger-btn {
            top: 17px !important;
            right: 0.75rem !important;
            width: 38px !important;
            height: 38px !important;
          }
          .theme-switch-floating {
            transform: scale(0.85) !important;
            transform-origin: right center !important;
          }
        }
        @media (max-width: 480px) {
          .top-navbar {
            height: 64px !important;
            padding: 0 0.5rem !important;
            flex-wrap: nowrap !important;
          }
          .navbar-brand img {
            height: 40px !important;
          }
          .navbar-actions {
            gap: 0.25rem !important;
            padding-right: 2.75rem !important;
            flex-wrap: nowrap !important;
          }
          .hamburger-btn {
            top: 14px !important;
            right: 0.4rem !important;
            width: 34px !important;
            height: 34px !important;
          }
          .theme-switch-floating {
            transform: scale(0.76) !important;
            transform-origin: right center !important;
            padding: 0 !important;
          }
          .guest-btn-floating,
          .shop-btn-floating {
            width: 30px !important;
            height: 30px !important;
          }
        }

        /* Home View menu-open header background transitions */
        body .app-wrapper.is-home-view .floating-header-group.menu-open .top-navbar {
          background: var(--bg-header) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border-bottom: 1px solid var(--border-color) !important;
          box-shadow: var(--shadow-premium) !important;
        }

        body .app-wrapper.is-home-view .floating-header-group.menu-open .nav-link {
          color: #ffffff !important;
          text-shadow: none !important;
        }

        body .app-wrapper.is-home-view .floating-header-group.menu-open .nav-link:hover,
        body .app-wrapper.is-home-view .floating-header-group.menu-open .nav-link.active {
          color: var(--accent-gold) !important;
        }

        /* Floating WhatsApp Button Round Shape */
        .whatsapp-fab {
          position: fixed !important;
          bottom: 2rem !important;
          right: 2rem !important;
          z-index: 1080 !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          border-radius: 50% !important;
          border-radius: 9999px !important;
          -webkit-border-radius: 50% !important;
          background: #25D366 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 4px 20px rgba(37, 211, 102, 0.45) !important;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease !important;
          text-decoration: none !important;
          overflow: hidden !important;
          padding: 0 !important;
        }
        .whatsapp-fab:hover {
          transform: scale(1.12) !important;
          box-shadow: 0 6px 28px rgba(37, 211, 102, 0.65) !important;
        }
        .whatsapp-fab svg {
          width: 22px !important;
          height: 22px !important;
          display: block !important;
        }
      `}</style>

    </div>
  );
}

