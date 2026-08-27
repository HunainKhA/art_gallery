import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl, fetchBannerConfig, getBannerImageUrl, fetchArtistDetail, getArtistImageUrl, getArtworkImageUrl } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';
import { Download, Loader, Lock, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';


export default function ExhibitionsSection({
  activeTab = 'previous',
  setActiveTab = () => { },
  selectedExhibition,
  setSelectedExhibition,
  viewArtworkDetail,
  handleAddToCart,
  cartItems = [],
  currency,
  exchangeRates,
  websiteSettings = { hide_prices: false },
  guestSession,
  setIsGuestModalOpen,
  artists = []
}) {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected Exhibition sub-view state
  const [exhibitionArtworks, setExhibitionArtworks] = useState([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [artworksPage, setArtworksPage] = useState(1);
  const artworksPerPage = 12;
  const [downloadingCatalogId, setDownloadingCatalogId] = useState(null);
  const [bannerConfig, setBannerConfig] = useState(null);
  const [exhibitionArtist, setExhibitionArtist] = useState(null);
  const [bookIndex, setBookIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [flipDirection, setFlipDirection] = useState('next');
  const [flipData, setFlipData] = useState({
    left: null,
    right: null,
    flipFront: null,
    flipBack: null
  });

  // Artist Biography Modal states
  const [selectedBioArtist, setSelectedBioArtist] = useState(null);
  const [showBioModal, setShowBioModal] = useState(false);
  const [currentBioSlideIndex, setCurrentBioSlideIndex] = useState(0);
  const [loadingBioArtist, setLoadingBioArtist] = useState(false);
  const [bioArtistsList, setBioArtistsList] = useState([]);
  const [bioArtistIndex, setBioArtistIndex] = useState(0);
  const bioBodyRef = useRef(null);

  const formatBioHtml = (bioHtml) => {
    if (!bioHtml) return '';
    let formatted = bioHtml;
    // Strip hardcoded inline font colors so CSS theme rules apply cleanly
    formatted = formatted.replace(/color\s*:\s*[^;"]+;?/gi, '');
    // Strip hardcoded inline backgrounds
    formatted = formatted.replace(/background(-color)?\s*:\s*[^;"]+;?/gi, '');

    formatted = formatted.replace(
      /(<table[\s\S]*?)(?:border="[^"]*")?([\s\S]*?>)/i,
      (match, p1, p2) => {
        let clean = (p1 + p2).replace(/\s*(?:border|cellpadding|cellspacing)="[^"]*"/gi, '');
        return clean.replace('<table', '<table border="0"');
      }
    );
    return formatted;
  };

  const handleOpenArtistBio = async (artistOrId, index = 0, currentList = []) => {
    if (!artistOrId) return;
    try {
      setLoadingBioArtist(true);
      if (currentList && currentList.length > 0) {
        setBioArtistsList(currentList);
        setBioArtistIndex(index);
      }
      const artistId = typeof artistOrId === 'object' ? artistOrId.id : artistOrId;
      if (typeof artistOrId === 'object' && artistOrId.bio && artistOrId.artworks) {
        setSelectedBioArtist(artistOrId);
        setShowBioModal(true);
        setLoadingBioArtist(false);
        if (bioBodyRef.current) bioBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const fullArtist = await fetchArtistDetail(artistId);
      if (fullArtist) {
        setSelectedBioArtist(fullArtist);
        setShowBioModal(true);
        if (bioBodyRef.current) bioBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Failed to load artist biography:", err);
    } finally {
      setLoadingBioArtist(false);
    }
  };

  const handleNextBioArtist = () => {
    if (!bioArtistsList || bioArtistsList.length <= 1) return;
    const nextIdx = (bioArtistIndex + 1) % bioArtistsList.length;
    setBioArtistIndex(nextIdx);
    if (bioBodyRef.current) bioBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    handleOpenArtistBio(bioArtistsList[nextIdx], nextIdx, bioArtistsList);
  };

  const handlePrevBioArtist = () => {
    if (!bioArtistsList || bioArtistsList.length <= 1) return;
    const prevIdx = (bioArtistIndex - 1 + bioArtistsList.length) % bioArtistsList.length;
    setBioArtistIndex(prevIdx);
    if (bioBodyRef.current) bioBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    handleOpenArtistBio(bioArtistsList[prevIdx], prevIdx, bioArtistsList);
  };

  useEffect(() => {
    let interval;
    if (showBioModal && selectedBioArtist && selectedBioArtist.artworks && selectedBioArtist.artworks.length > 0) {
      setCurrentBioSlideIndex(0);
      interval = setInterval(() => {
        setCurrentBioSlideIndex(prev => (prev + 1) % selectedBioArtist.artworks.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showBioModal, selectedBioArtist]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowBioModal(false);
      } else if (e.key === 'ArrowRight' && showBioModal && bioArtistsList.length > 1) {
        e.preventDefault();
        handleNextBioArtist();
      } else if (e.key === 'ArrowLeft' && showBioModal && bioArtistsList.length > 1) {
        e.preventDefault();
        handlePrevBioArtist();
      }
    };
    if (showBioModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBioModal, bioArtistIndex, bioArtistsList]);

  const [activeSubSec, setActiveSubSec] = useState('overview');

  const scrollToSection = (id) => {
    const el = document.getElementById(`exhibition-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSubSec(id);
    }
  };

  useEffect(() => {
    if (!selectedExhibition) return;

    const handleScroll = () => {
      const overviewEl = document.getElementById('exhibition-sec-overview');
      const catalogueEl = document.getElementById('exhibition-sec-catalogue');
      const imagesEl = document.getElementById('exhibition-sec-images');
      const videoEl = document.getElementById('exhibition-sec-video');

      const scrollPos = window.scrollY + 250;

      if (videoEl && scrollPos >= videoEl.offsetTop) {
        setActiveSubSec('video');
      } else if (imagesEl && scrollPos >= imagesEl.offsetTop) {
        setActiveSubSec('images');
      } else if (catalogueEl && scrollPos >= catalogueEl.offsetTop) {
        setActiveSubSec('catalogue');
      } else {
        setActiveSubSec('overview');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedExhibition]);

  // Helper to fetch artworks for catalog download
  const fetchArtworksForExhibition = async (exhibitionId) => {
    try {
      const res = await fetch(getApiUrl(`/api/crm/exhibitions/${exhibitionId}/artworks`));
      const data = await res.json();
      return Array.isArray(data) ? data.filter(art => art.status !== 'Return') : [];
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

  // Compile PDF catalog template
  const handleDownloadCatalog = async (exhibition) => {
    setDownloadingCatalogId(exhibition.id);
    const artworks = await fetchArtworksForExhibition(exhibition.id);

    if (!artworks || artworks.length === 0) {
      setDownloadingCatalogId(null);
      alert("No artworks found for this exhibition to compile a catalog.");
      return;
    }

    // 1. Preload Cover Image as Base64 (try exhibition cover first, fallback to 1st artwork image)
    let coverBase64 = await toDataUrl(getApiUrl(`/api/crm/exhibitions/image/${exhibition.id}`));
    if (!coverBase64 && artworks.length > 0) {
      coverBase64 = await toDataUrl(getApiUrl(`/api/artworks/image/${artworks[0].id}`));
    }

    // 2. Preload all Artwork Images as Base64 in parallel
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
      alert("Please allow popups in your browser to download the PDF catalog.");
      return;
    }

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
              margin-bottom: 40px;
              color: #000;
            }
            .logo-placeholder span {
              color: #cfa15c;
            }
            .cover-image-container {
              width: 150mm;
              height: 100mm;
              margin-bottom: 30px;
              border: 1px solid #eaeaea;
              padding: 8px;
              background: #fafafa;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 6px;
            }
            .cover-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .exhibition-title {
              font-size: 30px;
              font-weight: 800;
              margin-bottom: 12px;
              text-transform: uppercase;
              color: #000;
              letter-spacing: -0.01em;
            }
            .exhibition-date {
              font-size: 15px;
              color: #666;
              margin-bottom: 25px;
              font-weight: 500;
            }
            .exhibition-desc {
              font-size: 12px;
              line-height: 1.8;
              color: #444;
              max-width: 600px;
              margin: 0 auto 30px auto;
            }
            .footer-note {
              font-size: 11px;
              color: #999;
              position: absolute;
              bottom: 15mm;
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
            <div style="font-size: 14px; color: #666; margin-top: 8px;">Please wait while the artworks and cover are being compiled.</div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>

          <!-- COVER TITLE PAGE -->
          <div class="page title-page">
            <div class="logo-placeholder">MAINFRAME <span>THE GALLERY</span></div>
            ${coverBase64 ? `
              <div class="cover-image-container">
                <img 
                  class="cover-image" 
                  src="${coverBase64}" 
                  alt="${exhibition.document_name}"
                />
              </div>
            ` : ''}
            <div class="exhibition-title">${exhibition.document_name}</div>
            <div class="exhibition-date">${formatDate(exhibition.active_date)} - ${formatDate(exhibition.exp_date) || 'Ongoing'}</div>
            <div class="exhibition-desc">${exhibition.description || 'Complete catalog portfolio of the master artworks showcased.'}</div>
            <div class="footer-note">© 2026 Mainframe The Gallery. All Rights Reserved.</div>
          </div>
          
          <!-- ARTWORK DETAILS PAGES (2 per page) -->
          ${chunkArray(artworksWithImages, 2).map((chunk, pageIndex) => `
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
                <span>Page ${pageIndex + 1} of ${Math.ceil(artworksWithImages.length / 2)}</span>
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

  // Fetch artworks and artist details when an exhibition is selected
  useEffect(() => {
    if (selectedExhibition) {
      setLoadingArtworks(true);
      setArtworksPage(1);
      setBookIndex(0);
      setActiveSubSec('overview');

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

      if (selectedExhibition.artist_id) {
        fetchArtistDetail(selectedExhibition.artist_id)
          .then(data => {
            setExhibitionArtist(data);
          })
          .catch(err => {
            console.error("Error loading exhibition artist:", err);
            setExhibitionArtist(null);
          });
      } else {
        setExhibitionArtist(null);
      }
    } else {
      setExhibitionArtworks([]);
      setExhibitionArtist(null);
    }
  }, [selectedExhibition]);

  // Sync book slider page contents
  useEffect(() => {
    if (exhibitionArtworks.length > 0) {
      setFlipData({
        left: exhibitionArtworks[bookIndex],
        right: exhibitionArtworks[(bookIndex + 1) % exhibitionArtworks.length],
        flipFront: exhibitionArtworks[(bookIndex + 1) % exhibitionArtworks.length],
        flipBack: exhibitionArtworks[(bookIndex + 2) % exhibitionArtworks.length]
      });
    }
  }, [bookIndex, exhibitionArtworks]);

  // Auto flip book pages every 4 seconds (continuous infinite loop)
  useEffect(() => {
    if (!selectedExhibition || exhibitionArtworks.length <= 2 || isAutoplayPaused) return;

    const interval = setInterval(() => {
      const nextIndex = (bookIndex + 2) >= exhibitionArtworks.length ? 0 : (bookIndex + 2);

      setFlipDirection('next');
      setFlipData(prev => ({
        ...prev,
        flipBack: exhibitionArtworks[nextIndex]
      }));

      setIsFlipping(true);

      setTimeout(() => {
        setBookIndex(nextIndex);
        setIsFlipping(false);
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedExhibition, exhibitionArtworks, bookIndex, isAutoplayPaused]);

  // Reset page only when tab actually changes (prevents clearing selection on component remount)
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      setCurrentPage(1);
      setSelectedExhibition(null);
      prevTabRef.current = activeTab;
    }
  }, [activeTab, setSelectedExhibition]);

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
    return getApiUrl(`/api/crm/exhibitions/image/${id}`);
  };

  const isArtworkInCart = (artId) => {
    return cartItems.some(item => item.id === artId);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (selectedExhibition) {
    const isUpcoming = getExhibitionStatus(selectedExhibition.active_date, selectedExhibition.exp_date) === 'upcoming';
    const groupArtistsList = selectedExhibition.show_type === 'group' && selectedExhibition.group_artist_ids
      ? selectedExhibition.group_artist_ids.split(',')
        .map(id => id.trim())
        .map(id => artists.find(a => a.id === id))
        .filter(Boolean)
      : [];

    const jumpToPage = (idx) => {
      const targetIndex = idx % 2 === 0 ? idx : idx - 1;
      if (targetIndex >= 0 && targetIndex < exhibitionArtworks.length) {
        setBookIndex(targetIndex);
      }
    };

    const goNextPage = () => {
      if (isFlipping || exhibitionArtworks.length <= 2) return;
      const nextIndex = (bookIndex + 2) >= exhibitionArtworks.length ? 0 : (bookIndex + 2);

      setFlipDirection('next');
      setFlipData({
        left: exhibitionArtworks[bookIndex],
        right: exhibitionArtworks[Math.min(nextIndex + 1, exhibitionArtworks.length - 1)],
        flipFront: exhibitionArtworks[(bookIndex + 1) % exhibitionArtworks.length],
        flipBack: exhibitionArtworks[nextIndex]
      });

      setIsFlipping(true);
      setTimeout(() => {
        setBookIndex(nextIndex);
        setIsFlipping(false);
      }, 800);
    };

    const goPrevPage = () => {
      if (isFlipping || exhibitionArtworks.length <= 2) return;
      const maxEvenIndex = (Math.floor((exhibitionArtworks.length - 1) / 2)) * 2;
      const prevIndex = (bookIndex - 2 < 0) ? maxEvenIndex : (bookIndex - 2);

      setFlipDirection('prev');
      setFlipData({
        left: exhibitionArtworks[prevIndex],
        right: exhibitionArtworks[(bookIndex + 1) % exhibitionArtworks.length],
        flipBack: exhibitionArtworks[bookIndex],
        flipFront: exhibitionArtworks[(prevIndex + 1) % exhibitionArtworks.length]
      });

      setIsFlipping(true);
      setTimeout(() => {
        setBookIndex(prevIndex);
        setIsFlipping(false);
      }, 800);
    };

    return (
      <div className="page-content exhibitions-section-wrapper" style={{ animation: 'fadeIn 0.5s ease', paddingTop: '0.5rem' }}>

        {/* Back navigation */}
        <div style={{ marginBottom: '0.5rem' }}>
          <button
            onClick={() => setSelectedExhibition(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'transparent',
              border: 'none',
              padding: '0.4rem 0',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 400,
              boxShadow: 'none',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            className="back-btn"
          >
            ← Back
          </button>
        </div>

        {/* Sticky horizontal sub-navigation */}
        {!isUpcoming && (
          <div className="exhibition-sub-nav-horizontal">
            <button
              onClick={() => scrollToSection('overview')}
              className={`exhibition-nav-link ${activeSubSec === 'overview' ? 'active' : ''}`}
            >
              OVERVIEW
            </button>
            <button
              onClick={() => scrollToSection('catalogue')}
              className={`exhibition-nav-link ${activeSubSec === 'catalogue' ? 'active' : ''}`}
            >
              CATALOGUE
            </button>
            <button
              onClick={() => scrollToSection('images')}
              className={`exhibition-nav-link ${activeSubSec === 'images' ? 'active' : ''}`}
            >
              IMAGES
            </button>
            {selectedExhibition.video_url && (
              <button
                onClick={() => scrollToSection('video-player')}
                className={`exhibition-nav-link ${activeSubSec === 'video-player' ? 'active' : ''}`}
              >
                VIDEO
              </button>
            )}
            {selectedExhibition.guest_pics && selectedExhibition.guest_pics.split(',').filter(Boolean).length > 0 && (
              <button
                onClick={() => scrollToSection('video')}
                className={`exhibition-nav-link ${activeSubSec === 'video' ? 'active' : ''}`}
              >
                GUESTS
              </button>
            )}
          </div>
        )}

        {/* 1. OVERVIEW SECTION (UNIFIED HORIZONTAL SHOW CARD LAYOUT) */}
        <div id="exhibition-sec-overview" style={{ marginBottom: '3.5rem' }}>
          {(() => {
            const status = getExhibitionStatus(selectedExhibition.active_date, selectedExhibition.exp_date);
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
                className="glass-card exhibit-grid-card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '5.8fr 4.2fr',
                  minHeight: '520px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-premium)'
                }}
              >
                {/* LEFT: COVER IMAGE BANNER */}
                <div
                  className="exhibit-card-img-container"
                  style={{
                    height: '100%',
                    overflow: 'hidden',
                    backgroundColor: '#0c0d10',
                    borderRight: '1px solid var(--border-color)',
                    position: 'relative'
                  }}
                >
                  <img
                    src={getExhibitionImage(selectedExhibition.id)}
                    alt={selectedExhibition.document_name}
                    className="exhibit-card-img"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '30px',
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${status === 'current' ? 'rgba(16, 185, 129, 0.3)' : status === 'upcoming' ? 'white' : 'rgba(255,255,255,0.2)'}`,
                    ...labelStyles[status]
                  }}>
                    <span
                      className={status === 'current' ? 'pulse-green-dot' : ''}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: status === 'current' ? 'var(--accent-green)' : status === 'upcoming' ? 'var(--accent-gold)' : 'var(--text-muted)',
                        display: 'inline-block'
                      }}
                    />
                    {labelTexts[status]}
                  </div>
                </div>

                {/* RIGHT: TITLE, DATE, DESCRIPTION, FEATURED ARTISTS */}
                <div
                  className="exhibit-card-content"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto 0' }}>
                    <h1
                      className="exhibit-card-title"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 100,
                        color: 'var(--text-primary)',
                        margin: '0 0 0.4rem 0',
                        lineHeight: '1.4'
                      }}
                    >
                      {selectedExhibition.document_name}
                    </h1>
                    <p
                      className="exhibit-card-date"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '12px',
                        color: 'var(--accent-gold)',
                        fontWeight: 100,
                        margin: '0 0 0.75rem 0',
                        letterSpacing: '0.02em'
                      }}
                    >
                      <Calendar size={13} style={{ flexShrink: 0 }} />
                      <span>{formatDate(selectedExhibition.active_date)} - {formatDate(selectedExhibition.exp_date) || 'Ongoing'}</span>
                    </p>
                    <p
                      className="exhibit-card-desc"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedExhibition.description || 'Discover detailed portfolios of the artworks catalogued for this exhibition.'}
                    </p>
                  </div>

                  {/* FEATURED ARTISTS AT BOTTOM */}
                  {selectedExhibition.show_type === 'group' && groupArtistsList.length > 0 ? (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: 'auto' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 100, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        ARTISTS FEATURED
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '0.75rem' }}>
                        {groupArtistsList.map((a, idx) => {
                          const artistImgUrl = a.profile_image ? getArtistImageUrl(a.profile_image) : '';
                          return (
                            <div
                              key={a.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArtistBio(a, idx, groupArtistsList);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease'
                              }}
                              title={`View ${a.first_name} ${a.last_name || ''}'s Biography`}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-gold)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', backgroundColor: '#111' }}>
                                <img
                                  src={artistImgUrl}
                                  alt={`${a.first_name} ${a.last_name || ''}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-primary)', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{a.first_name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : exhibitionArtist ? (
                    <div
                      style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenArtistBio(exhibitionArtist);
                      }}
                      title={`View ${exhibitionArtist.first_name} ${exhibitionArtist.last_name || ''}'s Biography`}
                    >
                      {exhibitionArtist.profile_image && (
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-gold)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', backgroundColor: '#111', flexShrink: 0 }}>
                          <img
                            src={getArtistImageUrl(exhibitionArtist.profile_image)}
                            alt={`${exhibitionArtist.first_name} ${exhibitionArtist.last_name || ''}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      <div>
                        <h3 style={{ fontSize: '12px', fontWeight: 100, color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '0 0 0.15rem 0', textTransform: 'uppercase' }}>ARTIST FEATURED</h3>
                        <p style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--accent-gold)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {exhibitionArtist.first_name} {exhibitionArtist.last_name} →
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </div>

        {isUpcoming ? (
          /* TEASER VIEW FOR UPCOMING EXHIBITIONS */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>

            {/* Show cover banner image only */}
            <div style={{
              width: '100%',
              maxHeight: '450px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              backgroundColor: '#111'
            }}>
              <img
                src={getExhibitionImage(selectedExhibition.id)}
                alt={selectedExhibition.document_name}
                style={{ width: '100%', height: '100%', maxHeight: '450px', objectFit: 'cover' }}
              />
            </div>

            {/* Lock/Teaser info message */}
            <div
              className="glass-card"
              style={{
                padding: '3rem',
                textAlign: 'center',
                maxWidth: '650px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '16px',
                marginTop: '1rem',
                boxShadow: 'var(--shadow-premium)'
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-gold)',
                marginBottom: '0.5rem'
              }}>
                <Lock size={28} />
              </div>

              <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Exhibition Preview Locked
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                This exclusive exhibition starts on <strong style={{ color: 'var(--accent-gold)' }}>{formatDate(selectedExhibition.active_date)}</strong>.
                The catalog and artworks will be revealed here when the exhibition date arrives. Stay tuned!
              </p>

              <div style={{
                fontSize: '0.8rem',
                color: 'var(--accent-gold)',
                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontWeight: 600,
                border: '1px solid rgba(212, 175, 55, 0.15)',
                marginTop: '0.5rem'
              }}>
                Opening on {formatDate(selectedExhibition.active_date)}
              </div>
            </div>

          </div>
        ) : (
          /* STANDARD FULL EXHIBITION VIEW */
          <>
            {/* 2. CATALOGUE SECTION (VIRTUAL BOOK + PDF DOWNLOAD) */}
            {exhibitionArtworks.length > 0 && (
              <div id="exhibition-sec-catalogue" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

                {/* Side-by-Side Sidebar and Virtual Book Container */}
                <div style={{
                  display: 'flex',
                  gap: '3rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  maxWidth: '1100px',
                  flexWrap: 'wrap',
                  marginBottom: '2rem'
                }}>

                  {/* Left Column: Top-to-Bottom Artwork Thumbnail List */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    maxHeight: '430px',
                    overflowY: 'auto',
                    paddingRight: '1rem',
                    width: '100px',
                    borderRight: '1px solid var(--border-color)'
                  }} className="catalog-sidebar-thumbnails">
                    {exhibitionArtworks.map((art, idx) => {
                      const isActive = idx === bookIndex || idx === (bookIndex + 1) % exhibitionArtworks.length;
                      return (
                        <div
                          key={art.id}
                          onClick={() => jumpToPage(idx)}
                          style={{
                            width: '70px',
                            height: '55px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: `2px solid ${isActive ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                            cursor: 'pointer',
                            opacity: isActive ? 1 : 0.6,
                            transition: 'all 0.3s',
                            backgroundColor: '#111',
                            flexShrink: 0
                          }}
                          title={art.title || `Page ${idx + 1}`}
                        >
                          <img
                            src={getExhibitionImage(art.id)}
                            alt={art.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: 3D Virtual Flipping Book */}
                  <div className="book-wrapper" style={{ margin: 0, flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div className="book-cover">
                      <div className="book-body">
                        <div className="book-spine-line"></div>

                        {/* Left Static Page (Clicking goes to previous page) */}
                        {flipData.left && (
                          <div
                            className="book-page-half book-page-left"
                            onClick={goPrevPage}
                            style={{ cursor: 'pointer' }}
                            title="Click to go to previous page"
                          >
                            <div className="book-img-container">
                              <img
                                src={getExhibitionImage(flipData.left.id)}
                                alt={flipData.left.title}
                              />
                            </div>
                            <div className="book-caption">
                              <h4 className="book-caption-title">{flipData.left.title}</h4>
                              <p className="book-caption-meta">{flipData.left.artist_name || 'Unknown Artist'}</p>
                              <p className="book-caption-dims">{flipData.left.width ? `${flipData.left.width} x ${flipData.left.length} in` : ''}</p>
                            </div>
                          </div>
                        )}

                        {/* Right Static Page (Clicking goes to next page) */}
                        {flipData.right && (
                          <div
                            className="book-page-half book-page-right"
                            onClick={goNextPage}
                            style={{ cursor: 'pointer' }}
                            title="Click to go to next page"
                          >
                            <div className="book-img-container">
                              <img
                                src={getExhibitionImage(flipData.right.id)}
                                alt={flipData.right.title}
                              />
                            </div>
                            <div className="book-caption">
                              <h4 className="book-caption-title">{flipData.right.title}</h4>
                              <p className="book-caption-meta">{flipData.right.artist_name || 'Unknown Artist'}</p>
                              <p className="book-caption-dims">{flipData.right.width ? `${flipData.right.width} x ${flipData.right.length} in` : ''}</p>
                            </div>
                          </div>
                        )}

                        {/* 3D Flipping Page Layer overlay */}
                        {exhibitionArtworks.length > 2 && (
                          <div className={`book-flipping-page ${isFlipping ? 'is-turning' : ''} ${flipDirection === 'prev' ? 'prev-dir' : 'next-dir'}`}>
                            <div className="book-flipping-face front">
                              {flipData.flipFront && (
                                <>
                                  <div className="book-img-container">
                                    <img
                                      src={getExhibitionImage(flipData.flipFront.id)}
                                      alt={flipData.flipFront.title}
                                    />
                                  </div>
                                  <div className="book-caption">
                                    <h4 className="book-caption-title">{flipData.flipFront.title}</h4>
                                    <p className="book-caption-meta">{flipData.flipFront.artist_name || 'Unknown Artist'}</p>
                                    <p className="book-caption-dims">{flipData.flipFront.width ? `${flipData.flipFront.width} x ${flipData.flipFront.length} in` : ''}</p>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="book-flipping-face back">
                              {flipData.flipBack && (
                                <>
                                  <div className="book-img-container">
                                    <img
                                      src={getExhibitionImage(flipData.flipBack.id)}
                                      alt={flipData.flipBack.title}
                                    />
                                  </div>
                                  <div className="book-caption">
                                    <h4 className="book-caption-title">{flipData.flipBack.title}</h4>
                                    <p className="book-caption-meta">{flipData.flipBack.artist_name || 'Unknown Artist'}</p>
                                    <p className="book-caption-dims">{flipData.flipBack.width ? `${flipData.flipBack.width} x ${flipData.flipBack.length} in` : ''}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Autoplay & Navigation Controls below the book */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button
                      onClick={goPrevPage}
                      className="btn-secondary"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        minWidth: '80px',
                        borderRadius: '20px',
                        cursor: 'pointer'
                      }}
                    >
                      ← Prev
                    </button>

                    <button
                      onClick={() => setIsAutoplayPaused(prev => !prev)}
                      className="btn-secondary"
                      style={{
                        padding: '0.4rem 1.25rem',
                        fontSize: '0.8rem',
                        borderRadius: '20px',
                        borderColor: isAutoplayPaused ? 'rgba(212, 175, 55, 0.4)' : 'rgba(255,255,255,0.1)',
                        color: isAutoplayPaused ? 'var(--accent-gold)' : 'var(--text-secondary)'
                      }}
                    >
                      {isAutoplayPaused ? '▶ Play Autoplay' : '⏸ Pause Autoplay'}
                    </button>

                    <button
                      onClick={goNextPage}
                      className="btn-secondary"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        minWidth: '80px',
                        borderRadius: '20px',
                        cursor: 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Pages {bookIndex + 1} - {Math.min(bookIndex + 2, exhibitionArtworks.length)} of {exhibitionArtworks.length} {isAutoplayPaused ? '(Autoplay Paused)' : '(Auto-turning every 4 seconds)'}
                  </span>
                </div>

                {/* PDF Catalog compilation button (MOVED BELOW BOOK) */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                  <button
                    className="btn-primary"
                    style={{
                      padding: '0.8rem 1.75rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderRadius: '8px',
                      background: 'var(--accent-gold)',
                      border: 'none',
                      color: '#000',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    disabled={downloadingCatalogId === selectedExhibition.id}
                    onClick={() => handleDownloadCatalog(selectedExhibition)}
                  >
                    {downloadingCatalogId === selectedExhibition.id ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
                    {downloadingCatalogId === selectedExhibition.id ? 'Compiling PDF...' : 'Download PDF Catalog'}
                  </button>
                </div>
              </div>
            )}

            {/* 3. IMAGES SECTION (ARTWORKS GRID) */}
            <div id="exhibition-sec-images" style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '4rem' }}>
              <h2 style={{ fontSize: '14px', color: '#fff', marginBottom: '1.5rem', fontWeight: 100 }}>
                Artworks ({exhibitionArtworks.length})
              </h2>

              {loadingArtworks ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
                  Loading exhibition artworks...
                </div>
              ) : (
                <>
                  <div className="exhibit-artworks-grid">
                    {currentArtworks.map((art) => (
                      <div
                        key={art.id}
                        className="glass-card artwork-card"
                        onClick={() => viewArtworkDetail && viewArtworkDetail(art.id, exhibitionArtworks)}
                        style={{
                          borderRadius: '16px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          border: '1px solid var(--border-color)',
                          transition: 'transform 0.3s ease, border-color 0.3s ease',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Image container with Hover Overlay */}
                        <div style={{ height: '260px', overflow: 'hidden', position: 'relative', backgroundColor: '#111' }}>
                          <img
                            src={getExhibitionImage(art.id)}
                            alt={art.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                            className="art-grid-image"
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
                                <span className="status-inquiry" style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
                                  Inquiry
                                </span>
                                <span className="status-available" style={{ fontSize: '12px', fontWeight: 400, color: '#10b981', fontFamily: 'Montserrat, sans-serif' }}>
                                  Available
                                </span>
                              </>
                            ) : (
                              <span className="status-sold" style={{ fontSize: '12px', fontWeight: 400, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
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
            </div>

            {/* 4. GUEST GALLERY SECTION */}
            {selectedExhibition.guest_pics && selectedExhibition.guest_pics.split(',').filter(Boolean).length > 0 && (
              <div id="exhibition-sec-video" style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '4rem' }}>
                <h2 style={{ fontSize: '14px', color: 'black', marginBottom: '1.5rem', fontWeight: 100, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span> Photographs  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 100 }}>
                    ({selectedExhibition.guest_pics.split(',').filter(Boolean).length} photos)
                  </span>
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.5rem'
                }} className="guest-pics-grid">
                  {selectedExhibition.guest_pics.split(',').filter(Boolean).map((filename, idx) => {
                    const guestImgUrl = getApiUrl(`/api/crm/exhibitions/guest-pic/${filename}`);
                    return (
                      <div
                        key={idx}
                        className="glass-card guest-pic-card"
                        style={{
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          height: '240px',
                          background: '#111',
                          cursor: 'zoom-in',
                          transition: 'all 0.3s'
                        }}
                        onClick={() => window.open(guestImgUrl, '_blank')}
                      >
                        <img
                          src={guestImgUrl}
                          alt={`Guest ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                          className="guest-grid-image"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. VIDEO SECTION */}
            {selectedExhibition.video_url && (
              <div id="exhibition-sec-video-player" style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '4rem', width: '100%' }}>
                <h2 style={{ fontSize: '22px', color: 'black', marginBottom: '2rem', fontWeight: 700 }}>
                  Video
                </h2>
                <div style={{
                  width: '100%',
                  maxWidth: '900px',
                  margin: '0 auto',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-premium), 0 10px 30px rgba(0,0,0,0.5)',
                  backgroundColor: '#000',
                  lineHeight: 0
                }}>
                  <video
                    src={selectedExhibition.video_url.startsWith('http') ? selectedExhibition.video_url : getApiUrl(`/api/crm/exhibitions/video/${selectedExhibition.video_url}`)}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                  />
                </div>
              </div>
            )}
          </>
        )}

        <style>{`
          /*  Redesigned Split Front Layout */
          /* Fix overflow container issues for sticky sub-navbar */
          .main-content {
            overflow: visible !important;
          }
          
          /*  Redesigned Split Front Layout */
          .exhibition-front-layout {
            display: grid;
            grid-template-columns: 8fr 2fr;
            gap: 1.5rem;
            margin-bottom: 4rem;
            width: 100%;
            height: 40vh;
            min-height: 330px;
            max-height: 480px;
            align-items: stretch;
          }
          .exhibition-left-col {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            height: 100%;
          }
          .exhibition-front-title {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            line-height: 1.3;
            text-transform: uppercase;
            color: var(--text-primary);
            margin: 0;
            font-family: var(--font-title);
          }
          .exhibition-front-date {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0;
          }
          .exhibition-sub-nav-horizontal {
            position: sticky;
            top: 95px; /* Sit right below the main sticky navbar header */
            z-index: 99;
            background: transparent;
            padding: 0.75rem 0;
            display: flex;
            gap: 1.5rem;
            margin-bottom: 0.75rem;
            width: 100%;
            transition: all 0.3s;
          }
          .exhibition-nav-link {
            background: none;
            border: none;
            color: #000000 !important;
            font-size: 14px;
            font-weight: 100 !important;
            letter-spacing: 0.1em;
            cursor: pointer;
            padding: 0.4rem 0;
            text-align: left;
            transition: all 0.3s;
            border-bottom: 2px solid transparent;
            width: fit-content;
            text-transform: uppercase;
            font-family: 'Montserrat', sans-serif !important;
          }
          .exhibition-nav-link:hover,
          .exhibition-nav-link.active {
            color: #000000 !important;
            border-bottom-color: #000000 !important;
          }
          body.light-theme .exhibition-nav-link {
            color: #000000 !important;
            font-weight: 100 !important;
          }
          body.light-theme .exhibition-nav-link:hover,
          body.light-theme .exhibition-nav-link.active {
            color: #000000 !important;
            border-bottom-color: #000000 !important;
          }
          .back-btn,
          body.light-theme .back-btn {
            color: #000000 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0.4rem 0 !important;
          }
          .exhibition-right-col {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            background: transparent;
            border: none;
            box-sizing: border-box;
            transition: all 0.3s ease;
            padding-right: 0.5rem;
          }
          .exhibition-right-col:hover {
            background: transparent;
            border: none;
            box-shadow: none;
          }
          /* Custom clean scrollbar for right column */
          .exhibition-right-col::-webkit-scrollbar {
            width: 4px;
          }
          .exhibition-right-col::-webkit-scrollbar-track {
            background: transparent;
          }
          .exhibition-right-col::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
          }
          .exhibition-right-col::-webkit-scrollbar-thumb:hover {
            background: var(--accent-gold);
          }
          .exhibition-main-preview {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 3rem;
            align-items: start;
          }
          .exhibition-bio-text {
            font-size: 0.85rem;
            line-height: 1.6;
            color: var(--text-secondary);
            text-align: justify;
            font-weight: 300;
          }
          .exhibition-bio-text p {
            margin: 0 0 1rem 0;
          }
          .exhibition-featured-artists-section {
            margin-top: 1.5rem;
            border-top: 1px solid var(--border-color);
            padding-top: 1rem;
          }
          .exhibition-featured-artists-section h3 {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-muted);
            letter-spacing: 0.05em;
            margin: 0 0 0.5rem 0;
            text-transform: uppercase;
          }
          .featured-artist-name {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--accent-gold);
            margin: 0;
          }
          .exhibition-cover-img-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
            overflow: hidden;
          }
          .exhibition-cover-img-wrapper img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-premium);
          }
          @media (max-width: 968px) {
            .exhibition-front-layout {
              grid-template-columns: 1fr;
              gap: 2rem;
              height: auto;
            }
            .exhibition-cover-img-wrapper {
              height: auto;
            }
            .exhibition-cover-img-wrapper img {
              width: 100%;
              height: auto;
              max-height: 400px;
              object-fit: cover;
            }
            .exhibition-sub-nav {
              flex-direction: row;
              flex-wrap: wrap;
              gap: 1.5rem;
              border-bottom: 1px solid var(--border-color);
              padding-bottom: 1rem;
            }
            .exhibition-main-preview {
              grid-template-columns: 1fr;
              gap: 2rem;
            }
          }

          .guest-pic-card:hover {
            border-color: var(--accent-gold);
            transform: translateY(-4px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.5);
          }
          .guest-pic-card:hover .guest-grid-image {
            transform: scale(1.05);
          }
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
          
          /*  Premium Artwork Card Hover Styles */
          .artwork-card {
            cursor: pointer;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease !important;
          }
          .artwork-card:hover {
            transform: translateY(-4px);
            border-color: var(--accent-gold) !important;
            box-shadow: var(--shadow-gold), var(--shadow-premium);
          }
          .artwork-card:hover .art-grid-image {
            transform: scale(1.04);
          }
          .artwork-card:hover .art-hover-overlay {
            opacity: 1 !important;
          }

          /*  3D Virtual Catalog Book Slider Styles */
          .book-wrapper {
            perspective: 2000px;
            display: flex;
            justify-content: center;
            margin: 3rem 0;
            width: 100%;
          }
          .book-cover {
            background: linear-gradient(to right, #1c140d 0%, #2a1f14 10%, #352719 46%, #1c140d 49%, #120d08 50%, #1c140d 51%, #352719 54%, #2a1f14 90%, #1c140d 100%); /* realistic textured leather backing with gold foil borders */
            padding: 10px 14px 14px 14px;
            border-radius: 14px;
            box-shadow: 
              0 30px 60px rgba(0,0,0,0.6),
              inset 0 0 15px rgba(0,0,0,0.6);
            border: 2px solid #3d2f21;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            max-width: 900px;
            box-sizing: border-box;
          }
          .book-cover::before {
            content: '';
            position: absolute;
            top: 4px; left: 4px; right: 4px; bottom: 4px;
            border: 1px solid rgba(212, 175, 55, 0.25);
            border-radius: 11px;
            pointer-events: none;
          }
          .book-body {
            width: 100%;
            height: 480px;
            background: #faf6ee;
            border-radius: 4px 10px 10px 4px;
            box-shadow: 
              /* 3D stacked paper edges */
              -3px 0 0 -1px #d3c7b2, -3px 0 0 0 #fcfcfc,
              -6px 0 0 -2px #d3c7b2, -6px 0 0 -1px #fcfcfc,
              -9px 0 0 -3px #c5b69c, -9px 0 0 -2px #fcfcfc,
              3px 0 0 -1px #d3c7b2, 3px 0 0 0 #fcfcfc,
              6px 0 0 -2px #d3c7b2, 6px 0 0 -1px #fcfcfc,
              9px 0 0 -3px #c5b69c, 9px 0 0 -2px #fcfcfc,
              inset 0 0 40px rgba(0,0,0,0.06);
            display: flex;
            position: relative;
            border: 1px solid #d3c7b2;
            overflow: hidden;
          }
          .book-spine-line {
            position: absolute;
            left: 50%;
            top: 0;
            width: 16px;
            height: 100%;
            transform: translateX(-50%);
            background: linear-gradient(90deg, 
              rgba(0,0,0,0.25) 0%, 
              rgba(0,0,0,0.08) 30%, 
              rgba(0,0,0,0.03) 50%, 
              rgba(0,0,0,0.08) 70%, 
              rgba(0,0,0,0.25) 100%);
            z-index: 10;
            box-shadow: inset 0 0 8px rgba(0,0,0,0.15);
          }
          .book-page-half {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2.5rem;
            box-sizing: border-box;
            overflow: hidden;
            position: relative;
          }
          /* Curled page bottom corner shadow effect */
          .book-page-half::after {
            content: '';
            position: absolute;
            bottom: 0;
            width: 80%;
            height: 10px;
            background: transparent;
            box-shadow: 0 10px 14px rgba(0, 0, 0, 0.12);
            pointer-events: none;
            z-index: 1;
          }
          .book-page-left {
            background: linear-gradient(to right, #faf6ee 85%, #f2ebdd 100%);
            border-right: 1px solid rgba(0,0,0,0.08);
          }
          .book-page-left::after {
            right: 8px;
            transform: rotate(-1.5deg);
            border-bottom-right-radius: 40px 12px;
          }
          .book-page-right {
            background: linear-gradient(to left, #faf6ee 85%, #f2ebdd 100%);
            border-left: 1px solid rgba(0,0,0,0.08);
          }
          .book-page-right::after {
            left: 8px;
            transform: rotate(1.5deg);
            border-bottom-left-radius: 40px 12px;
          }
          .book-img-container {
            width: 100%;
            height: 280px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            overflow: hidden;
            background: rgba(0,0,0,0.03);
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          }
          .book-img-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .book-caption {
            margin-top: 1.5rem;
            text-align: center;
            width: 100%;
          }
          .book-caption-title {
            font-size: 14px;
            color: #fff;
            margin: 0 0 0.25rem 0;
            font-weight: 100;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .book-caption-meta {
            font-size: 12px;
            color: var(--accent-gold);
            margin: 0 0 0.25rem 0;
            font-weight: 100;
          }
          .book-caption-dims {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin: 0;
          }

          /* 3D Flipping Page classes */
          .book-flipping-page {
            position: absolute;
            top: 0;
            width: 50%;
            height: 100%;
            z-index: 5;
            transform-style: preserve-3d;
            pointer-events: none;
            display: none;
          }
          .book-flipping-page.is-turning {
            display: block;
            box-shadow: 0 15px 35px rgba(0,0,0,0.25);
          }
          .book-flipping-page.next-dir {
            right: 0;
            transform-origin: left center;
          }
          .book-flipping-page.next-dir.is-turning {
            animation: flipForward 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .book-flipping-page.prev-dir {
            left: 0;
            transform-origin: right center;
          }
          .book-flipping-page.prev-dir.is-turning {
            animation: flipBackward 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }

          /* Sweeping shadows for page curves during animation */
          .book-flipping-page.next-dir.is-turning .book-flipping-face.front::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 100%);
            pointer-events: none;
            animation: shadowSweepForward 0.8s ease-in-out forwards;
            z-index: 2;
          }
          .book-flipping-page.prev-dir.is-turning .book-flipping-face.front::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 100%);
            pointer-events: none;
            animation: shadowSweepBackward 0.8s ease-in-out forwards;
            z-index: 2;
          }
          
          @keyframes shadowSweepForward {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes shadowSweepBackward {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }

          @keyframes flipForward {
            0% {
              transform: rotateY(0deg);
              z-index: 5;
            }
            100% {
              transform: rotateY(-180deg);
              z-index: 5;
            }
          }

          @keyframes flipBackward {
            0% {
              transform: rotateY(-180deg);
              z-index: 5;
            }
            100% {
              transform: rotateY(0deg);
              z-index: 5;
            }
          }
          .book-flipping-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            box-sizing: border-box;
            padding: 2.5rem;
            background: #faf6ee;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .book-flipping-face.front {
            transform: rotateY(0deg);
            background: linear-gradient(to left, #faf6ee 85%, #f2ebdd 100%) !important;
            border-left: 1px solid rgba(0,0,0,0.08);
          }
          .book-flipping-face.back {
            transform: rotateY(180deg);
            background: linear-gradient(to right, #faf6ee 85%, #f2ebdd 100%) !important;
            border-right: 1px solid rgba(0,0,0,0.08);
          }

          /* Theme adjustments */
          .theme-dark .book-body {
            background: #1e222b;
            box-shadow: 
              -3px 0 0 -1px #11141a, -3px 0 0 0 #282d39,
              -6px 0 0 -2px #11141a, -6px 0 0 -1px #282d39,
              -9px 0 0 -3px #0d0f13, -9px 0 0 -2px #282d39,
              3px 0 0 -1px #11141a, 3px 0 0 0 #282d39,
              6px 0 0 -2px #11141a, 6px 0 0 -1px #282d39,
              9px 0 0 -3px #0d0f13, 9px 0 0 -2px #282d39,
              inset 0 0 40px rgba(0,0,0,0.3);
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          .theme-dark .book-page-left {
            background: linear-gradient(to right, #1e222b 85%, #15181e 100%) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
          }
          .theme-dark .book-page-right {
            background: linear-gradient(to left, #1e222b 85%, #15181e 100%) !important;
            border-left: 1px solid rgba(255, 255, 255, 0.06) !important;
          }
          .theme-dark .book-flipping-face.front {
            background: linear-gradient(to left, #1e222b 85%, #15181e 100%) !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          .theme-dark .book-flipping-face.back {
            background: linear-gradient(to right, #1e222b 85%, #15181e 100%) !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          .theme-light .book-body,
          .theme-light .book-flipping-face {
            background: #faf6ee !important;
            border-color: #dcd1be !important;
          }
          .theme-light .book-page-left {
            background: linear-gradient(to right, #faf6ee 85%, #f2ebdd 100%) !important;
            border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
          .theme-light .book-page-right {
            background: linear-gradient(to left, #faf6ee 85%, #f2ebdd 100%) !important;
            border-left: 1px solid rgba(0, 0, 0, 0.08) !important;
          }
          .theme-light .book-caption-title {
            color: #111 !important;
          }

          /* Responsive layout for book */
          @media (max-width: 768px) {
            .book-body {
              height: 380px !important;
            }
            .book-img-container {
              height: 180px !important;
            }
            .book-caption-title {
              font-size: 0.95rem !important;
            }
          }
        `}</style>

        {/* ARTIST BIOGRAPHY MODAL */}
        {showBioModal && selectedBioArtist && (
          <div
            onClick={() => setShowBioModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.5rem',
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-card artist-bio-modal-card"
              style={{
                width: '100%',
                maxWidth: '1100px',
                height: '75vh',
                minHeight: '540px',
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
              <div className="artist-bio-modal-header" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img
                    src={getArtistImageUrl(selectedBioArtist.profile_image) || ''}
                    alt={selectedBioArtist.name || `${selectedBioArtist.first_name || ''} ${selectedBioArtist.last_name || ''}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover',
                      border: '1.5px solid var(--accent-gold)',
                      borderRadius: '50%'
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Biography</span>
                      {bioArtistsList.length > 1 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.15rem 0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          {bioArtistIndex + 1} of {bioArtistsList.length} Artists
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '0.15rem 0 0 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {selectedBioArtist.name || `${selectedBioArtist.first_name || ''} ${selectedBioArtist.last_name || ''}`}
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Next / Prev buttons for group show in header */}
                  {bioArtistsList.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '0.5rem' }}>
                      <button
                        onClick={handlePrevBioArtist}
                        title="Previous Artist (Left Arrow)"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '6px',
                          padding: '0.4rem 0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-gold)';
                          e.currentTarget.style.color = 'var(--accent-gold)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                      >
                        <ChevronLeft size={15} /> Prev
                      </button>
                      <button
                        onClick={handleNextBioArtist}
                        title="Next Artist (Right Arrow)"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '6px',
                          padding: '0.4rem 0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-gold)';
                          e.currentTarget.style.color = 'var(--accent-gold)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  )}

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
              </div>

              {/* Content */}
              <div
                ref={bioBodyRef}
                className="custom-scrollbar artist-bio-modal-body"
                style={{
                  padding: '2rem',
                  overflowY: 'auto',
                  flex: 1,
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  scrollBehavior: 'smooth'
                }}
              >
                <div
                  key={selectedBioArtist?.id || bioArtistIndex}
                  className="bio-modal-layout bio-fade-in"
                >
                  {/* Left Side: Biography text */}
                  {(selectedBioArtist.bio && selectedBioArtist.bio.trim()) || (selectedBioArtist.artist_biography && selectedBioArtist.artist_biography.trim()) ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: formatBioHtml(selectedBioArtist.bio || selectedBioArtist.artist_biography) }}
                      className="artist-bio-rendered"
                    />
                  ) : (
                    <div className="artist-bio-empty-box" style={{
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
                      minHeight: '260px',
                      fontWeight: 100
                    }}>
                      Biography not available
                    </div>
                  )}

                  {/* Right Side: Work Slideshow */}
                  <div className="bio-slides-column">
                    {selectedBioArtist.artworks && selectedBioArtist.artworks.length > 0 ? (
                      <div>
                        <h4 className="bio-slideshow-title" style={{ marginTop: 0 }}>Artist's Work Gallery</h4>
                        <div className="bio-slideshow-frame">
                          <img
                            src={getArtworkImageUrl(selectedBioArtist.artworks[currentBioSlideIndex].id)}
                            alt={selectedBioArtist.artworks[currentBioSlideIndex].title}
                            className="bio-slideshow-img"
                            key={currentBioSlideIndex}
                          />
                          <div className="bio-slideshow-info">
                            <span>{selectedBioArtist.artworks[currentBioSlideIndex].title}</span>
                            <span>
                              {selectedBioArtist.artworks[currentBioSlideIndex].status !== 'Available' && selectedBioArtist.artworks[currentBioSlideIndex].status !== 'not_sold' ? (
                                <span style={{ fontSize: '12px', fontWeight: 400, color: '#ef4444' }}>
                                  Sold
                                </span>
                              ) : !guestSession ? (
                                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-primary)' }}>
                                  Inquiry
                                </span>
                              ) : (
                                websiteSettings.hide_prices ? 'Price on Request' : formatPrice(selectedBioArtist.artworks[currentBioSlideIndex].price, currency, exchangeRates)
                              )}
                            </span>
                          </div>
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
              <div className="artist-bio-modal-footer" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                {bioArtistsList.length > 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={handlePrevBioArtist}
                      style={{
                        padding: '0.45rem 1rem',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <ChevronLeft size={14} /> Previous Artist
                    </button>
                    <button
                      onClick={handleNextBioArtist}
                      style={{
                        padding: '0.45rem 1rem',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      Next Artist <ChevronRight size={14} />
                    </button>
                  </div>
                ) : <div />}
                <button
                  onClick={() => setShowBioModal(false)}
                  style={{
                    padding: '0.45rem 1.5rem',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          /* Biography Modal Layout */
          @keyframes bioFadeIn {
            0% {
              opacity: 0;
              transform: translateY(6px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .bio-fade-in {
            animation: bioFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .bio-modal-layout {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 2.5rem;
            align-items: start;
          }

          /* Artist Biography Text and Table Formatting */
          .artist-bio-rendered {
            color: var(--text-secondary);
            font-size: 13px;
            line-height: 1.75;
            padding-right: 0.5rem;
            font-weight: 400 !important;
          }
          .artist-bio-rendered table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1.5rem !important;
            border: 1px solid var(--border-color) !important;
            background: transparent !important;
          }
          .artist-bio-rendered th,
          .artist-bio-rendered td {
            padding: 1.15rem 1.4rem !important;
            border: 1px solid var(--border-color) !important;
            vertical-align: top !important;
            color: var(--text-secondary) !important;
            line-height: 1.7 !important;
            font-weight: 400 !important;
          }
          .artist-bio-rendered tr td:first-child,
          .artist-bio-rendered tr th:first-child {
            width: 25% !important;
            min-width: 140px !important;
            color: var(--text-primary) !important;
            font-weight: 500 !important;
            padding: 1.15rem 1.4rem !important;
            background: transparent !important;
          }
          .artist-bio-rendered p,
          .artist-bio-rendered span,
          .artist-bio-rendered div {
            font-weight: 400 !important;
          }
          .artist-bio-rendered strong,
          .artist-bio-rendered b,
          .artist-bio-rendered h1,
          .artist-bio-rendered h2,
          .artist-bio-rendered h3,
          .artist-bio-rendered h4 {
            font-weight: 600 !important;
          }

          /* Light Theme: Pure White Background & Crisp Solid Black Text */
          body.light-theme .artist-bio-modal-card {
            background: #ffffff !important;
            border-color: rgba(0, 0, 0, 0.12) !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12) !important;
          }
          body.light-theme .artist-bio-modal-header,
          body.light-theme .artist-bio-modal-body,
          body.light-theme .artist-bio-modal-footer {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border-color: rgba(0, 0, 0, 0.1) !important;
          }
          body.light-theme .artist-bio-rendered,
          body.light-theme .artist-bio-rendered * {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            opacity: 1 !important;
          }
          body.light-theme .artist-bio-rendered table {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border: 1px solid rgba(0, 0, 0, 0.15) !important;
          }
          body.light-theme .artist-bio-rendered th,
          body.light-theme .artist-bio-rendered td,
          body.light-theme .artist-bio-rendered th *,
          body.light-theme .artist-bio-rendered td * {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border-color: rgba(0, 0, 0, 0.15) !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            font-weight: 400 !important;
            opacity: 1 !important;
          }
          body.light-theme .artist-bio-rendered tr td:first-child,
          body.light-theme .artist-bio-rendered tr th:first-child,
          body.light-theme .artist-bio-rendered tr td:first-child *,
          body.light-theme .artist-bio-rendered tr th:first-child * {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            font-weight: 500 !important;
            opacity: 1 !important;
            border-color: rgba(0, 0, 0, 0.15) !important;
          }
          body.light-theme .artist-bio-empty-box {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border: 1px dashed rgba(0, 0, 0, 0.2) !important;
            color: #000000 !important;
            font-weight: 400 !important;
          }

          .bio-slides-column {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            position: sticky;
            top: 0;
          }
          .bio-slideshow-title {
            font-size: 12px;
            color: var(--accent-gold);
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
            0% { transform: translateX(50px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
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
            font-size: 12px;
            color: #ffffff;
            font-weight: 100;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 70%;
          }
          .bio-slideshow-info span:last-child {
            font-size: 12px;
            color: var(--accent-gold);
            font-weight: 100;
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
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--accent-gold)' }}>
        <Loader className="animate-spin" size={32} />
        <span style={{ marginLeft: '1rem', fontSize: '1.2rem' }}>Loading Exhibitions...</span>
      </div>
    );
  }

  return (
    <div className="page-content exhibitions-section-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>

      {/* Horizontal Tabs selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1.25rem',
        marginBottom: '3rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1.5rem',
        paddingTop: '2rem'
      }}>
        {['previous', 'current', 'upcoming'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
            style={{
              padding: '0.65rem 2rem',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: 'none',
              border: activeTab === tab ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
              background: activeTab === tab ? 'linear-gradient(135deg, rgba(218, 217, 214, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)' : 'rgba(255, 255, 255, 0.02)',
              color: activeTab === tab ? 'var(--accent-gold)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 400,
              boxShadow: activeTab === tab ? '0 4px 15px rgba(212, 175, 55, 0.15)' : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: 'none'
            }}
          >
            {tab} Shows
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <div className="exhibits-cards-grid">
          {currentExhibitions.map((ex) => {
            const status = getExhibitionStatus(ex.active_date, ex.exp_date);
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
                  display: 'grid',
                  gridTemplateColumns: '5.8fr 4.2fr',
                  height: '520px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease, box-shadow 0.4s ease'
                }}
              >
                <div className="exhibit-card-img-container" style={{
                  height: '100%',
                  overflow: 'hidden',
                  backgroundColor: '#0c0d10',
                  borderRight: '1px solid var(--border-color)',
                  position: 'relative'
                }}>
                  <img
                    src={getExhibitionImage(ex.id)}
                    alt={ex.document_name}
                    className="exhibit-card-img"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '30px',
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${status === 'current' ? 'rgba(16, 185, 129, 0.3)' : status === 'upcoming' ? 'white' : 'rgb  a(255,255,255,255)'}`,
                    ...labelStyles[status]
                  }}>
                    <span
                      className={status === 'current' ? 'pulse-green-dot' : ''}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: status === 'current' ? 'var(--accent-green)' : status === 'upcoming' ? 'var(--accent-gold)' : 'var(--text-muted)',
                        display: 'inline-block'
                      }}
                    />
                    {labelTexts[status]}
                  </div>
                </div>
                <div className="exhibit-card-content" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto 0' }}>
                    <h2 className="exhibit-card-title" style={{
                      fontSize: '1.25rem',
                      fontWeight: 100,
                      color: 'var(--text-primary)',
                      margin: '0 0 0.4rem 0',
                      lineHeight: '1.4',
                      transition: 'color 0.3s ease'
                    }}>{ex.document_name}</h2>
                    <p className="exhibit-card-date" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '12px',
                      color: 'var(--accent-gold)',
                      fontWeight: 100,
                      margin: '0 0 0.75rem 0',
                      letterSpacing: '0.02em'
                    }}>
                      <Calendar size={13} style={{ flexShrink: 0 }} />
                      <span>{formatDate(ex.active_date)} - {formatDate(ex.exp_date) || 'Ongoing'}</span>
                    </p>
                    <p className="exhibit-card-desc" style={{
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ex.description || 'Discover detailed portfolios of the artworks catalogued for this exhibition.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.8rem', borderTop: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedExhibition(ex)}
                      className="exhibit-btn-noborder"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 400,
                        boxShadow: 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      Images
                    </button>
                    <button
                      disabled={downloadingCatalogId === ex.id}
                      onClick={() => handleDownloadCatalog(ex)}
                      className="exhibit-btn-noborder"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 400,
                        boxShadow: 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      {downloadingCatalogId === ex.id ? <Loader className="animate-spin" size={14} /> : <Download size={14} />}
                      {downloadingCatalogId === ex.id ? 'Loading' : 'Catalog'}
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
                background: 'var(--bg-input)',
                color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
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
                      className={`pagination-page-btn ${activePage === page ? 'active' : ''}`}
                      style={{
                        background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'var(--bg-input)',
                        color: activePage === page ? 'var(--bg-dark)' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        fontWeight: activePage === page ? '700' : '500',
                        padding: '0.5rem 1rem',
                        minWidth: '2.4rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
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
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Hover effects */}
      <style>{`
        .exhibits-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }
        .exhibit-grid-card {
          display: grid !important;
          grid-template-columns: 7fr 3fr;
          height: 300px;
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
          height: 100%;
          overflow: hidden;
          background-color: #111;
          border-right: 1px solid var(--border-color);
        }
        @media (max-width: 992px) {
          .exhibit-grid-card {
            grid-template-columns: 7fr 3fr !important;
          }
        }
        @media (max-width: 768px) {
          .exhibit-grid-card {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .exhibit-card-img-container {
            height: 220px !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border-color) !important;
          }
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
          font-size: 12px;
          font-weight: 100;
          color: #fff;
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
          transition: color 0.3s ease;
        }
        .exhibit-grid-card:hover .exhibit-card-title {
          color: var(--accent-gold) !important;
        }
        .exhibit-card-date {
          font-size: 12px;
          color: var(--accent-gold);
          font-weight: 100;
          margin: 0 0 1rem 0;
        }
        .exhibit-card-desc {
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
        body.light-theme .exhibit-card-title,
        body.light-theme .exhibit-card-date,
        body.light-theme .exhibit-card-desc,
        body.light-theme .exhibit-card-link-text {
          color: #000000 !important;
          font-weight: 400 !important;
        }
        .exhibit-btn-noborder {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          color: var(--text-primary) !important;
          background: transparent !important;
        }
        .exhibit-btn-noborder:hover {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          color: var(--accent-gold) !important;
          background: rgba(212, 175, 55, 0.08) !important;
        }
        .exhibit-btn-noborder svg {
          color: inherit !important;
          stroke: currentColor !important;
        }
        body.light-theme .exhibit-btn-noborder {
          color: #000000 !important;
        }
        body.light-theme .exhibit-btn-noborder svg {
          color: #000000 !important;
          stroke: #000000 !important;
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
