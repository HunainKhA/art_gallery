import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';
import { generateCatalogPDF } from '../services/catalogPdfGenerator';
import { FileText, Download, Eye, ArrowLeft, Loader } from 'lucide-react';

export default function CataloguesSection({
  currency,
  exchangeRates,
  viewArtworkDetail,
  setIsInquiryModalOpen,
  setSelectedArtworkForInquiry,
  handleAddToCart,
  cartItems
}) {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExhibition, setSelectedExhibition] = useState(null);
  const [exhibitionArtworks, setExhibitionArtworks] = useState([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [artworksPage, setArtworksPage] = useState(1);
  const [downloadingCatalogId, setDownloadingCatalogId] = useState(null);

  const itemsPerPage = 6;
  const artworksPerPage = 12;

  // Helper to dynamically resolve the catalog cover image url (or first artwork's image)
  const getCatalogCoverUrl = (item) => {
    if (item?.id) {
      return getApiUrl(`/api/crm/exhibitions/image/${item.id}`);
    }
    if (item?.filename) {
      return getApiUrl(`/api/artworks/image/${item.filename}`);
    }
    return '';
  };

  // Fetch all exhibitions and catalogues
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(getApiUrl('/api/crm/exhibitions')).then(res => res.json()).catch(() => []),
      fetch(getApiUrl('/api/crm/catalogues')).then(res => res.json()).catch(() => [])
    ])
      .then(([exhibitionsData, cataloguesData]) => {
        const exList = Array.isArray(exhibitionsData) ? exhibitionsData.map(item => ({ ...item, isExhibition: true })) : [];
        const catList = Array.isArray(cataloguesData) ? cataloguesData.map(item => ({ ...item, isExhibition: false })) : [];
        
        // Merge without duplicates by document_name or ID
        const seen = new Set();
        const combined = [];
        
        // Prioritize exhibitions first
        exList.forEach(item => {
          const key = item.document_name ? item.document_name.trim().toLowerCase() : item.id;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        });
        
        catList.forEach(item => {
          const key = item.document_name ? item.document_name.trim().toLowerCase() : item.id;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(item);
          }
        });

        // Sort newest date-wise
        combined.sort((a, b) => {
          const dateA = a.active_date ? new Date(a.active_date) : (a.date_entered ? new Date(a.date_entered) : new Date(0));
          const dateB = b.active_date ? new Date(b.active_date) : (b.date_entered ? new Date(b.date_entered) : new Date(0));
          return dateB - dateA;
        });

        setExhibitions(combined);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching catalogues/exhibitions:", err);
        setExhibitions([]);
        setLoading(false);
      });
  }, []);

  // Fetch artworks when a catalogue is selected for preview
  useEffect(() => {
    if (selectedExhibition) {
      setLoadingArtworks(true);
      setArtworksPage(1);
      
      const primaryUrl = selectedExhibition.isExhibition !== false
        ? `/api/crm/exhibitions/${selectedExhibition.id}/artworks`
        : `/api/crm/catalogues/${selectedExhibition.id}/artworks`;
        
      fetch(getApiUrl(primaryUrl))
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setExhibitionArtworks(data);
            setLoadingArtworks(false);
          } else {
            // Try alternative endpoint
            const altUrl = selectedExhibition.isExhibition !== false
              ? `/api/crm/catalogues/${selectedExhibition.id}/artworks`
              : `/api/crm/exhibitions/${selectedExhibition.id}/artworks`;
            fetch(getApiUrl(altUrl))
              .then(r => r.json())
              .then(altData => {
                setExhibitionArtworks(Array.isArray(altData) ? altData : []);
                setLoadingArtworks(false);
              })
              .catch(() => {
                setExhibitionArtworks([]);
                setLoadingArtworks(false);
              });
          }
        })
        .catch(err => {
          console.error("Error fetching artworks:", err);
          setExhibitionArtworks([]);
          setLoadingArtworks(false);
        });
    } else {
      setExhibitionArtworks([]);
    }
  }, [selectedExhibition]);

  // Utility to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Utility to fetch artworks data inline for downloading
  const fetchArtworksForExhibition = async (exhibitionId, isExhibition = true) => {
    try {
      const primaryUrl = isExhibition !== false
        ? `/api/crm/exhibitions/${exhibitionId}/artworks`
        : `/api/crm/catalogues/${exhibitionId}/artworks`;
        
      let res = await fetch(getApiUrl(primaryUrl));
      let data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        const altUrl = isExhibition !== false
          ? `/api/crm/catalogues/${exhibitionId}/artworks`
          : `/api/crm/exhibitions/${exhibitionId}/artworks`;
        res = await fetch(getApiUrl(altUrl));
        data = await res.json();
      }
      
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error fetching artworks for download:", err);
      return [];
    }
  };

  // Split array into chunks for printing A4 pages
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // Download Catalog PDF Compiler using native jsPDF generator
  const handleDownloadCatalog = async (exhibition, withPrice = false) => {
    const actionKey = `${exhibition.id}_${withPrice ? 'with' : 'without'}`;
    setDownloadingCatalogId(actionKey);
    try {
      const artworks = (exhibitionArtworks && exhibitionArtworks.length > 0 && selectedExhibition?.id === exhibition.id)
        ? exhibitionArtworks
        : await fetchArtworksForExhibition(exhibition.id, exhibition.isExhibition);
      if (!artworks || artworks.length === 0) {
        alert("No artworks found for this catalogue to compile.");
        return;
      }
      await generateCatalogPDF(exhibition, artworks, null, { includePrice: withPrice });
    } catch (err) {
      console.error("Catalog generation failed:", err);
      alert("Error compiling PDF catalogue: " + (err.message || 'Please try again.'));
    } finally {
      setDownloadingCatalogId(null);
    }
  };

  // Pagination slice for Catalogues list
  const totalPages = Math.ceil(exhibitions.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExhibitions = exhibitions.slice(indexOfFirstItem, indexOfLastItem);

  // Pagination slice for Exhibition artworks
  const totalArtworksPages = Math.ceil(exhibitionArtworks.length / artworksPerPage);
  const activeArtworksPage = artworksPage > totalArtworksPages ? Math.max(1, totalArtworksPages) : artworksPage;
  const indexOfLastArtwork = activeArtworksPage * artworksPerPage;
  const indexOfFirstArtwork = indexOfLastArtwork - artworksPerPage;
  const currentArtworks = exhibitionArtworks.slice(indexOfFirstArtwork, indexOfLastArtwork);



  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '1rem' }}>
        <Loader className="animate-spin" size={36} color="var(--accent-gold)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading catalog archive...</p>
      </div>
    );
  }

  if (selectedExhibition) {
    const coverImage = getCatalogCoverUrl(selectedExhibition);

    return (
      <div className="page-content catalogues-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>
        {/* Back navigation */}
        <button
          onClick={() => setSelectedExhibition(null)}
          className="btn-secondary back-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            marginBottom: '2rem'
          }}
        >
          <ArrowLeft size={16} /> Back to Catalogues
        </button>
            {/* Selected Exhibition Header Detail Card */}
            <div className="glass-card catalog-detail-header-card">
              <div className="catalog-detail-header-text">
                <h1 style={{ fontSize: '18px', marginTop: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 100 }}>
                  {selectedExhibition.document_name}
                </h1>
                <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 100, marginBottom: '1.25rem' }}>
                  {selectedExhibition.active_date
                    ? `${formatDate(selectedExhibition.active_date)} - ${formatDate(selectedExhibition.exp_date) || 'Ongoing'}`
                    : `Published on ${formatDate(selectedExhibition.date_entered)}`}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.7', margin: 0 }}>
                  {selectedExhibition.description || `Discover premium works from master artists compiled in this catalogue.`}
                </p>
              </div>

              {/* Single Clean Download Action */}
              <button
                className="btn-primary catalog-download-btn"
                disabled={!!downloadingCatalogId}
                onClick={() => handleDownloadCatalog(selectedExhibition)}
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: downloadingCatalogId ? 'not-allowed' : 'pointer'
                }}
              >
                {downloadingCatalogId === selectedExhibition.id ? (
                  <><Loader className="animate-spin" size={13} /> Compiling...</>
                ) : (
                  <><Download size={13} /> Download PDF</>
                )}
              </button>
            </div>

        {/* Artworks List */}
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: 400 }}>
          Catalogue ({exhibitionArtworks.length})
        </h2>

        {loadingArtworks ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
            Loading catalogue artworks...
          </div>
        ) : (
          <>
            <div className="catalog-artworks-pics-grid">
              {currentArtworks.map((art) => (
                <div
                  key={art.id}
                  className="glass-card art-card-interactive"
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
                  }}
                  onClick={() => viewArtworkDetail && viewArtworkDetail(art.id, exhibitionArtworks)}
                >
                  {/* Artwork Image with Hover Overlay */}
                  <div className="art-card-img-container">
                    <img
                      src={getApiUrl(`/api/artworks/image/${art.id}`)}
                      alt={art.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      className="art-grid-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.opacity = '0';
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
                        onClick={(e) => { e.stopPropagation(); viewArtworkDetail && viewArtworkDetail(art.id, exhibitionArtworks); }}
                        className="btn-primary"
                        style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Artwork details text */}
                  <div className="art-card-details-body" style={{
                    padding: '1.25rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Montserrat, sans-serif'
                  }}>
                    {/* Heading: Artist Name (Thin font, black/text-primary) */}
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

                    {/* Code / Title (12px - Placed at the bottom, matches text above) */}
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

                    {/* Footer Row (Inquiry on left in black, Available on right in green, Sold in red, or Hidden for Return) */}
                    {!(art.status && (art.status.toLowerCase() === 'return' || art.status.toLowerCase() === 'archive' || art.status.toLowerCase() === 'archived')) && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'auto',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.85rem'
                      }}>
                        {art.status && (art.status.toLowerCase() === 'sold' || art.status.toLowerCase() === 'soldout' || art.status.toLowerCase() === 'sold_out') ? (
                          <span className="status-sold" style={{ fontSize: '12px', fontWeight: 500, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                            Sold
                          </span>
                        ) : (
                          <>
                            <span className="status-inquiry" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 400, fontFamily: 'Montserrat, sans-serif' }}>
                              Inquiry
                            </span>
                            <span className="status-available" style={{ fontSize: '12px', fontWeight: 500, color: '#10b981', fontFamily: 'Montserrat, sans-serif' }}>
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

            {exhibitionArtworks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                No artworks catalogued for this catalogue yet.
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
                    background: 'var(--bg-input)',
                    color: activeArtworksPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
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
                          className={`pagination-page-btn ${activeArtworksPage === page ? 'active' : ''}`}
                          style={{
                            background: activeArtworksPage === page ? 'var(--accent-gold, #cfa15c)' : 'var(--bg-input)',
                            color: activeArtworksPage === page ? 'var(--bg-dark)' : 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
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
                    background: 'var(--bg-input)',
                    color: activeArtworksPage === totalArtworksPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
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
          .catalog-detail-header-card {
            padding: 2.5rem;
            margin-bottom: 3rem;
            border-left: 4px solid var(--accent-gold);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 2rem;
          }
          .catalog-detail-header-text {
            flex: 1 1 500px;
          }
          .catalog-download-btn {
            padding: 0.85rem 1.75rem;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border: none;
          }
          .catalog-artworks-pics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5rem;
          }
          .art-card-img-container {
            height: 260px;
            overflow: hidden;
            position: relative;
            background-color: #111;
          }
          .art-card-interactive:hover {
            transform: translateY(-5px);
            border-color: var(--accent-gold) !important;
            box-shadow: var(--shadow-gold), var(--shadow-premium);
          }
          .art-card-interactive:hover .art-grid-image {
            transform: scale(1.04);
          }
          .art-card-interactive:hover .art-hover-overlay {
            opacity: 1 !important;
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @media (max-width: 1200px) {
            .catalog-artworks-pics-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 1.75rem;
            }
            .art-card-img-container {
              height: 230px;
            }
          }
          @media (max-width: 992px) {
            .catalog-detail-header-card {
              padding: 1.75rem;
              margin-bottom: 2rem;
              gap: 1.5rem;
            }
            .catalog-artworks-pics-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 1.25rem;
            }
            .art-card-img-container {
              height: 210px;
            }
          }
          @media (max-width: 768px) {
            .catalog-detail-header-card {
              padding: 1.25rem;
              margin-bottom: 1.5rem;
              gap: 1rem;
              flex-direction: column;
              align-items: stretch;
            }
            .catalog-download-btn {
              width: 100%;
              justify-content: center;
              padding: 0.75rem 1.25rem;
            }
            .catalog-artworks-pics-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 0.85rem;
            }
            .art-card-img-container {
              height: 170px;
            }
            .art-card-details-body {
              padding: 0.85rem !important;
            }
          }
          @media (max-width: 480px) {
            .catalog-artworks-pics-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            .art-card-img-container {
              height: 220px;
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

  // --- MAIN VIEW: Catalog Directory of Exhibition Cards ---
  return (
    <div className="page-content catalogues-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>

      {/* Exhibitions Catalog Cards Grid */}
      <div className="catalog-grid">
        {currentExhibitions.map((ex) => {
          const coverImage = getCatalogCoverUrl(ex);
          const isDownloading = downloadingCatalogId === ex.id;

          return (
            <div
              key={ex.id}
              className="glass-card catalog-card"
              onClick={() => setSelectedExhibition(ex)}
              style={{ cursor: 'pointer' }}
            >
              {/* Cover Image */}
              <div className="catalog-card-image-container">
                <img
                  src={coverImage}
                  alt={ex.document_name}
                  className="catalog-card-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                />
              </div>

              {/* Title, date & info */}
              <div className="catalog-card-body">
                <h3 className="catalog-card-title" style={{ color: 'var(--text-primary)' }}>{ex.document_name}</h3>
                <p className="catalog-card-date" style={{ color: 'var(--text-primary)' }}>
                  {ex.active_date
                    ? `${formatDate(ex.active_date)} - ${formatDate(ex.exp_date) || 'Ongoing'}`
                    : `Published ${formatDate(ex.date_entered)}`}
                </p>
              </div>

              {/* Action Buttons (Borderless & Solid Black) */}
              <div className="catalog-card-footer">
                <button
                  className="exhibit-btn-noborder"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    color: 'var(--text-primary)',
                    flex: 1,
                    padding: '0.55rem 0',
                    fontSize: '12px',
                    fontWeight: 400,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedExhibition(ex);
                  }}
                >
                  Images
                </button>

                <button
                  className="exhibit-btn-noborder"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    color: 'var(--text-primary)',
                    flex: 1.3,
                    padding: '0.55rem 0',
                    fontSize: '12px',
                    fontWeight: 400,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  disabled={downloadingCatalogId === ex.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadCatalog(ex);
                  }}
                >
                  {downloadingCatalogId === ex.id ? <Loader className="animate-spin" size={14} /> : <Download size={14} />}
                  {downloadingCatalogId === ex.id ? 'Compiling...' : 'Download PDF'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {exhibitions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No exhibitions found in directory archive.
        </div>
      )}

      {/* Pagination for Exhibitions */}
      {exhibitions.length > itemsPerPage && (
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
              background: 'var(--bg-input)',
              color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.55rem 1.1rem',
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
                    <span style={{ fontWeight: 100, fontSize: '12px', color: 'var(--text-muted)', padding: '0.55rem 0.75rem', alignSelf: 'flex-end' }}>...</span>
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
              background: 'var(--bg-input)',
              color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.55rem 1.1rem',
              borderRadius: '6px',
              cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Styled Grid Components */}
      <style>{`
        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }
        @media (max-width: 1200px) {
          .catalog-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.75rem;
          }
        }
        @media (max-width: 768px) {
          .catalog-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .catalog-card-image-container {
            height: 180px !important;
          }
          .catalog-card-body {
            padding: 1rem !important;
          }
          .catalog-card-footer {
            padding: 0.75rem 1rem !important;
          }
        }
        .catalog-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .catalog-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-gold);
          box-shadow: var(--shadow-gold), var(--shadow-premium);
        }
        .catalog-card-image-container {
          height: 200px;
          overflow: hidden;
          background-color: #111;
          border-bottom: 1px solid var(--border-color);
        }
        .catalog-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .catalog-card:hover .catalog-card-image {
          transform: scale(1.04);
        }
        .catalog-card-body {
          padding: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .catalog-card-title {
          font-size: 14px;
          font-weight: 100;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }
        .catalog-card-date {
          font-size: 12px;
          color: var(--text-primary) !important;
          font-weight: 400;
          margin: 0 0 0.75rem 0;
        }
        .catalog-card-desc {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .catalog-card-footer {
          display: flex;
          gap: 12px;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border-color);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
