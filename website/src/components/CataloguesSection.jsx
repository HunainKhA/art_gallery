import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';
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
    if (item?.filename) {
      return getApiUrl(`/api/artworks/image/${item.filename}`);
    }
    if (item?.artwork_ids) {
      const firstId = item.artwork_ids.split(',')[0]?.trim();
      if (firstId) {
        return getApiUrl(`/api/artworks/image/${firstId}`);
      }
    }
    return '';
  };

  // Fetch all catalogues
  useEffect(() => {
    setLoading(true);
    fetch(getApiUrl('/api/crm/catalogues'))
      .then(res => res.json())
      .then(data => {
        setExhibitions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching catalogues:", err);
        setExhibitions([]);
        setLoading(false);
      });
  }, []);

  // Fetch artworks when a catalogue is selected for preview
  useEffect(() => {
    if (selectedExhibition) {
      setLoadingArtworks(true);
      setArtworksPage(1);
      fetch(getApiUrl(`/api/crm/catalogues/${selectedExhibition.id}/artworks`))
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
      const res = await fetch(getApiUrl(`/api/crm/catalogues/${exhibitionId}/artworks`));
      const data = await res.json();
      return Array.isArray(data) ? data.filter(art => art.status !== 'Return') : [];
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

  // Helper to convert image URL to base64 Data URL for robust PDF generation
  const toDataUrl = async (url) => {
    if (!url) return '';
    try {
      const res = await fetch(url);
      if (!res.ok) return '';
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Failed to fetch image for PDF:", url, e);
      return '';
    }
  };

  // Download Catalog PDF Compiler (No Banner - Direct Catalog Only)
  const handleDownloadCatalog = async (exhibition) => {
    setDownloadingCatalogId(exhibition.id);
    const artworks = await fetchArtworksForExhibition(exhibition.id);

    if (!artworks || artworks.length === 0) {
      setDownloadingCatalogId(null);
      alert("No artworks found for this catalogue to compile.");
      return;
    }

    // Preload all Artwork Images as Base64 in parallel
    const artworksWithImages = await Promise.all(
      artworks.map(async (art) => {
        const imgBase64 = await toDataUrl(getApiUrl(`/api/artworks/image/${art.id}`));
        return {
          ...art,
          imgSrc: imgBase64 || getApiUrl(`/api/artworks/image/${art.id}`)
        };
      })
    );

    setDownloadingCatalogId(null);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download/print the catalog.");
      return;
    }

    // Print template layout (Direct Artworks Catalog - No Banner)
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
              max-height: 297mm;
              padding: 12mm 16mm;
              box-sizing: border-box;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              position: relative;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              overflow: hidden;
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
              padding-bottom: 20px;
              display: flex;
              gap: 30px;
              box-sizing: border-box;
              height: 112mm;
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
              font-size: 14px;
              color: #cfa15c;
              font-weight: 700;
              margin: 0 0 8px 0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .artwork-title {
              font-size: 18px;
              font-weight: 700;
              color: #000;
              margin: 0 0 10px 0;
            }
            .artwork-meta {
              font-size: 12px;
              color: #555;
              margin: 0 0 15px 0;
              line-height: 1.7;
            }
            .page-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
              margin-bottom: 15px;
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
              margin-top: 15px;
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
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        </head>
        <body>
          <!-- LOADING OVERLAY -->
          <div id="loading-overlay" data-html2canvas-ignore="true" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: 'Montserrat', sans-serif;
            transition: opacity 0.5s ease;
          ">
            <div style="
              border: 4px solid #f3f3f3;
              border-top: 4px solid #cfa15c;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            "></div>
            <div style="font-size: 18px; font-weight: 600; color: #111;">Compiling PDF Catalog...</div>
            <div style="font-size: 14px; color: #666; margin-top: 8px;">Please wait while the artworks catalog is being compiled.</div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>

          <!-- ARTWORK DETAILS PAGES (2 per page) -->
          ${chunkArray(artworksWithImages, 2).map((chunk, pageIndex) => `
            <div class="page">
              <div>
                <div class="page-header">
                  <span>${exhibition.document_name} — Art Catalog</span>
                  <span>Mainframe The Gallery</span>
                </div>
                <div class="artworks-container">
                  ${chunk.map(art => `
                    <div class="artwork-card">
                      <div class="artwork-image-container">
                        <img 
                          class="artwork-image" 
                          src="${art.imgSrc}" 
                          alt="${art.title}"
                        />
                      </div>
                      <div class="artwork-info">
                        <p class="artwork-artist">${art.artist_name || 'Unknown Artist'}</p>
                        <p class="artwork-title">${art.title}</p>
                        <p class="artwork-meta">
                          <strong>Code:</strong> ${art.code || 'N/A'}<br/>
                          ${(() => {
        const dims = renderDimensions(art.width, art.length);
        return `<strong>Dimensions:</strong> ${dims.inStr} (${dims.cmStr})<br/>`;
      })()}
                          <strong>Medium:</strong> ${art.medium_name || 'Oil on Canvas'}<br/>
                          <strong>Status:</strong> ${art.status === 'Available' || art.status === 'not_sold' ? 'Available' : 'Sold Out'}
                        </p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="page-footer">
                <span>mainframethegallery.com</span>
                <span style="font-weight: 100; font-size: 12px;">Page ${pageIndex + 1} of ${Math.ceil(artworksWithImages.length / 2)}</span>
              </div>
            </div>
          `).join('')}
          
          <script>
            function waitForAllImages() {
              var imgs = Array.from(document.querySelectorAll('img'));
              var promises = imgs.map(function(img) {
                if (img.complete && img.naturalHeight !== 0) {
                  return Promise.resolve();
                }
                return new Promise(function(resolve) {
                  img.onload = function() { resolve(); };
                  img.onerror = function() { resolve(); };
                });
              });
              return Promise.all(promises);
            }

            function startGeneration() {
              waitForAllImages().then(function() {
                setTimeout(function() {
                  var element = document.body;
                  var opt = {
                    margin:       0,
                    filename:     'Catalog - ${exhibition.document_name.replace(/'/g, "\\'")}.pdf',
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, allowTaint: true, logging: false },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak:    { mode: 'css' }
                  };
                  
                  html2pdf().set(opt).from(element).save().then(function() {
                    var loader = document.getElementById('loading-overlay');
                    if (loader) loader.style.opacity = '0';
                    setTimeout(function() {
                      window.close();
                    }, 800);
                  }).catch(function(err) {
                    console.error("PDF generation failed:", err);
                    var loader = document.getElementById('loading-overlay');
                    if (loader) {
                      loader.innerHTML = '<div style="color: red; font-weight: bold; font-family: sans-serif; text-align: center; padding: 20px;">Failed to generate PDF. Please close this window and try again.</div>';
                    }
                  });
                }, 500);
              });
            }

            if (document.readyState === 'complete') {
              startGeneration();
            } else {
              window.addEventListener('load', startGeneration);
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

  if (selectedExhibition) {
    const coverImage = getCatalogCoverUrl(selectedExhibition);
    const isDownloading = downloadingCatalogId === selectedExhibition.id;

    return (
      <div className="page-content catalogues-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>

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
            fontSize: '12px',
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

          <button
            className="btn-primary"
            style={{ padding: '0.85rem 1.75rem', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}
            disabled={isDownloading}
            onClick={() => handleDownloadCatalog(selectedExhibition)}
          >
            {isDownloading ? <Loader className="animate-spin" size={10} /> : <Download size={10} />}
            {isDownloading ? 'Compiling PDF...' : 'Download Catalog'}
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '2.5rem'
            }} className="catalog-artworks-pics-grid">
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
                  <div style={{ height: '260px', overflow: 'hidden', position: 'relative', backgroundColor: '#111' }}>
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
                  <div style={{
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

                    {/* Footer Row (Inquiry on left in black, Available on right in green, or Sold in red) */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.85rem'
                    }}>
                      {art.status === 'Available' || art.status === 'not_sold' ? (
                        <>
                          <span className="status-inquiry" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 100, fontFamily: 'Montserrat, sans-serif' }}>
                            Inquiry
                          </span>
                          <span className="status-available" style={{ fontSize: '12px', fontWeight: 100, color: '#10b981', fontFamily: 'Montserrat, sans-serif' }}>
                            Available
                          </span>
                        </>
                      ) : (
                        <span className="status-sold" style={{ fontSize: '12px', fontWeight: 100, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                          Sold
                        </span>
                      )}
                    </div>
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
                  disabled={isDownloading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadCatalog(ex);
                  }}
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
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
         background-color: 'Black' ;
        }
        .catalog-card-title {
          font-size: 14px;
          font-weight: 100;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          line-height: 1.4;
        }
        .catalog-card-date {
          font-size: 12px;
          color: var(--text-primary) !important;
          font-weight: 400;
          margin: 0 0 1rem 0;
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
          padding: 12px 12px 12px 12px;
          border-top: 1px solid var(--border-color);
          background-color: 'white';
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
      `}</style>

    </div>
  );
}
