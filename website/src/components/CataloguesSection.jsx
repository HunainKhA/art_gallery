import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';
import { formatPrice } from '../services/currency';
import { FileText, Download, Eye, ArrowLeft, Loader } from 'lucide-react';

export default function CataloguesSection({ currency, exchangeRates }) {
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

  // Fetch all exhibitions
  useEffect(() => {
    setLoading(true);
    fetch(getApiUrl('/api/crm/exhibitions'))
      .then(res => res.json())
      .then(data => {
        setExhibitions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching exhibitions:", err);
        setExhibitions([]);
        setLoading(false);
      });
  }, []);

  // Fetch artworks when an exhibition is selected for preview
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

  // Split array into chunks for printing A4 pages
  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // Download Catalog PDF Compiler
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

    // Print template layout
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

  // --- SUB-VIEW: Exhibition Artworks Grid ---
  if (selectedExhibition) {
    const coverImage = getApiUrl(`/api/artworks/image/${selectedExhibition.id}`);
    const isDownloading = downloadingCatalogId === selectedExhibition.id;

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
          ← Back to Catalogues
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
              Exhibition Catalog
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
            disabled={isDownloading}
            onClick={() => handleDownloadCatalog(selectedExhibition)}
          >
            {isDownloading ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
            {isDownloading ? 'Compiling PDF...' : 'Download Full PDF Catalog'}
          </button>
        </div>

        {/* Artworks List */}
        <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '1.5rem', fontWeight: 700 }}>
          Exhibition Artworks ({exhibitionArtworks.length})
        </h2>

        {loadingArtworks ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
            Loading artworks gallery...
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '2.5rem' 
            }} className="catalog-artworks-pics-grid">
              {currentArtworks.map((art) => (
                <div 
                  key={art.id} 
                  className="glass-card"
                  style={{ 
                    borderRadius: '16px', 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    border: '1px solid var(--border-color)',
                    position: 'relative'
                  }}
                >
                  {/* Artwork Image */}
                  <div style={{ height: '240px', overflow: 'hidden', backgroundColor: '#111' }}>
                    <img 
                      src={getApiUrl(`/api/artworks/image/${art.id}`)} 
                      alt={art.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';
                      }}
                    />
                  </div>

                  {/* Artwork Details */}
                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', margin: '0 0 0.25rem 0', fontWeight: 600 }}>
                        {art.artist_name || 'Unknown Artist'}
                      </p>
                      <h3 style={{ fontSize: '1.05rem', color: '#fff', margin: '0 0 0.5rem 0', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {art.title}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0' }}>
                        Code: {art.code || 'N/A'}
                      </p>
                      {art.length ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.15rem 0 0 0' }}>
                          Dimensions: {art.length}x{art.width} in
                        </p>
                      ) : null}
                    </div>
                    
                    {/* Price & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: art.status === 'Available' || art.status === 'not_sold' ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
                        {art.status === 'Available' || art.status === 'not_sold' 
                          ? formatPrice(art.price, currency, exchangeRates) 
                          : 'Sold Out'}
                      </span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        backgroundColor: art.status === 'Available' || art.status === 'not_sold' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        color: art.status === 'Available' || art.status === 'not_sold' ? 'var(--accent-green)' : 'var(--accent-red)', 
                        padding: '0.2rem 0.55rem', 
                        borderRadius: '4px', 
                        fontWeight: 600 
                      }}>
                        {art.status === 'Available' || art.status === 'not_sold' ? 'Available' : 'Sold'}
                      </span>
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
          .catalog-artworks-pics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5rem;
          }
          @media (max-width: 1200px) {
            .catalog-artworks-pics-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (max-width: 992px) {
            .catalog-artworks-pics-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 768px) {
            .catalog-artworks-pics-grid {
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

  // --- MAIN VIEW: Catalog Directory of Exhibition Cards ---
  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <h1 className="gradient-title">
          Art Catalogues
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Browse premium exhibition portfolios and download printable high-definition catalogs.
        </p>
      </div>

      {/* Exhibitions Catalog Cards Grid */}
      <div className="catalog-grid">
        {currentExhibitions.map((ex) => {
          const coverImage = getApiUrl(`/api/artworks/image/${ex.id}`);
          const isDownloading = downloadingCatalogId === ex.id;

          return (
            <div key={ex.id} className="glass-card catalog-card">
              {/* Cover Image */}
              <div className="catalog-card-image-container">
                <img 
                  src={coverImage} 
                  alt={ex.document_name}
                  className="catalog-card-image"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=500';
                  }}
                />
              </div>

              {/* Title, date & info */}
              <div className="catalog-card-body">
                <h3 className="catalog-card-title">{ex.document_name}</h3>
                <p className="catalog-card-date">
                  {formatDate(ex.active_date)} - {formatDate(ex.exp_date) || 'Ongoing'}
                </p>
                <p className="catalog-card-desc">
                  {ex.description || 'Complete catalog portfolio of the master artworks showcased in this show.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="catalog-card-footer">
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '0.55rem 0', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
                  onClick={() => setSelectedExhibition(ex)}
                >
                  <Eye size={14} /> Browse Pics
                </button>

                <button 
                  className="btn-primary" 
                  style={{ flex: 1.3, padding: '0.55rem 0', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
                  disabled={isDownloading}
                  onClick={() => handleDownloadCatalog(ex)}
                >
                  {isDownloading ? <Loader className="animate-spin" size={14} /> : <Download size={14} />}
                  {isDownloading ? 'Compiling...' : 'Download PDF'}
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
              background: 'rgba(255, 255, 255, 0.03)',
              color: activePage === 1 ? 'rgba(255, 255, 255, 0.15)' : '#fff',
              border: '1px solid rgba(255, 255, 255, 0.08)',
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
          gap: 2.5rem;
        }
        @media (max-width: 1200px) {
          .catalog-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .catalog-grid {
            grid-template-columns: 1fr;
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
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .catalog-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }
        .catalog-card-date {
          font-size: 0.8rem;
          color: var(--accent-gold);
          font-weight: 600;
          margin: 0 0 1rem 0;
        }
        .catalog-card-desc {
          color: var(--text-secondary);
          font-size: 0.85rem;
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
          gap: 0.75rem;
          padding: 1.25rem 1.5rem 1.5rem 1.5rem;
          border-top: 1px solid var(--border-color);
          background-color: rgba(0, 0, 0, 0.1);
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
