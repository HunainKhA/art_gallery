import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { getArtworkImageUrl } from '../services/api';
import { formatPrice } from '../services/currency';

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
  exchangeRates
}) {
  // Pagination states for artworks
  const [currentPage, setCurrentPage] = useState(1);
  const artworksPerPage = 12; // 12 artworks per page fits 3 or 4 columns beautifully

  // Reset page when category or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const filteredArtworks = artworks;

  // Helper function to render pagination controls
  const renderPaginationControls = (activePage, totalPages) => {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '3.5rem',
        gap: '0.4rem'
      }}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={activePage === 1}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            color: activePage === 1 ? 'rgba(255, 255, 255, 0.15)' : '#fff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            cursor: activePage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
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
                  <span style={{ color: 'var(--text-muted)', padding: '0.55rem 0.75rem', alignSelf: 'flex-end' }}>...</span>
                )}
                <button
                  onClick={() => setCurrentPage(page)}
                  style={{
                    background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'rgba(255, 255, 255, 0.03)',
                    color: activePage === page ? '#000' : '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontWeight: activePage === page ? '700' : '500',
                    padding: '0.55rem 1.1rem',
                    minWidth: '2.6rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
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
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            color: activePage === totalPages ? 'rgba(255, 255, 255, 0.15)' : '#fff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.55rem 1.1rem',
            borderRadius: '6px',
            cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
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
      <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Search Results</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Showing results for: <strong style={{ color: 'var(--accent-gold)' }}>"{searchQuery}"</strong> ({filteredArtworks.length} items found)
            </p>
          </div>
          <button onClick={() => setSearchQuery('')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Clear Search
          </button>
        </div>

        {loadingArtworks ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
            Loading search results...
          </div>
        ) : (
          <>
            <div className="artworks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
              {currentSearchArtworks.map((art) => (
                <div 
                  key={art.id} 
                  className="glass-card artwork-card"
                  style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  onClick={() => viewArtworkDetail(art.id)}
                >
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', height: '240px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={art.id ? getArtworkImageUrl(art.id) : (art.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500')} alt={art.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', transition: 'transform 0.5s ease' }} className="art-grid-image" />
                    <div className="art-hover-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}>
                      <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        View Details <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{art.artist_name || 'Unknown Artist'}</p>
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
      <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 className="gradient-title">
            Art Collections
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Explore our exquisite range of masterpieces categorized by medium and styles.
          </p>
        </div>

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
                  src={cat.image_id ? getArtworkImageUrl(cat.image_id) : 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500'} 
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
                    fontSize: '0.8rem', 
                    color: 'var(--accent-gold)', 
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {cat.count} masterpieces
                  </span>
                </div>
              </div>

              {/* Category Footer Title Label */}
              <div style={{ 
                padding: '1.5rem', 
                textAlign: 'center', 
                background: 'rgba(255, 255, 255, 0.02)',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)'
              }} className="category-card-footer">
                <h3 style={{ 
                  fontSize: '1.35rem', 
                  color: '#fff', 
                  margin: 0,
                  fontWeight: 700,
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
            }
          }
          @media (max-width: 992px) {
            .categories-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 768px) {
            .categories-grid {
              grid-template-columns: 1fr;
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

  // Render Artworks Grid for selected category
  const categoryArtworks = artworks.filter(art => art.category_name === selectedCategory);
  
  // Slicing for pagination
  const totalPages = Math.ceil(categoryArtworks.length / artworksPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastArt = activePage * artworksPerPage;
  const indexOfFirstArt = indexOfLastArt - artworksPerPage;
  const currentArtworks = categoryArtworks.slice(indexOfFirstArt, indexOfLastArt);

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Category Header with Back Navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setSelectedCategory(null)} 
            className="btn-secondary" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem', 
              fontSize: '0.85rem' 
            }}
          >
            <ArrowLeft size={16} /> Back to Collections
          </button>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>{selectedCategory}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Showing {categoryArtworks.length} artworks in this collection
            </p>
          </div>
        </div>
      </div>

      {loadingArtworks ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
          Loading category artworks...
        </div>
      ) : (
        <>
          <div className="artworks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {currentArtworks.map((art) => (
              <div 
                key={art.id} 
                className="glass-card artwork-card"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                onClick={() => viewArtworkDetail(art.id)}
              >
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', height: '240px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={art.id ? getArtworkImageUrl(art.id) : (art.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500')} alt={art.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', transition: 'transform 0.5s ease' }} className="art-grid-image" />
                  <div className="art-hover-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-smooth)' }}>
                    <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.5rem 1.25rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      View Details <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{art.artist_name || 'Unknown Artist'}</p>
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

          {categoryArtworks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No artworks found in this category.
            </div>
          )}

          {/* Pagination Controls */}
          {categoryArtworks.length > artworksPerPage && renderPaginationControls(activePage, totalPages)}
        </>
      )}
    </div>
  );
}
