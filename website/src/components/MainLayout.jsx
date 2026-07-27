import React from 'react';
import { 
  LayoutGrid, Users, ShoppingBag, Home, Info, Calendar, 
  BookOpen, Flame, Video, Mail, Search, Sun, Moon
} from 'lucide-react';
import { getLogoUrl } from '../services/api';

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
    setSelectedArtist,
    setSelectedCategory,
    setSelectedArtworkId,
    theme,
    toggleTheme,
    currency,
    setCurrency
  } = state;

  return (
    <div className="app-wrapper">
      
      {/* 🛍️ Floating Top-Right Shop Button */}
      <div 
        onClick={() => { setActiveTab('shop'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
        className={`shop-btn-floating ${activeTab === 'shop' ? 'active' : ''}`}
      >
        <ShoppingBag size={14} />
        <span>Shop Online</span>
        {cartItems.length > 0 && <span className="cart-count">{cartItems.length}</span>}
      </div>

      {/* 🌓 Floating Top-Right Theme Switch Button */}
      <div className="theme-switch-floating">
        <Moon size={14} style={{ color: theme === 'dark' ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
        <label className="theme-switch">
          <input 
            type="checkbox" 
            checked={theme === 'light'} 
            onChange={toggleTheme} 
          />
          <span className="theme-slider"></span>
        </label>
        <Sun size={14} style={{ color: theme === 'light' ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
      </div>

      {/* 🏛️ LEFT SIDEBAR NAVIGATION */}
      <aside className="left-sidebar">
        
          {/* Brand Logo */}
          <div 
            className="sidebar-logo" 
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingLeft: '1rem',
              marginBottom: '2.25rem'
            }} 
            onClick={() => { 
              setActiveTab('home'); 
              setSelectedArtist(null); 
              setSelectedCategory(null); 
              setSelectedArtworkId(null); 
            }}
          >
            <img 
              src={getLogoUrl()} 
              alt="Logo" 
              style={{ 
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }} 
            />
          </div>

          {/* Sidebar Navigation Options */}
          <nav className="sidebar-nav">
            <button 
              onClick={() => { setActiveTab('home'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            >
              <Home size={16} /> Home
            </button>
            
            <button 
              onClick={() => { setActiveTab('about'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'about' ? 'active' : ''}`}
            >
              <Info size={16} /> About Us
            </button>
            
            <button 
              onClick={() => { setActiveTab('collections'); setSelectedArtist(null); setSelectedCategory(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'collections' ? 'active' : ''}`}
            >
              <LayoutGrid size={16} /> Collections
            </button>
            
            <button 
              onClick={() => { setActiveTab('artists'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'artists' ? 'active' : ''}`}
            >
              <Users size={16} /> Artists
            </button>
            
            <button 
              onClick={() => { setActiveTab('exhibitions'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'exhibitions' ? 'active' : ''}`}
            >
              <Calendar size={16} /> Exhibitions
            </button>

            {/* Accordion Sub-Menu for Exhibitions */}
            {activeTab === 'exhibitions' && (
              <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => setExhibitionFilter('current')} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: exhibitionFilter === 'current' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    padding: '0.35rem 0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: exhibitionFilter === 'current' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)' }}></span>
                  Current Shows
                </button>
                <button 
                  onClick={() => setExhibitionFilter('upcoming')} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: exhibitionFilter === 'upcoming' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    padding: '0.35rem 0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: exhibitionFilter === 'upcoming' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)' }}></span>
                  Upcoming Shows
                </button>
                <button 
                  onClick={() => setExhibitionFilter('previous')} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: exhibitionFilter === 'previous' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    padding: '0.35rem 0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: exhibitionFilter === 'previous' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)' }}></span>
                  Previous Shows
                </button>
              </div>
            )}
            
            <button 
              onClick={() => { setActiveTab('catalogues'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'catalogues' ? 'active' : ''}`}
            >
              <BookOpen size={16} /> Catalogues
            </button>
            
            <button 
              onClick={() => { setActiveTab('framer_heaven'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'framer_heaven' ? 'active' : ''}`}
            >
              <Flame size={16} /> Framer's Heaven
            </button>

            {/* Accordion Sub-Menu for Framer's Heaven */}
            {activeTab === 'framer_heaven' && (
              <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => setFramerHeavenTab('Product')} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: framerHeavenTab === 'Product' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    padding: '0.35rem 0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: framerHeavenTab === 'Product' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)' }}></span>
                  Products
                </button>
                <button 
                  onClick={() => setFramerHeavenTab('Service')} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: framerHeavenTab === 'Service' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    padding: '0.35rem 0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: framerHeavenTab === 'Service' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)' }}></span>
                  Services
                </button>
              </div>
            )}
            
            <button 
              onClick={() => { setActiveTab('videos'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'videos' ? 'active' : ''}`}
            >
              <Video size={16} /> Videos
            </button>
            
            <button 
              onClick={() => { setActiveTab('contact'); setSelectedArtist(null); setSelectedArtworkId(null); }} 
              className={`sidebar-nav-btn ${activeTab === 'contact' ? 'active' : ''}`}
            >
              <Mail size={16} /> Contact Us
            </button>


          </nav>

          {/* Sidebar Search painting by code */}
          <div className="sidebar-search-container">
            <Search size={14} className="sidebar-search-icon" />
            <input 
              type="text" 
              placeholder="Search painting by code..." 
              className="sidebar-search-input"
              value={searchQuery}
              onChange={(e) => handleSidebarSearch(e.target.value)}
            />
          </div>

          {/* Sidebar Footer with Social Links */}
          <div className="sidebar-footer">
            <div className="sidebar-social-links">
              <a href="https://www.facebook.com/mainframethegallery" target="_blank" rel="noopener noreferrer" className="sidebar-social-link-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-social-icon"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://www.instagram.com/mainframethegallery" target="_blank" rel="noopener noreferrer" className="sidebar-social-link-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-social-icon"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="sidebar-social-link-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-social-icon"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
              </a>
            </div>
          </div>

        </aside>
      
      {/* 🖼️ MAIN CONTENT AREA */}
      <main className="main-content">
        
        {children}

        {/* Global Footer in Main Panel */}
        <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2.5rem 5%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4rem' }}>
          <p>© 2026 Mainframe The Gallery. All Rights Reserved. Developed by Hunain Khan.</p>
        </footer>

      </main>

      {/* CSS Animation & Hover Effects */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
      `}</style>

    </div>
  );
}
