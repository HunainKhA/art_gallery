import React, { useState, useEffect, useRef } from 'react';
import { getApiUrl, fetchBannerConfig, getBannerImageUrl, fetchArtistDetail, getArtistImageUrl, getArtworkImageUrl } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';
import { generateCatalogPDF } from '../services/catalogPdfGenerator';
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

  // Guest Photos Lightbox Modal state
  const [activeGuestPicIndex, setActiveGuestPicIndex] = useState(null);

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

  // Keyboard navigation for Guest Photos lightbox
  useEffect(() => {
    if (activeGuestPicIndex === null || !selectedExhibition || !selectedExhibition.guest_pics) return;
    const guestPicsList = selectedExhibition.guest_pics.split(',').map(s => s.trim()).filter(Boolean);
    if (guestPicsList.length === 0) return;

    const handleGuestKey = (e) => {
      if (e.key === 'Escape') {
        setActiveGuestPicIndex(null);
      } else if (e.key === 'ArrowRight' && guestPicsList.length > 1) {
        e.preventDefault();
        setActiveGuestPicIndex(prev => (prev + 1) % guestPicsList.length);
      } else if (e.key === 'ArrowLeft' && guestPicsList.length > 1) {
        e.preventDefault();
        setActiveGuestPicIndex(prev => (prev - 1 + guestPicsList.length) % guestPicsList.length);
      }
    };

    window.addEventListener('keydown', handleGuestKey);
    return () => window.removeEventListener('keydown', handleGuestKey);
  }, [activeGuestPicIndex, selectedExhibition]);

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
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error fetching artworks for download:", err);
      return [];
    }
  };

  // Compile and download PDF catalog using native jsPDF generator
  const handleDownloadCatalog = async (exhibition) => {
    setDownloadingCatalogId(exhibition.id);
    try {
      const artworks = await fetchArtworksForExhibition(exhibition.id);
      if (!artworks || artworks.length === 0) {
        alert("No artworks found for this exhibition to compile a catalog.");
        return;
      }
      await generateCatalogPDF(exhibition, artworks);
    } catch (err) {
      console.error("Catalog generation failed:", err);
      alert("Error compiling PDF catalogue: " + (err.message || 'Please try again.'));
    } finally {
      setDownloadingCatalogId(null);
    }
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
          const arts = Array.isArray(data) ? data : [];
          setExhibitionArtworks(arts);
          setLoadingArtworks(false);

          // Resolve Exhibition Artist reliably
          let targetArtistId = selectedExhibition.artist_id;
          let targetArtistName = selectedExhibition.artist_name;

          if (!targetArtistId && arts.length > 0 && arts[0].artist_id) {
            targetArtistId = arts[0].artist_id;
          }
          if (!targetArtistName && arts.length > 0 && arts[0].artist_name) {
            targetArtistName = arts[0].artist_name;
          }

          if (targetArtistId) {
            fetchArtistDetail(targetArtistId)
              .then(aData => setExhibitionArtist(aData))
              .catch(() => {
                const found = artists.find(a => a.id === targetArtistId);
                setExhibitionArtist(found || null);
              });
          } else if (targetArtistName) {
            const cleanTarget = targetArtistName.trim().toLowerCase();
            const found = artists.find(a => `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase() === cleanTarget);
            if (found) {
              fetchArtistDetail(found.id).then(aData => setExhibitionArtist(aData)).catch(() => setExhibitionArtist(found));
            } else {
              setExhibitionArtist({ id: 'temp', first_name: targetArtistName, last_name: '' });
            }
          } else {
            // Check if artist name is embedded in exhibition title (e.g. Farrukh Shahab)
            const doc = (selectedExhibition.document_name || '').toLowerCase();
            const found = artists.find(a => {
              const full = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
              return full && doc.includes(full);
            });
            if (found) {
              fetchArtistDetail(found.id).then(aData => setExhibitionArtist(aData)).catch(() => setExhibitionArtist(found));
            } else {
              setExhibitionArtist(null);
            }
          }
        })
        .catch(err => {
          console.error(err);
          setExhibitionArtworks([]);
          setLoadingArtworks(false);
          setExhibitionArtist(null);
        });
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
      setFlipData({
        left: exhibitionArtworks[bookIndex],
        right: exhibitionArtworks[Math.min(nextIndex + 1, exhibitionArtworks.length - 1)],
        flipFront: exhibitionArtworks[(bookIndex + 1) % exhibitionArtworks.length],
        flipBack: exhibitionArtworks[nextIndex]
      });

      setIsFlipping(true);

      setTimeout(() => {
        setBookIndex(nextIndex);
        setFlipData({
          left: exhibitionArtworks[nextIndex],
          right: exhibitionArtworks[(nextIndex + 1) % exhibitionArtworks.length],
          flipFront: exhibitionArtworks[(nextIndex + 1) % exhibitionArtworks.length],
          flipBack: exhibitionArtworks[(nextIndex + 2) % exhibitionArtworks.length]
        });
        setIsFlipping(false);
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedExhibition, exhibitionArtworks, bookIndex, isAutoplayPaused]);

  const getArtworkDisplayCode = (art) => {
    if (!art) return '';
    const rawCode = (art.code || '').toString().trim();
    // If rawCode is a valid artwork code (e.g. FAR-4977, FS-01, 2U0-0101) and not a single digit / dropdown index like '2'
    if (rawCode && rawCode !== '2' && !/^[0-9]{1,2}$/.test(rawCode)) {
      return rawCode;
    }
    // If rawCode was '2' or empty, the actual painting code/title is in art.title (e.g. FAR-4977)
    const title = (art.title || '').toString().trim();
    if (title && title !== '2' && !/^[0-9]{1,2}$/.test(title)) {
      return title;
    }
    return '';
  };

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

  const getArtworkImage = (artOrId) => {
    if (!artOrId) return '';
    if (typeof artOrId === 'object') {
      if (artOrId.id) return getArtworkImageUrl(artOrId.id);
      if (artOrId.image) return getArtworkImageUrl(artOrId.image);
      if (artOrId.filename) return getArtworkImageUrl(artOrId.filename);
    }
    return getArtworkImageUrl(artOrId);
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

    // Gather all participating artists dynamically (from group IDs, solo ID, or artworks)
    const allExhibitionArtists = (() => {
      const artistMap = new Map();

      // 1. Check group_artist_ids from exhibition
      if (selectedExhibition.group_artist_ids) {
        selectedExhibition.group_artist_ids.split(',').forEach(id => {
          const cleanId = id.trim();
          if (cleanId) {
            const found = artists.find(a => a.id === cleanId);
            if (found) artistMap.set(found.id, found);
          }
        });
      }

      // 2. Check solo artist_id from exhibition
      if (selectedExhibition.artist_id) {
        const found = artists.find(a => a.id === selectedExhibition.artist_id);
        if (found) artistMap.set(found.id, found);
      }

      // 3. Dynamically extract artists from exhibitionArtworks
      if (exhibitionArtworks && exhibitionArtworks.length > 0) {
        exhibitionArtworks.forEach(art => {
          if (art.artist_id) {
            const found = artists.find(a => a.id === art.artist_id);
            if (found) {
              artistMap.set(found.id, found);
            } else if (!artistMap.has(art.artist_id)) {
              artistMap.set(art.artist_id, {
                id: art.artist_id,
                first_name: art.artist_name || 'Artist',
                last_name: '',
                name: art.artist_name || 'Artist'
              });
            }
          } else if (art.artist_name) {
            const cleanName = art.artist_name.trim();
            const found = artists.find(a => `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase() === cleanName.toLowerCase());
            if (found) {
              artistMap.set(found.id, found);
            } else if (!artistMap.has(cleanName)) {
              artistMap.set(cleanName, {
                id: cleanName,
                first_name: cleanName,
                last_name: '',
                name: cleanName
              });
            }
          }
        });
      }

      // 4. Fallback to state exhibitionArtist if still empty
      if (artistMap.size === 0 && exhibitionArtist) {
        artistMap.set(exhibitionArtist.id || 'single', exhibitionArtist);
      }

      return Array.from(artistMap.values());
    })();

    const jumpToPage = (idx) => {
      if (isFlipping) return;
      const targetIndex = idx % 2 === 0 ? idx : idx - 1;
      if (targetIndex >= 0 && targetIndex < exhibitionArtworks.length) {
        setBookIndex(targetIndex);
        setFlipData({
          left: exhibitionArtworks[targetIndex],
          right: exhibitionArtworks[(targetIndex + 1) % exhibitionArtworks.length],
          flipFront: exhibitionArtworks[(targetIndex + 1) % exhibitionArtworks.length],
          flipBack: exhibitionArtworks[(targetIndex + 2) % exhibitionArtworks.length]
        });
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
        setFlipData({
          left: exhibitionArtworks[nextIndex],
          right: exhibitionArtworks[(nextIndex + 1) % exhibitionArtworks.length],
          flipFront: exhibitionArtworks[(nextIndex + 1) % exhibitionArtworks.length],
          flipBack: exhibitionArtworks[(nextIndex + 2) % exhibitionArtworks.length]
        });
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
        setFlipData({
          left: exhibitionArtworks[prevIndex],
          right: exhibitionArtworks[(prevIndex + 1) % exhibitionArtworks.length],
          flipFront: exhibitionArtworks[(prevIndex + 1) % exhibitionArtworks.length],
          flipBack: exhibitionArtworks[(prevIndex + 2) % exhibitionArtworks.length]
        });
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
                  gridTemplateColumns: '1.3fr 1fr',
                  height: '420px',
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
                    width: '100%',
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
                      objectPosition: 'center 18%',
                      display: 'block'
                    }}
                  />
                </div>

                {/* RIGHT: TITLE, DATE, DESCRIPTION, FEATURED ARTISTS */}
                <div
                  className="exhibit-card-content"
                  style={{
                    padding: '1.5rem 2rem',
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
                        fontSize: '14px',
                        fontWeight: 100,
                        fontFamily: 'Montserrat, sans-serif',
                        color: 'var(--text-primary)',
                        margin: '0 0 0.4rem 0',
                        lineHeight: '1.4',
                        letterSpacing: '0.02em'
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

                  {/* FEATURED ARTISTS AT BOTTOM (SOLO OR GROUP) */}
                  {allExhibitionArtists.length > 1 ? (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: 'auto' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 100, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                        ARTISTS FEATURED ({allExhibitionArtists.length})
                      </h3>
                      <div style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.4rem' }} className="custom-scrollbar">
                        {allExhibitionArtists.map((a, idx) => {
                          const artistImgUrl = a.profile_image ? getArtistImageUrl(a.profile_image) : (a.id ? getArtistImageUrl(a.id) : '');
                          const artistDisplayName = a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Artist';
                          return (
                            <div
                              key={a.id || idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArtistBio(a, idx, allExhibitionArtists);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer',
                                minWidth: '65px',
                                transition: 'transform 0.2s ease'
                              }}
                              title={`View ${artistDisplayName}'s Biography`}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-gold)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', backgroundColor: '#111' }}>
                                <img
                                  src={artistImgUrl}
                                  alt={artistDisplayName}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>
                                {a.first_name || artistDisplayName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : allExhibitionArtists.length === 1 ? (
                    <div
                      style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenArtistBio(allExhibitionArtists[0], 0, allExhibitionArtists);
                      }}
                      title={`View ${allExhibitionArtists[0].name || `${allExhibitionArtists[0].first_name || ''} ${allExhibitionArtists[0].last_name || ''}`}'s Biography`}
                    >
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-gold)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', backgroundColor: '#111', flexShrink: 0 }}>
                        <img
                          src={allExhibitionArtists[0].profile_image ? getArtistImageUrl(allExhibitionArtists[0].profile_image) : (allExhibitionArtists[0].id ? getArtistImageUrl(allExhibitionArtists[0].id) : '')}
                          alt={allExhibitionArtists[0].name || `${allExhibitionArtists[0].first_name || ''} ${allExhibitionArtists[0].last_name || ''}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 100, color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '0 0 0.15rem 0', textTransform: 'uppercase' }}>ARTIST FEATURED</h3>
                        <p style={{ fontSize: '12px', fontWeight: 100, color: 'var(--accent-gold)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {allExhibitionArtists[0].name || `${allExhibitionArtists[0].first_name || ''} ${allExhibitionArtists[0].last_name || ''}`} →
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 2. CATALOGUE SECTION (VIRTUAL BOOK + PDF DOWNLOAD) */}
        {exhibitionArtworks.length > 0 && (
          <div id="exhibition-sec-catalogue" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

            {/* Side-by-Side Sidebar and Virtual Book Container */}
            <div className="catalog-book-row">

              {/* Left Column: Top-to-Bottom Artwork Thumbnail List */}
              <div className="catalog-sidebar-thumbnails">
                {exhibitionArtworks.map((art, idx) => {
                  const isActive = idx === bookIndex || idx === (bookIndex + 1) % exhibitionArtworks.length;
                  return (
                    <div
                      key={art.id}
                      onClick={() => jumpToPage(idx)}
                      className="catalog-thumb-item"
                      style={{
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
                        src={getArtworkImage(art)}
                        alt={art.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=100';
                        }}
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
                            src={getArtworkImage(flipData.left)}
                            alt={flipData.left.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';
                            }}
                          />
                        </div>
                        <div className="book-caption">
                          {flipData.left.artist_name && (
                            <p className="book-caption-artist" style={{ fontSize: '12px', fontWeight: 600, color: '#000000', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {flipData.left.artist_name}
                            </p>
                          )}
                          {getArtworkDisplayCode(flipData.left) && (
                            <p className="book-caption-code" style={{ fontSize: '12px', fontWeight: 400, color: '#444444', margin: '0.15rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {getArtworkDisplayCode(flipData.left)}
                            </p>
                          )}
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
                            src={getArtworkImage(flipData.right)}
                            alt={flipData.right.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';
                            }}
                          />
                        </div>
                        <div className="book-caption">
                          {flipData.right.artist_name && (
                            <p className="book-caption-artist" style={{ fontSize: '12px', fontWeight: 600, color: '#000000', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {flipData.right.artist_name}
                            </p>
                          )}
                          {getArtworkDisplayCode(flipData.right) && (
                            <p className="book-caption-code" style={{ fontSize: '12px', fontWeight: 400, color: '#444444', margin: '0.15rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {getArtworkDisplayCode(flipData.right)}
                            </p>
                          )}
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
                                  src={getArtworkImage(flipData.flipFront)}
                                  alt={flipData.flipFront.title}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';
                                  }}
                                />
                              </div>
                              <div className="book-caption">
                                {flipData.flipFront.artist_name && (
                                  <p className="book-caption-artist" style={{ fontSize: '12px', fontWeight: 600, color: '#000000', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {flipData.flipFront.artist_name}
                                  </p>
                                )}
                                {getArtworkDisplayCode(flipData.flipFront) && (
                                  <p className="book-caption-code" style={{ fontSize: '12px', fontWeight: 400, color: '#444444', margin: '0.15rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {getArtworkDisplayCode(flipData.flipFront)}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="book-flipping-face back">
                          {flipData.flipBack && (
                            <>
                              <div className="book-img-container">
                                <img
                                  src={getArtworkImage(flipData.flipBack)}
                                  alt={flipData.flipBack.title}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=400';
                                  }}
                                />
                              </div>
                              <div className="book-caption">
                                {flipData.flipBack.artist_name && (
                                  <p className="book-caption-artist" style={{ fontSize: '12px', fontWeight: 600, color: '#000000', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {flipData.flipBack.artist_name}
                                  </p>
                                )}
                                {getArtworkDisplayCode(flipData.flipBack) && (
                                  <p className="book-caption-code" style={{ fontSize: '12px', fontWeight: 400, color: '#444444', margin: '0.15rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {getArtworkDisplayCode(flipData.flipBack)}
                                  </p>
                                )}
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
                        src={getArtworkImage(art)}
                        alt={art.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                        className="art-grid-image"
                        onError={(e) => {
                          e.target.onerror = null;
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

                      {/* Footer Row (Inquiry on left in black, Available on right in green, Sold in red, or Archive for Return) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'auto',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.85rem'
                      }}>
                        {art.status && (art.status.toLowerCase() === 'return' || art.status.toLowerCase() === 'archive' || art.status.toLowerCase() === 'archived') ? (
                          <span className="status-return status-archive" style={{ fontSize: '12px', fontWeight: 400, color: '#f59e0b', fontFamily: 'Montserrat, sans-serif' }}>
                            Archive
                          </span>
                        ) : art.status && (art.status.toLowerCase() === 'sold' || art.status.toLowerCase() === 'soldout' || art.status.toLowerCase() === 'sold_out') ? (
                          <span className="status-sold" style={{ fontSize: '12px', fontWeight: 400, color: '#ef4444', fontFamily: 'Montserrat, sans-serif' }}>
                            Sold
                          </span>
                        ) : (
                          <>
                            <span className="status-inquiry" style={{ fontSize: '12px', fontWeight: 400, color: '#000000', fontFamily: 'Montserrat, sans-serif' }}>
                              Inquiry
                            </span>
                            <span className="status-available" style={{ fontSize: '12px', fontWeight: 400, color: '#10b981', fontFamily: 'Montserrat, sans-serif' }}>
                              Available
                            </span>
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
        {selectedExhibition.guest_pics && selectedExhibition.guest_pics.split(',').filter(Boolean).length > 0 && (() => {
          const guestPicsList = selectedExhibition.guest_pics.split(',').map(s => s.trim()).filter(Boolean);
          return (
            <div id="exhibition-sec-video" style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '4rem' }}>
              <h2 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: 100, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span>Photographs</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 100 }}>
                  ({guestPicsList.length} photos)
                </span>
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1.5rem'
              }} className="guest-pics-grid">
                {guestPicsList.map((filename, idx) => {
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
                        background: '#0c0d10',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}
                      onClick={() => setActiveGuestPicIndex(idx)}
                      title="Click to view full photo"
                    >
                      <img
                        src={guestImgUrl}
                        alt={`Photograph ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                        className="guest-grid-image"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Guest Photo Lightbox Modal */}
              {activeGuestPicIndex !== null && guestPicsList.length > 0 && (
                <div
                  className="guest-lightbox-backdrop"
                  onClick={() => setActiveGuestPicIndex(null)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.94)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(12px)',
                    animation: 'fadeIn 0.25s ease'
                  }}
                >
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGuestPicIndex(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: '24px',
                      right: '28px',
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '50%',
                      width: '46px',
                      height: '46px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      zIndex: 10
                    }}
                    className="guest-lightbox-btn"
                    title="Close (Esc)"
                  >
                    <X size={24} />
                  </button>

                  {/* Photo Counter */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '30px',
                      left: '32px',
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontSize: '14px',
                      fontWeight: 100,
                      letterSpacing: '0.05em',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                  >
                    Photograph {activeGuestPicIndex + 1} of {guestPicsList.length}
                  </div>

                  {/* Previous Button */}
                  {guestPicsList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGuestPicIndex(prev => (prev - 1 + guestPicsList.length) % guestPicsList.length);
                      }}
                      style={{
                        position: 'absolute',
                        left: '24px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '50%',
                        width: '54px',
                        height: '54px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                      }}
                      className="guest-lightbox-btn"
                      title="Previous Photo (Left Arrow)"
                    >
                      <ChevronLeft size={32} />
                    </button>
                  )}

                  {/* Main Lightbox Image Container */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'relative',
                      maxWidth: '88vw',
                      maxHeight: '82vh',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      key={activeGuestPicIndex}
                      src={getApiUrl(`/api/crm/exhibitions/guest-pic/${guestPicsList[activeGuestPicIndex]}`)}
                      alt={`Photograph ${activeGuestPicIndex + 1}`}
                      style={{
                        maxWidth: '88vw',
                        maxHeight: '82vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: '10px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                        animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  </div>

                  {/* Next Button */}
                  {guestPicsList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveGuestPicIndex(prev => (prev + 1) % guestPicsList.length);
                      }}
                      style={{
                        position: 'absolute',
                        right: '24px',
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: '50%',
                        width: '54px',
                        height: '54px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        zIndex: 10
                      }}
                      className="guest-lightbox-btn"
                      title="Next Photo (Right Arrow)"
                    >
                      <ChevronRight size={32} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
            top: 75px;
            z-index: 90;
            -webkit-backdrop-filter: blur(14px);
            padding: 0.6rem 0.5rem;
            display: flex;
            gap: 1.25rem;
            margin-bottom: 1.5rem;
            width: 100%;
            border-bottom: 1px solid var(--border-color);
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
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
            width: 100%;
          }
          @media (max-width: 1200px) {
            .exhibit-artworks-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 2rem;
            }
          }
          @media (max-width: 992px) {
            .exhibit-artworks-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 1.5rem;
            }
          }
          @media (max-width: 480px) {
            .exhibit-artworks-grid {
              grid-template-columns: 1fr;
              gap: 1.25rem;
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

          /* Catalogue Book Layout & Sidebar */
          .catalog-book-row {
            display: flex;
            gap: 2.5rem;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 1200px;
            margin-bottom: 2rem;
          }

          .catalog-sidebar-thumbnails {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-height: 540px;
            overflow-y: auto;
            padding-right: 0.75rem;
            width: 86px;
            border-right: 1px solid var(--border-color);
            flex-shrink: 0;
          }

          .catalog-thumb-item {
            width: 74px;
            height: 58px;
          }

          @media (max-width: 992px) {
            .catalog-book-row {
              flex-direction: column;
              gap: 1.5rem;
            }
            .catalog-sidebar-thumbnails {
              flex-direction: row;
              width: 100%;
              max-height: none;
              height: auto;
              border-right: none;
              border-bottom: 1px solid var(--border-color);
              padding: 0 0 0.75rem 0;
              overflow-x: auto;
              overflow-y: hidden;
            }
            .catalog-thumb-item {
              width: 65px;
              height: 50px;
            }
            .exhibit-grid-card {
              grid-template-columns: 1fr !important;
              min-height: auto !important;
            }
            .exhibit-card-img-container {
              height: clamp(240px, 45vw, 360px) !important;
              border-right: none !important;
              border-bottom: 1px solid var(--border-color) !important;
            }
          }

          /*  3D Virtual Catalog Book Slider Styles */
          .book-wrapper {
            perspective: 2000px;
            display: flex;
            justify-content: center;
            margin: 1.5rem 0;
            width: 100%;
            max-width: 1060px;
          }
          .book-cover {
            background: linear-gradient(to right, #1c140d 0%, #2a1f14 10%, #352719 46%, #1c140d 49%, #120d08 50%, #1c140d 51%, #352719 54%, #2a1f14 90%, #1c140d 100%);
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
            max-width: 100%;
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
            height: 560px;
            background: #faf6ee;
            border-radius: 4px 10px 10px 4px;
            box-shadow: 
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
          /* Page Halves & 3D Turning Faces - 100% Unified Base Layout */
          .book-page-half,
          .book-flipping-face {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 1.25rem 1.1rem 0.75rem 1.1rem;
            overflow: hidden;
            position: relative;
          }

          .book-page-half {
            flex: 1;
            height: 100%;
          }

          .book-flipping-face {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            background: #faf6ee;
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

          .book-img-container {
            width: 100%;
            height: 460px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
            overflow: hidden;
            background: transparent;
          }
          .book-img-container img {
            max-width: 100%;
            max-height: 100%;
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
          .book-caption {
            margin-top: 0.45rem;
            text-align: center;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.12rem;
          }
          .book-caption-artist {
            font-size: 12px !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            opacity: 1 !important;
            margin: 0;
            font-weight: 400 !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            line-height: 1.2;
            letter-spacing: 0.04em;
          }
          .book-caption-code {
            font-size: 12px !important;
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            opacity: 1 !important;
            margin: 0;
            font-weight: 400 !important;
            line-height: 1.2;
            letter-spacing: 0.04em;
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

          .theme-dark .book-caption-artist {
            color: #f0f0f0 !important;
            font-weight: 100 !important;
            font-size: 12px !important;
          }
          .theme-dark .book-caption-code {
            color: #a5abb8 !important;
            font-weight: 100 !important;
            font-size: 12px !important;
          }

          /* RESPONSIVE MEDIA QUERIES (Bottom-most to guarantee highest priority) */
          @media (max-width: 992px) {
            .book-body {
              height: 330px !important;
            }
            .book-img-container {
              height: 220px !important;
            }
            .book-page-half,
            .book-flipping-face {
              padding: 1rem 0.8rem 0.5rem 0.8rem !important;
            }
            .book-caption {
              margin-top: 0.45rem !important;
            }
            .book-caption-title,
            .book-caption-meta {
              font-size: 8px !important;
              font-weight: 100 !important;
            }
          }

          @media (max-width: 768px) {
            .book-cover {
              padding: 5px 6px !important;
              border-radius: 10px !important;
            }
            .book-body {
              height: 240px !important;
              border-radius: 4px 8px 8px 4px !important;
            }
            .book-page-half,
            .book-flipping-face {
              padding: 0.7rem 0.55rem 0.35rem 0.55rem !important;
            }
            .book-img-container {
              height: 155px !important;
            }
            .book-caption {
              margin-top: 0.35rem !important;
              gap: 0.08rem !important;
            }
            .book-caption-title,
            .book-caption-meta {
              font-size: 8px !important;
              font-weight: 100 !important;
              line-height: 1.15 !important;
            }
            .exhibition-sub-nav-horizontal {
              gap: 0.5rem;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              padding: 0.5rem 0.35rem;
              top: 60px;
            }
            .exhibition-nav-link {
              padding: 0.35rem 0.6rem;
              font-size: 11px;
            }
          }

          @media (max-width: 480px) {
            .book-body {
              height: 200px !important;
            }
            .book-page-half,
            .book-flipping-face {
              padding: 0.5rem 0.4rem 0.25rem 0.4rem !important;
            }
            .book-img-container {
              height: 125px !important;
            }
            .book-caption {
              margin-top: 0.25rem !important;
              gap: 0.05rem !important;
            }
            .book-caption-title,
            .book-caption-meta {
              font-size: 7.5px !important;
              font-weight: 100 !important;
              line-height: 1.1 !important;
            }
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
                width: '94vw',
                maxWidth: '1280px',
                height: '84vh',
                minHeight: '560px',
                maxHeight: '90vh',
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

                  {/* Right Side: Work Slideshow (No black strip, pure full painting) */}
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
            height: 380px;
            min-height: 340px;
            background: #0c0d10;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
          }
          @keyframes bioSlideIn {
            0% { transform: translateX(50px); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
          .bio-slideshow-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background-color: #000000;
            animation: bioSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
    <div className="page-content exhibitions-section-wrapper" style={{ animation: 'fadeIn 0.5s ease', paddingTop: '0.25rem' }}>

      {/* Horizontal Tabs selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
        marginBottom: '1.25rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
        paddingTop: '0.2rem'
      }}>
        {['previous', 'current', 'upcoming'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              border: 'none',
              outline: 'none',
              background: activeTab === tab ? 'linear-gradient(135deg, rgba(218, 217, 214, 0.15) 0%, rgba(212, 175, 55, 0.08) 100%)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-gold)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 500 : 300,
              boxShadow: 'none',
              borderRadius: '4px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {tab} Shows
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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
                  gridTemplateColumns: '1.3fr 1fr',
                  height: '420px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease, box-shadow 0.4s ease'
                }}
              >
                <div className="exhibit-card-img-container" style={{
                  height: '100%',
                  width: '100%',
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
                      objectPosition: 'center 18%',
                      display: 'block',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </div>
                <div className="exhibit-card-content" style={{
                  padding: '1.75rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto 0' }}>
                    <h2 className="exhibit-card-title" style={{
                      fontSize: '14px',
                      fontWeight: 100,
                      fontFamily: 'Montserrat, sans-serif',
                      color: 'var(--text-primary)',
                      margin: '0 0 0.4rem 0',
                      lineHeight: '1.4',
                      letterSpacing: '0.02em',
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
                      {downloadingCatalogId === ex.id ? 'Loading' : 'Catalogue'}
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
        .guest-pic-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-gold) !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }
        .guest-pic-card:hover .guest-grid-image {
          transform: scale(1.05);
        }
        .guest-lightbox-btn:hover {
          background: rgba(212, 175, 55, 0.25) !important;
          border-color: var(--accent-gold) !important;
          color: var(--accent-gold) !important;
          transform: scale(1.08);
        }
        @media (max-width: 768px) {
          .guest-lightbox-btn {
            width: 42px !important;
            height: 42px !important;
          }
        }
      `}</style>
    </div>
  );
}
