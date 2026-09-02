import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { getArtworkImageUrl } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';

export default function CollectionsSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  artworks,
  searchQuery,
  setSearchQuery,
  loadingArtworks,
  cartItems,
  handleAddToCart,
  viewArtworkDetail,
  currency,
  exchangeRates,
  websiteSettings = { hide_prices: false },
  guestSession,
  setIsGuestModalOpen
}) {
  const isArchiveStatus = (s) => {
    if (!s) return false;
    const str = String(s).trim().toLowerCase();
    return str === 'return' || str === 'archive' || str === 'archived';
  };

  const isSoldStatus = (s) => {
    if (!s) return false;
    const str = String(s).trim().toLowerCase();
    return str === 'sold' || str === 'soldout' || str === 'sold_out';
  };

  const isAvailableStatus = (s) => {
    if (!s) return true;
    if (isArchiveStatus(s) || isSoldStatus(s)) return false;
    return true;
  };

  // Pagination states for artworks
  const [currentPage, setCurrentPage] = useState(1);
  const [artworksPerPage, setArtworksPerPage] = useState(48); // Default 48 artworks per page
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'available', 'sold'

  // Reset page when category, search query or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, artworksPerPage, statusFilter]);

  const filteredArtworks = artworks;

  // Helper function to render pagination controls
  const renderPaginationControls = (activePage, totalPages) => {
    return (
      <div
        className="pagination-controls-wrapper"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '3.5rem',
          gap: '0.4rem',
          flexWrap: 'wrap'
        }}
      >
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={activePage === 1}
          className="pagination-nav-btn"
          style={{
            background: 'var(--bg-input)',
            color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            cursor: activePage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(page => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
          .map((page, index, array) => {
            const showEllipsis = index > 0 && page - array[index - 1] > 1;
            return (
              <React.Fragment key={page}>
                {showEllipsis && (
                  <span style={{ color: 'var(--text-muted)', padding: '0.55rem 0.5rem', alignSelf: 'center' }}>...</span>
                )}
                <button
                  onClick={() => setCurrentPage(page)}
                  className={`pagination-page-btn ${activePage === page ? 'active' : ''}`}
                  style={{
                    background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'var(--bg-input)',
                    color: activePage === page ? 'var(--bg-dark)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontWeight: activePage === page ? '700' : '500',
                    padding: '0.55rem 1.1rem',
                    minWidth: '2.6rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}

        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={activePage === totalPages}
          className="pagination-nav-btn"
          style={{
            background: 'var(--bg-input)',
            color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // Render Search Results View
  if (searchQuery) {
    const indexOfLastSearchArt = currentPage * artworksPerPage;
    const indexOfFirstSearchArt = indexOfLastSearchArt - artworksPerPage;
    const currentSearchArtworks = filteredArtworks.slice(indexOfFirstSearchArt, indexOfLastSearchArt);
    const totalSearchPages = Math.ceil(filteredArtworks.length / artworksPerPage);
    const activeSearchPage = currentPage > totalSearchPages ? Math.max(1, totalSearchPages) : currentPage;

    return (
      <div className="page-content collections-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 400 }}>Search Results</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '0.25rem' }}>
              Showing results for: <strong style={{ color: 'var(--accent-gold)' }}>"{searchQuery}"</strong> ({filteredArtworks.length} items found)
            </p>
          </div>
          <button onClick={() => setSearchQuery('')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '12px' }}>
            Clear Search
          </button>
        </div>

        {loadingArtworks ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--accent-gold)', fontSize: '22px' }}>
            Loading search results...
          </div>
        ) : (
          <>
            <div className="artworks-grid">
              {currentSearchArtworks.map((art) => (
                <div
                  key={art.id}
                  className="glass-card artwork-card"
                  style={{ padding: '0.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  onClick={() => viewArtworkDetail(art.id)}
                >
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', height: '260px', width: '100%', backgroundColor: 'transparent' }}>
                    <img src={art.id ? getArtworkImageUrl(art.id) : (art.image || '')} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} className="art-grid-image" />
                    <div className="art-hover-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}>
                      <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '12px', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        View Details <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                  <div style={{
                    padding: '1rem 0.25rem 0.25rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Montserrat, sans-serif'
                  }}>
                    {/* Heading: Artist Name (18px, Thin font, black/text-primary) */}
                    <h3 className="artist-name" style={{
                      fontSize: '18px',
                      color: 'var(--text-primary)',
                      margin: '0 0 0.55rem 0',
                      fontWeight: 400,
                      fontFamily: 'Montserrat, sans-serif',
                      lineHeight: '1.3',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      {art.artist_name || 'Unknown Artist'}
                    </h3>

                    {/* Medium (12px) */}
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      margin: '0 0 0.45rem 0',
                      fontFamily: 'Montserrat, sans-serif',
                      lineHeight: '1.4'
                    }}>
                      {art.medium_name || 'Oil on Canvas'}
                    </p>

                    {/* Dimensions (12px) */}
                    {(() => {
                      const dims = renderDimensions(art.width, art.length);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.45rem' }}>
                          {dims.cmStr && (
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              margin: 0,
                              fontFamily: 'Montserrat, sans-serif',
                              lineHeight: '1.4'
                            }}>
                              {dims.cmStr}
                            </p>
                          )}
                          {dims.inStr && (
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)',
                              margin: 0,
                              fontFamily: 'Montserrat, sans-serif',
                              lineHeight: '1.4'
                            }}>
                              {dims.inStr}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Code / Title (12px - Placed at bottom, matches text above) */}
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      margin: '0 0 0.85rem 0',
                      fontFamily: 'Montserrat, sans-serif',
                      lineHeight: '1.4',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {art.title}
                    </p>

                    {/* Footer Row (Inquiry on left in black, Available on right in green, Sold in red, or Hidden for Return/Archived) */}
                    {!isArchiveStatus(art.status) && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'auto',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.85rem'
                      }}>
                        {isSoldStatus(art.status) ? (
                          <span className="status-sold" style={{ fontSize: '12px', fontWeight: 400, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                            Sold
                          </span>
                        ) : (
                          <>
                            <span className="status-inquiry" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 400, fontFamily: 'Montserrat, sans-serif' }}>
                              Inquiry
                            </span>
                            <span className="status-available" style={{ fontSize: '12px', fontWeight: 400, color: '#10b981', fontFamily: 'Montserrat, sans-serif' }}>
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

            {filteredArtworks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No search results found.</div>
            )}

            {/* Pagination Controls for Search */}
            {filteredArtworks.length > artworksPerPage && renderPaginationControls(activeSearchPage, totalSearchPages)}
          </>
        )}
      </div>
    );
  }

  // Render Collection Types (Category Grid) if no category is selected
  if (!selectedCategory) {
    return (
      <div className="page-content collections-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>

        {/* Categories Grid (Collection Types Cards) */}
        <div className="categories-grid">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedCategory(cat.name)}
              className="glass-card category-grid-card"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-color)'
              }}
            >
              {/* Category Image Box */}
              <div style={{
                height: '280px',
                overflow: 'hidden',
                backgroundColor: '#111',
                position: 'relative'
              }} className="category-img-box">
                <img
                  src={cat.image_id ? getArtworkImageUrl(cat.image_id) : ''}
                  alt={cat.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.6s ease'
                  }}
                  className="category-card-img"
                />
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7))',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '1.5rem 2rem'
                }}>
                  <span style={{
                    fontSize: '16px',
                    color: 'var(--accent-gold)',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {cat.count}
                  </span>
                </div>
              </div>

              {/* Category Footer Title Label */}
              <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                background: 'transparent',
                borderTop: '1px solid var(--border-color)'
              }} className="category-card-footer">
                <h3 style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontWeight: 400,
                  transition: 'color 0.3s ease'
                }} className="category-card-title">
                  {cat.name}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Local styles for Category Grid Cards */}
        <style>{`
          .categories-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5rem;
          }
          @media (max-width: 1200px) {
            .categories-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 2rem;
            }
          }
          @media (max-width: 992px) {
            .categories-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 1.5rem;
            }
          }
          @media (max-width: 600px) {
            .categories-grid {
              grid-template-columns: 1fr;
              gap: 1.25rem;
            }
            .category-img-box {
              height: clamp(200px, 45vw, 260px) !important;
            }
          }
          .category-grid-card:hover {
            border-color: var(--accent-gold) !important;
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5) !important;
          }
          .category-grid-card:hover .category-card-img {
            transform: scale(1.04);
          }
          .category-grid-card:hover .category-card-title {
            color: var(--accent-gold) !important;
          }
        `}</style>
      </div>
    );
  }

  // Render Artworks Grid for selected category (Filtered by statusFilter: all, available, sold)
  const rawCategoryArtworks = artworks.filter(art => art.category_name === selectedCategory);

  const filteredCategoryArtworks = rawCategoryArtworks
    .filter(art => {
      if (statusFilter === 'available') return isAvailableStatus(art.status);
      if (statusFilter === 'sold') return isSoldStatus(art.status);
      return true; // 'all' shows available, sold, and archived
    })
    .sort((a, b) => {
      const aAvailable = isAvailableStatus(a.status);
      const bAvailable = isAvailableStatus(b.status);
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;
      return 0;
    });

  // Slicing for pagination
  const totalPages = Math.ceil(filteredCategoryArtworks.length / artworksPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastArt = activePage * artworksPerPage;
  const indexOfFirstArt = indexOfLastArt - artworksPerPage;
  const currentArtworks = filteredCategoryArtworks.slice(indexOfFirstArt, indexOfLastArt);

  return (
    <div className="page-content collections-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <button
          onClick={() => {
            setSelectedCategory(null);
            setStatusFilter('all');
          }}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}
        >
          <ArrowLeft size={16} /> Back to Collections
        </button>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>{selectedCategory}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0.2rem 0 0 0' }}>
            {filteredCategoryArtworks.length} artworks
          </p>
        </div>
      </div>

      {/* 3 Status Filter Buttons: All, Available, Sold */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'available', label: 'Available' },
          { key: 'sold', label: 'Sold' }
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`collection-status-filter-btn ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loadingArtworks ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
          Loading category artworks...
        </div>
      ) : (
        <>
          <div className="artworks-grid">
            {currentArtworks.map((art) => (
              <div
                key={art.id}
                className="glass-card artwork-card"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                onClick={() => viewArtworkDetail(art.id)}
              >
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', height: '260px', width: '100%', backgroundColor: 'transparent' }}>
                  <img src={art.id ? getArtworkImageUrl(art.id) : (art.image || '')} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }} className="art-grid-image" />
                  <div className="art-hover-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}>
                    <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '12px', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      View Details <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
                <div style={{
                  padding: '1rem 0.25rem 0.25rem',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  fontFamily: 'Montserrat, sans-serif'
                }}>
                  {/* Heading: Artist Name (18px, Thin font, black/text-primary) */}
                  <h3 className="artist-name" style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    margin: '0 0 0.55rem 0',
                    fontWeight: 100,
                    fontFamily: 'Montserrat, sans-serif',
                    lineHeight: '1.3',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase'
                  }}>
                    {art.artist_name || 'Unknown Artist'}
                  </h3>

                  {/* Medium (12px) */}
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 0.45rem 0',
                    fontFamily: 'Montserrat, sans-serif',
                    lineHeight: '1.4'
                  }}>
                    {art.medium_name || 'Oil on Canvas'}
                  </p>

                  {/* Dimensions (12px) */}
                  {(() => {
                    const dims = renderDimensions(art.width, art.length);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.45rem' }}>
                        {dims.cmStr && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: 0,
                            fontFamily: 'Montserrat, sans-serif',
                            lineHeight: '1.4'
                          }}>
                            {dims.cmStr}
                          </p>
                        )}
                        {dims.inStr && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: 0,
                            fontFamily: 'Montserrat, sans-serif',
                            lineHeight: '1.4'
                          }}>
                            {dims.inStr}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Code / Title (12px - Placed at bottom, matches text above) */}
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 0.85rem 0',
                    fontFamily: 'Montserrat, sans-serif',
                    lineHeight: '1.4',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {art.title}
                  </p>

                  {/* Footer Row (Inquiry on left in black, Available on right in green, Sold in red, or Hidden for Return/Archived) */}
                  {!isArchiveStatus(art.status) && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.85rem'
                    }}>
                      {isSoldStatus(art.status) ? (
                        <span className="status-sold" style={{ fontSize: '12px', fontWeight: 400, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                          Sold
                        </span>
                      ) : (
                        <>
                          <span 
                            className="status-inquiry" 
                            style={{ 
                              fontSize: '12px', 
                              color: 'var(--text-primary)', 
                              fontWeight: 400, 
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
                          <span className="status-available" style={{ fontSize: '12px', fontWeight: 400, color: '#10b981', fontFamily: 'Montserrat, sans-serif' }}>
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

          {filteredCategoryArtworks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No {statusFilter === 'available' ? 'available' : statusFilter === 'sold' ? 'sold' : ''} artworks found in this collection.
            </div>
          )}

          {/* Pagination Controls */}
          {filteredCategoryArtworks.length > artworksPerPage && renderPaginationControls(activePage, totalPages)}
        </>
      )}

      {/* Scoped Grid Style for Guaranteed 4 Cards Per Row */}
      <style>{`
        .artworks-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 2rem !important;
          width: 100% !important;
        }
        @media (max-width: 1200px) {
          .artworks-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1.75rem !important;
          }
        }
        @media (max-width: 868px) {
          .artworks-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 1.25rem !important;
          }
        }
        @media (max-width: 520px) {
          .artworks-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
