import React, { useState, useEffect } from 'react';
import { getApiUrl, fetchBannerConfig, getBannerImageUrl } from '../services/api';
import { formatPrice } from '../services/currency';
import { Download, Loader } from 'lucide-react';


export default function ExhibitionsSection({ 
  activeTab = 'current', 
  setActiveTab = () => {},
  viewArtworkDetail,
  handleAddToCart,
  cartItems = [],
  currency,
  exchangeRates
}) {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected Exhibition sub-view state
  const [selectedExhibition, setSelectedExhibition] = useState(null);
  const [exhibitionArtworks, setExhibitionArtworks] = useState([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [artworksPage, setArtworksPage] = useState(1);
  const artworksPerPage = 12;
  const [downloadingCatalogId, setDownloadingCatalogId] = useState(null);
  const [bannerConfig, setBannerConfig] = useState(null);

  // Helper to fetch artworks for catalog download
  const fetchArtworksForExhibition = async (exhibitionId) => {
    try {
      const res = await fetch(getApiUrl(`/api/crm/exhibitions/${exhibitionId}/artworks`));
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error fetching artworks for download:", err);
      return [];
    }
  };

  // Helper to chunk array
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // Compile PDF catalog template
  const handleDownloadCatalog = async (exhibition) => {
    setDownloadingCatalogId(exhibition.id);
    const artworks = await fetchArtworksForExhibition(exhibition.id);
    setDownloadingCatalogId(null);

    if (!artworks || artworks.length === 0) {
      alert("No artworks found for this exhibition to compile a catalog.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download/print the catalog.");
      return;
    }

    const exhibitionImageCover = getApiUrl(`/api/artworks/image/${exhibition.id}`);

    const htmlContent = `
      <html>
        <head>
          <title>Catalog - ${exhibition.document_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Montserrat', sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 210mm;
              height: 297mm;
              padding: 20mm;
              box-sizing: border-box;
              page-break-after: always;
              position: relative;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
            }
            .title-page {
              justify-content: center;
              align-items: center;
              text-align: center;
            }
            .logo-placeholder {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              margin-bottom: 60px;
              color: #000;
            }
            .logo-placeholder span {
              color: #cfa15c;
            }
            .cover-image-container {
              width: 140mm;
              height: 90mm;
              margin-bottom: 40px;
              border: 1px solid #eaeaea;
              padding: 10px;
              background: #fafafa;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .cover-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .exhibition-title {
              font-size: 34px;
              font-weight: 800;
              margin-bottom: 15px;
              text-transform: uppercase;
              color: #000;
              letter-spacing: -0.01em;
            }
            .exhibition-date {
              font-size: 16px;
              color: #666;
              margin-bottom: 40px;
              font-weight: 500;
            }
            .exhibition-desc {
              font-size: 13px;
              line-height: 1.8;
              color: #444;
              max-width: 600px;
              margin: 0 auto 50px auto;
            }
            .footer-note {
              font-size: 11px;
              color: #999;
              position: absolute;
              bottom: 20mm;
              left: 0;
              right: 0;
              text-align: center;
            }
            .artworks-container {
              display: grid;
              grid-template-columns: 1fr;
              gap: 25px;
              margin-top: 10px;
              flex: 1;
            }
            .artwork-card {
              border-bottom: 1px solid #eee;
              padding-bottom: 25px;
              display: flex;
              gap: 30px;
              box-sizing: border-box;
              height: 110mm;
              align-items: center;
            }
            .artwork-card:last-child {
              border-bottom: none;
            }
            .artwork-image-container {
              width: 100mm;
              height: 90mm;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fbfbfb;
              border: 1px solid #f0f0f0;
              padding: 5px;
            }
            .artwork-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .artwork-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .artwork-artist {
              font-size: 13px;
              color: #cfa15c;
              font-weight: 700;
              margin: 0 0 8px 0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .artwork-title {
              font-size: 20px;
              font-weight: 700;
              color: #000;
              margin: 0 0 10px 0;
            }
            .artwork-meta {
              font-size: 13px;
              color: #666;
              margin: 0 0 15px 0;
              line-height: 1.6;
            }
            .artwork-price {
              font-size: 18px;
              font-weight: 700;
              color: #000;
            }
            .page-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
              margin-bottom: 20px;
              font-size: 11px;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .page-footer {
              border-top: 1px solid #eee;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #888;
              margin-top: 20px;
            }
            @media print {
              body {
                background: #fff;
              }
              .page {
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <!-- COVER TITLE PAGE -->
          <div class="page title-page">
            <div class="logo-placeholder">MAINFRAME <span>THE GALLERY</span></div>
            <div class="cover-image-container">
              <img 
                class="cover-image" 
                src="${exhibitionImageCover}" 
                alt="${exhibition.document_name}"
                onerror="this.src='https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=500';"
              />
            </div>
            <div class="exhibition-title">${exhibition.document_name}</div>
            <div class="exhibition-date">${formatDate(exhibition.active_date)} - ${formatDate(exhibition.exp_date) || 'Ongoing'}</div>
            <div class="exhibition-desc">${exhibition.description || 'Complete catalog portfolio of the master artworks showcased.'}</div>
            <div class="footer-note">© 2026 Mainframe The Gallery. All Rights Reserved.</div>
          </div>
          
          <!-- ARTWORK DETAILS PAGES (2 per page) -->
          ${chunkArray(artworks, 2).map((chunk, pageIndex) => `
            <div class="page">
              <div>
                <div class="page-header">
                  <span>${exhibition.document_name} — Exhibition Catalog</span>
                  <span>Mainframe The Gallery</span>
                </div>
                <div class="artworks-container">
                  ${chunk.map(art => `
                    <div class="artwork-card">
                      <div class="artwork-image-container">
                        <img 
                          class="artwork-image" 
                          src="${getApiUrl(`/api/artworks/image/${art.id}`)}" 
                          alt="${art.title}"
                          onerror="this.src='https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';"
                        />
                      </div>
                      <div class="artwork-info">
                        <p class="artwork-artist">${art.artist_name || 'Unknown Artist'}</p>
                        <p class="artwork-title">${art.title}</p>
                        <p class="artwork-meta">
                          <strong>Code:</strong> ${art.code || 'N/A'}<br/>
                          ${art.length ? `<strong>Dimensions:</strong> ${art.length} x ${art.width} in<br/>` : ''}
                          <strong>Status:</strong> ${art.status === 'Available' || art.status === 'not_sold' ? 'Available' : 'Sold Out'}
                        </p>
                        <p class="artwork-price">
                          ${art.status === 'Available' || art.status === 'not_sold' 
                            ? formatPrice(art.price, currency, exchangeRates) 
                            : 'Sold Out'}
                        </p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="page-footer">
                <span>mainframegallery.com</span>
                <span>Page ${pageIndex + 1} of ${Math.ceil(artworks.length / 2)}</span>
              </div>
            </div>
          `).join('')}
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 1200);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const fetchExhibitions = () => {
    setLoading(true);
    fetch(getApiUrl('/api/crm/exhibitions'))
      .then(res => res.json())
      .then(data => {
        setExhibitions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setExhibitions([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExhibitions();
    fetchBannerConfig()
      .then(data => setBannerConfig(data))
      .catch(err => console.error("Error loading banner config:", err));
  }, []);

  // Fetch artworks when an exhibition is selected
  useEffect(() => {
    if (selectedExhibition) {
      setLoadingArtworks(true);
      setArtworksPage(1);
      fetch(getApiUrl(`/api/crm/exhibitions/${selectedExhibition.id}/artworks`))
        .then(res => res.json())
        .then(data => {
          setExhibitionArtworks(Array.isArray(data) ? data : []);
          setLoadingArtworks(false);
        })
        .catch(err => {
          console.error(err);
          setExhibitionArtworks([]);
          setLoadingArtworks(false);
        });
    } else {
      setExhibitionArtworks([]);
    }
  }, [selectedExhibition]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedExhibition(null); // Clear sub-view when tab changes
  }, [activeTab]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getExhibitionStatus = (activeDateStr, expDateStr) => {
    if (!activeDateStr) return 'previous';
    
    // Parse YYYY-MM-DD
    const start = new Date(activeDateStr);
    start.setHours(0, 0, 0, 0);
    
    if (expDateStr) {
      const end = new Date(expDateStr);
      end.setHours(23, 59, 59, 999);
      
      if (today < start) {
        return 'upcoming';
      }
      if (today > end) {
        return 'previous';
      }
      return 'current';
    } else {
      // No exp_date specified: Exhibition is only active on the start date itself
      if (start.getTime() === today.getTime()) {
        return 'current';
      }
      if (start < today) {
        return 'previous';
      }
      return 'upcoming';
    }
  };

  const filteredExhibitions = exhibitions.filter(ex => {
    const status = getExhibitionStatus(ex.active_date, ex.exp_date);
    return status === activeTab;
  });

  // Sort active date-wise (newest first)
  const sortedExhibitions = [...filteredExhibitions].sort((a, b) => {
    const dateA = a.active_date ? new Date(a.active_date) : new Date(0);
    const dateB = b.active_date ? new Date(b.active_date) : new Date(0);
    return dateB - dateA;
  });

  // Pagination for main exhibitions list
  const totalPages = Math.ceil(sortedExhibitions.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExhibitions = sortedExhibitions.slice(indexOfFirstItem, indexOfLastItem);

  // Pagination for exhibition artworks
  const totalArtworksPages = Math.ceil(exhibitionArtworks.length / artworksPerPage);
  const activeArtworksPage = artworksPage > totalArtworksPages ? Math.max(1, totalArtworksPages) : artworksPage;
  const indexOfLastArtwork = activeArtworksPage * artworksPerPage;
  const indexOfFirstArtwork = indexOfLastArtwork - artworksPerPage;
  const currentArtworks = exhibitionArtworks.slice(indexOfFirstArtwork, indexOfLastArtwork);

  const getExhibitionImage = (id) => {
    return getApiUrl(`/api/artworks/image/${id}`);
  };

  const isArtworkInCart = (artId) => {
    return cartItems.some(item => item.id === artId);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // --- SUB-VIEW: Exhibition Artworks Grid ---
  if (selectedExhibition) {
    return (
      <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
        
        {/* Back navigation */}
        <button 
          onClick={() => setSelectedExhibition(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.6rem 1.25rem',
            borderRadius: '20px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginBottom: '2rem',
            transition: 'all 0.3s'
          }}
          className="back-btn"
        >
          ← Back to Exhibitions
        </button>

        {/* Selected Exhibition Header Detail Card */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '2.5rem', 
            marginBottom: '3rem', 
            borderLeft: '4px solid var(--accent-gold)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem'
          }}
        >
          <div style={{ flex: '1 1 500px' }}>
            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', padding: '0.25rem 0.65rem', borderRadius: '4px', fontWeight: 600 }}>
              Exhibition Collection
            </span>
            <h1 style={{ fontSize: '2.2rem', marginTop: '0.75rem', marginBottom: '0.5rem', color: '#fff', fontWeight: 800 }}>
              {selectedExhibition.document_name}
            </h1>
            <p style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1.25rem' }}>
              {formatDate(selectedExhibition.active_date)} - {formatDate(selectedExhibition.exp_date) || 'Ongoing'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7', margin: 0 }}>
              {selectedExhibition.description || 'Discover premium works from master artists presented in this exhibition.'}
            </p>
          </div>
          
          <button
            className="btn-primary"
            style={{ padding: '0.85rem 1.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
            disabled={downloadingCatalogId === selectedExhibition.id}
            onClick={() => handleDownloadCatalog(selectedExhibition)}
          >
            {downloadingCatalogId === selectedExhibition.id ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
            {downloadingCatalogId === selectedExhibition.id ? 'Compiling PDF...' : 'Download PDF Catalog'}
          </button>
        </div>

        {/* Artworks List */}
        <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1.5rem', fontWeight: 700 }}>
          Exhibition Artworks ({exhibitionArtworks.length})
        </h2>

        {loadingArtworks ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
            Loading exhibition artworks...
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '2.5rem' 
            }} className="exhibit-artworks-grid">
              {currentArtworks.map((art) => (
                <div 
                  key={art.id} 
                  className="glass-card artwork-card"
                  style={{ 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.3s ease, border-color 0.3s ease',
                    position: 'relative'
                  }}
                >
                  {/* Image container with Hover Overlay */}
                  <div style={{ height: '260px', overflow: 'hidden', position: 'relative', backgroundColor: '#111' }}>
                    <img 
                      src={getExhibitionImage(art.id)} 
                      alt={art.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} 
                      className="art-grid-image"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';
                      }}
                    />
                    {/* Hover Overlay Button to View details */}
                    <div className="art-hover-overlay" style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s ease'
                    }}>
                      <button 
                        onClick={() => viewArtworkDetail && viewArtworkDetail(art.id)}
                        className="btn-primary" 
                        style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Artwork details text */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', margin: '0 0 0.25rem 0', fontWeight: 600 }}>
                      {art.artist_name || 'Unknown Artist'}
                    </p>
                    <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '0 0 0.5rem 0', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {art.title}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                      Code: {art.code || 'N/A'} {art.length ? `• ${art.length}x${art.width} in` : ''}
                    </p>
                    
                    {/* Footer Row (Price & Status badge) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
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

            {exhibitionArtworks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                No artworks catalogued for this exhibition yet.
              </div>
            )}

            {/* Pagination for Exhibition Artworks */}
            {exhibitionArtworks.length > artworksPerPage && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '3.5rem',
                gap: '0.4rem'
              }}>
                <button
                  onClick={() => setArtworksPage(prev => Math.max(1, prev - 1))}
                  disabled={activeArtworksPage === 1}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: activeArtworksPage === 1 ? 'rgba(255, 255, 255, 0.15)' : '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '6px',
                    cursor: activeArtworksPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Previous
                </button>

                {Array.from({ length: totalArtworksPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalArtworksPages || Math.abs(page - activeArtworksPage) <= 1)
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span style={{ color: 'var(--text-muted)', padding: '0.55rem 0.75rem', alignSelf: 'flex-end' }}>...</span>
                        )}
                        <button
                          onClick={() => setArtworksPage(page)}
                          style={{
                            background: activeArtworksPage === page ? 'var(--accent-gold, #cfa15c)' : 'rgba(255, 255, 255, 0.03)',
                            color: activeArtworksPage === page ? '#000' : '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontWeight: activeArtworksPage === page ? '700' : '500',
                            padding: '0.55rem 1.1rem',
                            minWidth: '2.6rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setArtworksPage(prev => Math.min(totalArtworksPages, prev + 1))}
                  disabled={activeArtworksPage === totalArtworksPages}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: activeArtworksPage === totalArtworksPages ? 'rgba(255, 255, 255, 0.15)' : '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '6px',
                    cursor: activeArtworksPage === totalArtworksPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <style>{`
          .exhibit-artworks-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5rem;
          }
          @media (max-width: 1200px) {
            .exhibit-artworks-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (max-width: 992px) {
            .exhibit-artworks-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 768px) {
            .exhibit-artworks-grid {
              grid-template-columns: 1fr;
            }
          }
          .back-btn:hover {
            border-color: var(--accent-gold) !important;
            color: var(--accent-gold) !important;
            background: rgba(212, 175, 55, 0.05) !important;
          }
        `}</style>
      </div>
    );
  }

  // --- MAIN VIEW: Exhibitions Directory ---
  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Dynamic Delivery Banner */}
      {bannerConfig && (
        <div 
          className="exhibition-delivery-banner"
          style={{
            backgroundColor: bannerConfig.bgColor || '#ffffff',
            borderColor: bannerConfig.borderColor || '#8fa499',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2rem 3rem',
            borderRadius: '16px',
            border: `3px double ${bannerConfig.borderColor || '#8fa499'}`,
            marginBottom: '3rem',
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeIn 0.6s ease',
            gap: '2rem',
            boxShadow: 'var(--shadow-premium, 0 10px 30px rgba(0,0,0,0.05))'
          }}
        >
          {bannerConfig.mode === 'custom' && bannerConfig.customImage ? (
            <img 
              src={getBannerImageUrl(bannerConfig.customImage)} 
              alt="Delivery Banner" 
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxHeight: '260px',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          ) : (
            <>
              {/* Left Column: Styled Texts */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h2 
                  style={{ 
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '2rem', 
                    fontWeight: '800', 
                    color: bannerConfig.textColor || '#8fa499', 
                    margin: 0,
                    letterSpacing: '0.04em',
                    lineHeight: '1.25'
                  }}
                >
                  {bannerConfig.title || 'WE DELIVER ARTWORKS WORLD WIDE.'}
                </h2>
                <p 
                  style={{ 
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: bannerConfig.subtitleColor || '#cfa15c', 
                    margin: 0,
                    letterSpacing: '0.02em'
                  }}
                >
                  {bannerConfig.subtitle || 'FREE DELIVERY ALL OVER PAKISTAN.'}
                </p>
              </div>

              {/* Right Column: Airplane map Illustration */}
              {bannerConfig.hasPlaneIllustration && (
                <div className="banner-illustration-container" style={{ flexShrink: 0, height: '160px', display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={getBannerImageUrl(bannerConfig.illustrationImage || 'default_pakistan_airplane_map.png')} 
                    alt="Pakistan Delivery Map" 
                    style={{
                      height: '100%',
                      width: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.08))'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="gradient-title">
          Gallery Exhibitions
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Discover our current shows, upcoming releases, and historical past archives.
        </p>
      </div>

      {/* Horizontal Tabs selector */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        marginBottom: '2.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '1rem'
      }}>
        {['current', 'upcoming', 'previous'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
            style={{
              padding: '0.55rem 1.75rem',
              fontSize: '0.9rem',
              textTransform: 'capitalize',
              borderRadius: '20px',
              border: activeTab === tab ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: activeTab === tab ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-gold)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {tab} Shows
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
          Loading exhibitions...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="exhibits-cards-grid">
            {currentExhibitions.map((ex) => {
              const status = getExhibitionStatus(ex.active_date, ex.exp_date);
              const borderColors = {
                current: 'var(--accent-green, #10b981)',
                upcoming: 'var(--accent-gold, #cfa15c)',
                previous: 'var(--text-muted, #9ca3af)'
              };
              const labelTexts = {
                current: 'Active Show',
                upcoming: 'Upcoming Show',
                previous: 'Passed Show'
              };
              const labelStyles = {
                current: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' },
                upcoming: { backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)' },
                previous: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }
              };

              return (
                <div 
                  key={ex.id}
                  className="glass-card exhibit-grid-card"
                  onClick={() => setSelectedExhibition(ex)}
                  style={{ 
                    borderLeft: `4px solid ${borderColors[status]}`
                  }}
                >
                  <div className="exhibit-card-img-container">
                    <img 
                      src={getExhibitionImage(ex.id)} 
                      alt={ex.document_name} 
                      className="exhibit-card-img"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400';
                      }}
                    />
                  </div>
                  <div className="exhibit-card-content">
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontWeight: 600,
                      alignSelf: 'flex-start',
                      marginBottom: '0.75rem',
                      ...labelStyles[status]
                    }}>
                      {labelTexts[status]}
                    </span>
                    <h2 className="exhibit-card-title">{ex.document_name}</h2>
                    <p className="exhibit-card-date">
                      {formatDate(ex.active_date)} - {formatDate(ex.exp_date) || 'Ongoing'}
                    </p>
                    <p className="exhibit-card-desc">
                      {ex.description || 'Discover detailed portfolios of the artworks catalogued for this exhibition.'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-secondary" 
                        onClick={() => setSelectedExhibition(ex)}
                        style={{ flex: 1.2, padding: '0.55rem 0', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        Browse Portfolio
                      </button>
                      <button 
                        className="btn-primary" 
                        disabled={downloadingCatalogId === ex.id}
                        onClick={() => handleDownloadCatalog(ex)}
                        style={{ flex: 1, padding: '0.55rem 0', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}
                      >
                        {downloadingCatalogId === ex.id ? <Loader className="animate-spin" size={14} /> : <Download size={14} />}
                        {downloadingCatalogId === ex.id ? 'Loading' : 'PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedExhibitions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No {activeTab} exhibitions configured in archive directory.
            </div>
          )}

          {/* Pagination Controls */}
          {sortedExhibitions.length > itemsPerPage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: '2rem',
              gap: '0.4rem'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: activePage === 1 ? 'rgba(255, 255, 255, 0.15)' : '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
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
                        <span style={{ color: 'var(--text-muted)', padding: '0.5rem 0.6rem', alignSelf: 'flex-end' }}>...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        style={{
                          background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'rgba(255, 255, 255, 0.03)',
                          color: activePage === page ? '#000' : '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontWeight: activePage === page ? '700' : '500',
                          padding: '0.5rem 1rem',
                          minWidth: '2.4rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
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
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hover effects */}
      <style>{`
        .exhibits-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2.5rem;
        }
        @media (max-width: 1200px) {
          .exhibits-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .exhibits-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .exhibit-grid-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .exhibit-grid-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-gold) !important;
          box-shadow: var(--shadow-gold), var(--shadow-premium);
        }
        .exhibit-card-img-container {
          height: 200px;
          overflow: hidden;
          background-color: #111;
          border-bottom: 1px solid var(--border-color);
        }
        .exhibit-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .exhibit-grid-card:hover .exhibit-card-img {
          transform: scale(1.04);
        }
        .exhibit-card-content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .exhibit-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 0.4rem 0;
          line-height: 1.4;
          transition: color 0.3s ease;
        }
        .exhibit-grid-card:hover .exhibit-card-title {
          color: var(--accent-gold) !important;
        }
        .exhibit-card-date {
          font-size: 0.8rem;
          color: var(--accent-gold);
          font-weight: 600;
          margin: 0 0 1rem 0;
        }
        .exhibit-card-desc {
          color: var(--text-secondary);
          font-size: 0.85rem;
          line-height: 1.6;
          margin: 0 0 1.25rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .exhibit-card-link-text {
          margin-top: auto;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--accent-gold);
        }
        
        /* Banner Responsive Styles */
        @media (max-width: 992px) {
          .exhibition-delivery-banner {
            padding: 1.75rem 2rem !important;
          }
          .exhibition-delivery-banner h2 {
            font-size: 1.6rem !important;
          }
          .exhibition-delivery-banner p {
            font-size: 1.1rem !important;
          }
          .banner-illustration-container {
            height: 130px !important;
          }
        }
        @media (max-width: 768px) {
          .exhibition-delivery-banner {
            flex-direction: column !important;
            text-align: center !important;
            padding: 1.5rem !important;
            gap: 1.5rem !important;
          }
          .exhibition-delivery-banner h2 {
            font-size: 1.35rem !important;
          }
          .exhibition-delivery-banner p {
            font-size: 0.95rem !important;
          }
          .banner-illustration-container {
            height: 110px !important;
            align-self: center !important;
          }
        }
      `}</style>
    </div>
  );
}
