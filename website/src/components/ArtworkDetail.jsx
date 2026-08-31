import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageCircle, Mail, ShoppingCart, Layout, X, Check, Eye } from 'lucide-react';
import { getApiUrl } from '../services/api';
import { formatPrice, renderDimensions } from '../services/currency';
import galleryRoomBg from '../assets/gallery_room_bg_highres.jpg';
import galleryGirlOverlay from '../assets/gallery_girl_final.png';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '');

// Rich paint palette for the wall backdrop
const WALL_COLORS = [
  // Whites & Creams
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Warm Cream', value: '#faf5e8' },
  { name: 'Vanilla Butter', value: '#f7ecd3' },
  { name: 'Linen White', value: '#f2ede4' },
  { name: 'Antique White', value: '#faebd7' },
  { name: 'Pearl', value: '#f5f0e8' },
  // Yellows & Golds
  { name: 'Soft Peach', value: '#fadcb9' },
  { name: 'Wheat', value: '#f5deb3' },
  { name: 'Honey Gold', value: '#e8b84b' },
  { name: 'Mustard', value: '#d4a017' },
  { name: 'Amber', value: '#ffbf00' },
  // Pinks & Reds
  { name: 'Blush Pink', value: '#ebd3d1' },
  { name: 'Dusty Rose', value: '#b58ca6' },
  { name: 'Rose', value: '#c2788a' },
  { name: 'Coral', value: '#e8735a' },
  { name: 'Terracotta', value: '#c0674a' },
  { name: 'Clay Red', value: '#a0522d' },
  { name: 'Brick Red', value: '#7a3028' },
  { name: 'Burgundy', value: '#5c1a1a' },
  // Purples & Lavenders
  { name: 'Lavender Mist', value: '#e2d8e6' },
  { name: 'Lilac', value: '#c8a2c8' },
  { name: 'Violet', value: '#9370db' },
  { name: 'Mauve', value: '#7a5c7a' },
  { name: 'Deep Plum', value: '#4a2040' },
  // Blues
  { name: 'Ice Blue', value: '#d5e1df' },
  { name: 'Sky Blue', value: '#87ceeb' },
  { name: 'Cornflower', value: '#6495ed' },
  { name: 'Steel Blue', value: '#8fa4ad' },
  { name: 'Denim', value: '#1560bd' },
  { name: 'Ocean Navy', value: '#2e4453' },
  { name: 'Midnight Blue', value: '#191970' },
  { name: 'Prussian Blue', value: '#003153' },
  // Greens
  { name: 'Mint Sage', value: '#d2dfd3' },
  { name: 'Eucalyptus', value: '#9eb29f' },
  { name: 'Sage Green', value: '#7c9a7e' },
  { name: 'Olive', value: '#6b7c45' },
  { name: 'Forest Green', value: '#354e45' },
  { name: 'Hunter Green', value: '#3a5f3a' },
  { name: 'Emerald', value: '#1a4a35' },
  { name: 'Bottle Green', value: '#1a3a2a' },
  // Grays & Neutrals
  { name: 'Snow Gray', value: '#f5f5f5' },
  { name: 'Light Gray', value: '#e0e0e0' },
  { name: 'Silver', value: '#c0c0c0' },
  { name: 'Warm Taupe', value: '#adaba6' },
  { name: 'Greige', value: '#9b9082' },
  { name: 'Mushroom', value: '#8b8074' },
  { name: 'Slate', value: '#708090' },
  { name: 'Charcoal', value: '#4f5254' },
  { name: 'Graphite', value: '#383838' },
  // Blacks
  { name: 'Soft Black', value: '#2a2a2a' },
  { name: 'Deep Obsidian', value: '#242526' },
  { name: 'Jet Black', value: '#0a0a0a' },
];

export default function ArtworkDetail({ artworkId, onBack, onAddToCart, cartItems, currency, setCurrency, exchangeRates, websiteSettings = { hide_prices: false, hide_add_to_cart: false }, guestSession, setIsGuestModalOpen, artworks = [], setSelectedArtworkId }) {
  const currentInScope = artworks?.find(item => String(item.id) === String(artworkId));
  const [artwork, setArtwork] = useState(currentInScope || null);
  const [loading, setLoading] = useState(!currentInScope);
  const [error, setError] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync artwork detail with backend when artworkId changes
  useEffect(() => {
    if (!artworkId) return;
    const found = artworks?.find(item => String(item.id) === String(artworkId));
    if (found) {
      setArtwork(found);
    }
    fetch(getApiUrl(`/api/artworks/${artworkId}`))
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          setArtwork(prev => ({ ...(prev || {}), ...data }));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load artwork detail:", err);
        setLoading(false);
      });
  }, [artworkId]);

  const currentIndex = (artworks && artworks.length > 0) ? artworks.findIndex(item => String(item.id) === String(artworkId)) : -1;

  // Preload adjacent images in browser cache for instant smooth browsing
  useEffect(() => {
    if (artworks && currentIndex !== -1) {
      if (currentIndex < artworks.length - 1) {
        const nextItem = artworks[currentIndex + 1];
        if (nextItem) {
          const nextImg = new Image();
          nextImg.src = nextItem.id ? `${API_BASE}/api/artworks/image/${nextItem.id}` : (nextItem.image || '');
        }
      }
      if (currentIndex > 0) {
        const prevItem = artworks[currentIndex - 1];
        if (prevItem) {
          const prevImg = new Image();
          prevImg.src = prevItem.id ? `${API_BASE}/api/artworks/image/${prevItem.id}` : (prevItem.image || '');
        }
      }
    }
  }, [currentIndex, artworks]);

  const handlePrev = () => {
    if (artworks && currentIndex > 0) {
      const prevItem = artworks[currentIndex - 1];
      setIsTransitioning(true);
      setTimeout(() => {
        setArtwork(prev => ({ ...prev, ...prevItem }));
        setSelectedArtworkId(prevItem.id);
        sessionStorage.setItem('selectedArtworkId', prevItem.id);
        setIsTransitioning(false);
      }, 120);
    }
  };

  const handleNext = () => {
    if (artworks && currentIndex < artworks.length - 1) {
      const nextItem = artworks[currentIndex + 1];
      setIsTransitioning(true);
      setTimeout(() => {
        setArtwork(prev => ({ ...prev, ...nextItem }));
        setSelectedArtworkId(nextItem.id);
        sessionStorage.setItem('selectedArtworkId', nextItem.id);
        setIsTransitioning(false);
      }, 120);
    }
  };

  // Sizing Suggestion State
  const [customLength, setCustomLength] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [calculatorResult, setCalculatorResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Inquiry Form State
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    city: '',
    country: 'Pakistan',
    address: '',
    message: ''
  });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryError, setInquiryError] = useState(null);

  // Wall Visualizer Modal States
  const [showWallModal, setShowWallModal] = useState(false);
  const [wallColor, setWallColor] = useState('#ffffff'); // Default clean white wall
  const [frameStyle, setFrameStyle] = useState('none'); // Default no frame
  const [visualizerImageAspect, setVisualizerImageAspect] = useState(null);

  // Lightbox State
  const [showLightbox, setShowLightbox] = useState(false);

  const inquiryFormRef = useRef(null);

  const handleEmailInquiryClick = (e) => {
    e.preventDefault();
    setShowInquiryForm(true);
    setTimeout(() => {
      inquiryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    setInquirySubmitting(true);
    setInquiryError(null);

    fetch(`${API_BASE}/api/artworks/inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artwork_id: artworkId,
        name: inquiryData.name,
        email: inquiryData.email,
        phone: inquiryData.phone,
        mobile: inquiryData.mobile,
        city: inquiryData.city,
        country: inquiryData.country,
        address: inquiryData.address,
        message: inquiryData.message
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to submit inquiry.");
        }
        return res.json();
      })
      .then((data) => {
        setInquirySuccess(true);
        setInquirySubmitting(false);
      })
      .catch((err) => {
        console.error("Inquiry Submission Error:", err);
        setInquiryError(err.message);
        setInquirySubmitting(false);
      });
  };

  // Auto Hover-to-Zoom States
  const [zoomStyle, setZoomStyle] = useState({
    transform: 'scale(1)',
    transformOrigin: 'center center'
  });

  const handleMouseMoveZoom = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transform: 'scale(2)',
      transformOrigin: `${x}% ${y}%`
    });
  };

  const handleMouseLeaveZoom = () => {
    setZoomStyle({
      transform: 'scale(1)',
      transformOrigin: 'center center'
    });
  };

  const handleTouchMoveZoom = (e) => {
    if (e.touches.length !== 1) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.touches[0].clientX - left) / width) * 100;
    const y = ((e.touches[0].clientY - top) / height) * 100;
    setZoomStyle({
      transform: 'scale(2)',
      transformOrigin: `${x}% ${y}%`
    });
  };

  useEffect(() => {
    // If we already have current in-scope artwork from list, sync it immediately
    const found = artworks?.find(item => String(item.id) === String(artworkId));
    if (found) {
      setArtwork(prev => ({ ...prev, ...found }));
      setCustomLength(found.length || '');
      setCustomWidth(found.width || '');
    }

    // Fetch individual artwork details from Python backend in background without blanking screen
    fetch(`${API_BASE}/api/artworks/${artworkId}`)
      .then(res => {
        if (!res.ok) throw new Error("Could not fetch artwork details.");
        return res.json();
      })
      .then(data => {
        setArtwork(data);
        setCustomLength(data.length);
        setCustomWidth(data.width);
        setInquiryData(prev => ({
          ...prev,
          message: `I would like to inquire about the artwork: "${data.title}" (Code: ${data.code || data.artwork_code || data.inventory_code || data.title || 'N/A'}).`
        }));
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching detail:", err);
        setLoading(false);
      });
  }, [artworkId]);

  // Lock body scroll when Wall Visualizer modal is open so background elements / footer cannot be clicked
  useEffect(() => {
    if (showWallModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showWallModal]);

  // Handle Escape key to close modal/lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowWallModal(false);
        setShowLightbox(false);
      }
    };
    if (showWallModal || showLightbox) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWallModal, showLightbox]);

  // Run the Sheet Sizing Calculator API
  const handleCalculateSheet = (e) => {
    e.preventDefault();
    if (!customLength || !customWidth) return;

    setCalculating(true);
    fetch(`${API_BASE}/api/calculator/suggest-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artwork_length: parseFloat(customLength),
        artwork_width: parseFloat(customWidth)
      })
    })
      .then(res => res.json())
      .then(result => {
        setCalculatorResult(result);
        setCalculating(false);
      })
      .catch(err => {
        console.error("Calculator Error:", err);
        setCalculating(false);
      });
  };

  if (loading && !artwork) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>Loading artwork details...</div>;
  if (error && !artwork) return <div style={{ color: 'var(--accent-red)', padding: '2rem' }}>Error: {error}</div>;
  if (!artwork) return null;

  const isInCart = (cartItems || []).some(item => item.id === artwork.id);
  const formattedPriceForInquiry = formatPrice(artwork.price, currency, exchangeRates);
  const artworkCode = artwork.code || artwork.artwork_code || artwork.inventory_code || artwork.title || 'N/A';

  const whatsappUrl = `https://wa.me/923008285600?text=${encodeURIComponent(
    `Hi, I would like to inquire about the artwork: "${artwork.title}" (Code: ${artworkCode}). Listed price is ${'Please contact me to know the price'}.`
  )}`;



  return (
    <div className="page-content artwork-detail-page-wrapper" style={{ paddingTop: '0.5rem' }}>
      {/* Header row with Back Button & sequence indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.3s'
          }}
        >
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back
        </button>

        {artworks && artworks.length > 0 && currentIndex !== -1 && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 100, fontFamily: 'Montserrat, sans-serif' }}>
            {currentIndex + 1} / {artworks.length}
          </span>
        )}
      </div>

      <div className="artwork-detail-grid">

        {/* Artwork Image View with Hover Zoom & Painting Overlay Navigation Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div
            className="artwork-image-container"
            style={{
              padding: 0,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'zoom-in',
              userSelect: 'none',
              touchAction: 'none',
              borderRadius: '0px',
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              width: '100%',
              opacity: isTransitioning ? 0.35 : 1,
              transition: 'opacity 0.2s ease-in-out'
            }}
            onMouseMove={handleMouseMoveZoom}
            onMouseLeave={handleMouseLeaveZoom}
            onTouchMove={handleTouchMoveZoom}
            onTouchEnd={handleMouseLeaveZoom}
            onClick={() => setShowLightbox(true)}
          >
            <img
              src={artwork.id ? `${API_BASE}/api/artworks/image/${artwork.id}` : (artwork.image || '')}
              alt={artwork.title}
              style={{
                width: '100%',
                maxHeight: 'calc(100vh - 230px)',
                objectFit: 'contain',
                display: 'block',
                transform: zoomStyle.transform,
                transformOrigin: zoomStyle.transformOrigin,
                transition: 'opacity 0.2s ease-in-out, transform 0.1s ease-out',
                opacity: isTransitioning ? 0.35 : 1
              }}
            />
          </div>

          {/* Left Arrow Navigation Overlay (Positioned outside zoom container) */}
          {artworks && artworks.length > 0 && currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              style={{
                position: 'absolute',
                left: '-25px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: '#6b7280',
                fontSize: '1.25rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                zIndex: 10,
                boxShadow: 'none'
              }}
              title="Previous Painting"
              className="prev-overlay-btn"
              onMouseEnter={(e) => { e.target.style.background = 'var(--accent-gold)'; e.target.style.color = '#000'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#6b7280'; }}
            >
              &lt;
            </button>
          )}

          {/* Right Arrow Navigation Overlay (Positioned outside zoom container) */}
          {artworks && artworks.length > 0 && currentIndex < artworks.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              style={{
                position: 'absolute',
                right: '-25px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: '#6b7280',
                fontSize: '1.25rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                zIndex: 10,
                boxShadow: 'none'
              }}
              title="Next Painting"
              className="next-overlay-btn"
              onMouseEnter={(e) => { e.target.style.background = 'var(--accent-gold)'; e.target.style.color = '#000'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#6b7280'; }}
            >
              &gt;
            </button>
          )}
        </div>

        {/* Artwork Info & Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 0 0.5rem 0', justifyContent: 'center', opacity: isTransitioning ? 0.4 : 1, transition: 'opacity 0.2s ease-in-out' }} className="artwork-info-col">
          {/* Title & Artist & Code */}
          <div>
            <h3 className="artist-name" style={{
              fontSize: '14px',
              color: 'var(--text-primary)',
              margin: 0,
              fontWeight: 100,
              fontFamily: 'Montserrat, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              {artwork.artist_name || 'Unknown Artist'}
            </h3>
          </div>

          {/* Medium / Frame */}
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
              {artwork.medium_name || 'Oil on Canvas'}
            </p>
          </div>

          {/* Sizing Details (dimensions only) */}
          <div>
            {(() => {
              const dims = renderDimensions(artwork.width, artwork.length);
              return (
                <>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0', fontFamily: 'Montserrat, sans-serif' }}>
                    {dims.cmStr}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
                    {dims.inStr}
                  </p>
                </>
              );
            })()}
          </div>

          {/* Painting Code — above Inquiry */}
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif' }}>
            {artwork.title || 'N/A'}
          </p>

          {/* Price / Inquiry / Status */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 100, margin: 0, color: 'var(--text-primary)' }}>
              {artwork.status && (artwork.status.toLowerCase() === 'return' || artwork.status.toLowerCase() === 'archive' || artwork.status.toLowerCase() === 'archived') ? (
                <span className="status-return status-archive" style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 100, fontFamily: 'Montserrat, sans-serif' }}>
                  Archive
                </span>
              ) : artwork.status && (artwork.status.toLowerCase() === 'sold' || artwork.status.toLowerCase() === 'soldout' || artwork.status.toLowerCase() === 'sold_out') ? (
                <span className="status-sold" style={{ color: '#ef4444', fontSize: '14px', fontWeight: 100, fontFamily: 'Montserrat, sans-serif' }}>
                  Sold
                </span>
              ) : websiteSettings?.hide_prices ? (
                <span className="status-inquiry" style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 100, fontFamily: 'Montserrat, sans-serif' }}>
                  Price on Request
                </span>
              ) : (
                <span className="status-inquiry" style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 100, fontFamily: 'Montserrat, sans-serif' }}>
                  {formatPrice(artwork.price, currency, exchangeRates)}
                </span>
              )}
            </h2>
            {/* Convert currency drop-down (Only for available items) */}
            {!websiteSettings?.hide_prices && (
              artwork.status?.toLowerCase() !== 'sold' && 
              artwork.status?.toLowerCase() !== 'soldout' && 
              artwork.status?.toLowerCase() !== 'sold_out' && 
              artwork.status?.toLowerCase() !== 'return' && 
              artwork.status?.toLowerCase() !== 'archive' && 
              artwork.status?.toLowerCase() !== 'archived'
            ) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Convert:</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="artwork-currency-select"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="PKR">🇵🇰 PKR</option>
                  <option value="USD">🇺🇸 USD</option>
                  <option value="EUR">🇪🇺 EUR</option>
                  <option value="GBP">🇬🇧 GBP</option>
                  <option value="AED">🇦🇪 AED</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions Row (Add to Bag / WhatsApp / Email) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            {!websiteSettings?.hide_add_to_cart && (
              <button
                onClick={() => {
                  if (!guestSession) {
                    setIsGuestModalOpen(true);
                  } else if (artwork.status === 'Available' || artwork.status === 'not_sold' || artwork.status === 'available') {
                    onAddToCart(artwork);
                  }
                }}
                className="inquiry-icon-btn add-to-bag-icon-btn"
                disabled={
                  guestSession && (
                    isInCart || 
                    artwork.status?.toLowerCase() === 'sold' || 
                    artwork.status?.toLowerCase() === 'soldout' || 
                    artwork.status?.toLowerCase() === 'sold_out' || 
                    artwork.status?.toLowerCase() === 'return' || 
                    artwork.status?.toLowerCase() === 'archive' || 
                    artwork.status?.toLowerCase() === 'archived'
                  )
                }
                title={
                  !guestSession ? "Login to Add to Bag" : 
                  isInCart ? "In Bag" : 
                  (artwork.status?.toLowerCase() === 'return' || artwork.status?.toLowerCase() === 'archive' || artwork.status?.toLowerCase() === 'archived') ? "Archived" : 
                  (artwork.status?.toLowerCase() === 'sold' || artwork.status?.toLowerCase() === 'soldout' || artwork.status?.toLowerCase() === 'sold_out') ? "Sold" : 
                  "Add to Bag"
                }
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  padding: '0',
                  cursor: (
                    guestSession && (
                      isInCart || 
                      artwork.status?.toLowerCase() === 'sold' || 
                      artwork.status?.toLowerCase() === 'soldout' || 
                      artwork.status?.toLowerCase() === 'sold_out' || 
                      artwork.status?.toLowerCase() === 'return' || 
                      artwork.status?.toLowerCase() === 'archive' || 
                      artwork.status?.toLowerCase() === 'archived'
                    )
                  ) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  color: 'var(--text-primary)'
                }}
              >
                {artwork.status?.toLowerCase() === 'return' || artwork.status?.toLowerCase() === 'archive' || artwork.status?.toLowerCase() === 'archived' ? (
                  <span style={{ fontSize: '12px', fontWeight: 100, color: '#f59e0b' }}>Archive</span>
                ) : artwork.status?.toLowerCase() === 'sold' || artwork.status?.toLowerCase() === 'soldout' || artwork.status?.toLowerCase() === 'sold_out' ? (
                  <span style={{ fontSize: '12px', fontWeight: 100, color: '#ef4444' }}>Sold</span>
                ) : isInCart ? (
                  <Check size={20} style={{ color: '#10b981' }} title="In Bag" />
                ) : (
                  <ShoppingCart size={20} style={{ color: 'var(--text-primary)' }} title="Add to Bag" />
                )}
              </button>
            )}

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                transition: 'transform 0.2s'
              }}
              className="inquiry-icon-btn whatsapp-icon-btn"
              title="WhatsApp Inquiry"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>

            {/* Email */}
            <button
              onClick={handleEmailInquiryClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              className="inquiry-icon-btn"
              title="Email Inquiry"
            >
              <Mail size={18} />
            </button>
          </div>

          {/* View on Wall — separate row below */}
          <div style={{ marginTop: '0.6rem' }}>
            <button
              onClick={() => setShowWallModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                borderRadius: '20px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Montserrat, sans-serif'
              }}
              className="view-on-wall-btn inquiry-icon-btn"
            >
              <Eye size={18} /> View on Wall
            </button>
          </div>

        </div>
      </div>

      {/* Inquiry Form Section */}
      {showInquiryForm && (
        <div
          ref={inquiryFormRef}
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '2rem',
              boxShadow: 'var(--shadow-premium)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 100, margin: 0, color: '#333333', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Inquiry
              </h2>
              <button
                onClick={() => setShowInquiryForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555555', padding: '0.25rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>

            {inquirySuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✓</div>
                <h3 style={{ color: 'var(--accent-green)', fontSize: '1.15rem', marginBottom: '0.4rem' }}>Submitted!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.25rem 0' }}>
                  We'll get back to you shortly.
                </p>
                <button
                  onClick={() => {
                    setInquirySuccess(false);
                    setInquiryData({
                      name: '', email: '', phone: '', mobile: '',
                      city: '', country: 'Pakistan', address: '',
                      message: `I would like to inquire about the artwork: "${artwork.title}" (Code: ${artworkCode}).`
                    });
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Submit Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inquiryError && (
                  <div style={{ color: 'var(--accent-red)', padding: '0.6rem 0.9rem', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem' }}>
                    {inquiryError}
                  </div>
                )}

                {/* Row 1: Name + Email */}
                <div className="inquiry-form-row">
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Name <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text" required value={inquiryData.name}
                      onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                      placeholder="Your name"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Email <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="email" required value={inquiryData.email}
                      onChange={(e) => setInquiryData({ ...inquiryData, email: e.target.value })}
                      placeholder="your@email.com"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Row 2: Phone + Mobile */}
                <div className="inquiry-form-row">
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</label>
                    <input
                      type="text" value={inquiryData.phone}
                      onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value })}
                      placeholder="+92 xxx xxxxxxx"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Mobile <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text" required value={inquiryData.mobile}
                      onChange={(e) => setInquiryData({ ...inquiryData, mobile: e.target.value })}
                      placeholder="+92 3xx xxxxxxx"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Row 3: City + Country */}
                <div className="inquiry-form-row">
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>City</label>
                    <input
                      type="text" value={inquiryData.city}
                      onChange={(e) => setInquiryData({ ...inquiryData, city: e.target.value })}
                      placeholder="Your city"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Country</label>
                    <input
                      type="text" value={inquiryData.country}
                      onChange={(e) => setInquiryData({ ...inquiryData, country: e.target.value })}
                      placeholder="Country"
                      style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message</label>
                  <textarea
                    rows="3"
                    value={inquiryData.message}
                    onChange={(e) => setInquiryData({ ...inquiryData, message: e.target.value })}
                    placeholder="Your message..."
                    style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={inquirySubmitting}
                  style={{
                    padding: '0.7rem 2rem',
                    fontSize: '12px',
                    background: 'var(--bg-input)',
                    color: '#000',
                    fontWeight: 700,
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    cursor: inquirySubmitting ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    alignSelf: 'flex-end',
                    minWidth: '130px',
                    opacity: inquirySubmitting ? 0.7 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {inquirySubmitting ? 'Sending...' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}




      {/* Room Wall Visualizer Modal */}
      {showWallModal && (
        <div
          className="room-wall-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWallModal(false);
          }}
        >
          {/* Modal Container */}
          <div className="glass-card room-wall-modal-container">
            {/* Modal Header */}
            <div className="room-wall-modal-header">
              <h3 className="room-wall-modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)' }}>
                  <Layout size={18} /> Room Wall Preview
                </span>
                <span className="modal-header-subtitle" style={{ color: '#ffffff', fontWeight: 500 }}>
                  — {artwork.title} | {artwork.artist_name || 'Artist Unknown'} ({artwork.width || 36}" × {artwork.length || 24}") • Wall Size: 16 ft × 11 ft
                </span>
              </h3>
              <button
                onClick={() => setShowWallModal(false)}
                className="room-wall-close-btn"
                aria-label="Close Wall Preview"
                title="Close (Esc)"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Body — Side by Side on Desktop, Stacked on Mobile */}
            <div className="room-wall-modal-body">
              {/* LEFT: Wall Image Canvas */}
              <div className="gallery-wall-canvas-wrapper">
                <div
                  className="gallery-wall-canvas"
                  style={{
                    backgroundColor: wallColor,
                    transition: 'background-color 0.4s ease',
                  }}
                >
                  {/* Top Right Floating Close Button directly on Picture */}
                  <button
                    onClick={() => setShowWallModal(false)}
                    className="canvas-floating-close-btn"
                    title="Close Preview (Esc)"
                    aria-label="Close Wall Preview"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>

                  {/* Room background image layer */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 0
                  }}>
                    {/* Background Room Image */}
                    <img
                      src={galleryRoomBg}
                      alt="Room Background"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 0 }}
                    />
                    {/* Wall Color Tint Overlay */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '76%', backgroundColor: wallColor, opacity: 0.55, pointerEvents: 'none', zIndex: 1, transition: 'background-color 0.4s ease' }} />
                  </div>

                  {/* Scale Reference Figure: Accurately proportioned to 11ft wall (~5.4 ft height) */}
                  <div
                    className="gallery-wall-figure"
                    style={{
                      position: 'absolute',
                      bottom: '8%',
                      left: '8%',
                      height: '54%',
                      pointerEvents: 'none',
                      zIndex: 4,
                      display: 'flex',
                      alignItems: 'flex-end'
                    }}
                  >
                    <img
                      src={galleryGirlOverlay}
                      alt="Human Scale Reference (5.4 ft)"
                      style={{
                        height: '100%',
                        width: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                        filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))'
                      }}
                    />
                  </div>

                  {/* Hanging Painting: Scaled to 16ft x 11ft Wall & Centered via (Wall Width - Painting Width) / 2 and (Wall Height - Painting Height) / 2 */}
                  {(() => {
                    const WALL_WIDTH_IN = 192;  // 16 ft = 192 in
                    const WALL_HEIGHT_IN = 132; // 11 ft = 132 in

                    const rawW = parseFloat(artwork.width) || 36;
                    const rawH = parseFloat(artwork.length || artwork.height) || 24;

                    // Priority: Real natural aspect ratio of loaded image, fallback to dimensions
                    let aspect = 1.0;
                    if (visualizerImageAspect && visualizerImageAspect > 0) {
                      aspect = visualizerImageAspect;
                    } else if (rawW > 0 && rawH > 0) {
                      aspect = rawW / rawH;
                    }

                    // Clamp aspect ratio to reasonable artistic bounds
                    aspect = Math.max(0.35, Math.min(2.8, aspect));

                    // Scale proportionally to 16ft (192 in) x 11ft (132 in) wall
                    let widthPct = Math.min(58, Math.max(16, (rawW / WALL_WIDTH_IN) * 100 * 1.45));
                    let heightPct = widthPct / aspect;

                    if (heightPct > 52) {
                      heightPct = 52;
                      widthPct = heightPct * aspect;
                    }
                    if (widthPct > 58) {
                      widthPct = 58;
                      heightPct = widthPct / aspect;
                    }

                    // Horizontal offset using formula: (16ft - Painting Width) / 2
                    // Vertical offset using formula: (11ft - Painting Height) / 2
                    const leftOffsetPct = ((WALL_WIDTH_IN - rawW) / 2 / WALL_WIDTH_IN) * 100;
                    const topOffsetPct = ((WALL_HEIGHT_IN - rawH) / 2 / WALL_HEIGHT_IN) * 100;

                    return (
                      <div
                        className={`visualizer-artwork-wrapper frame-${frameStyle}`}
                        style={{
                          position: 'absolute',
                          top: '38%', // Center of the wall area
                          left: '50%', // (16ft - W)/2 exact horizontal center
                          height: `${heightPct}%`,
                          aspectRatio: `${aspect}`,
                          maxWidth: '58%',
                          maxHeight: '52%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 3,
                          boxShadow: '0 14px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                          overflow: 'hidden',
                          transition: 'all 0.35s ease'
                        }}
                      >
                        <img
                          src={artwork.id ? `${API_BASE}/api/artworks/image/${artwork.id}` : (artwork.image || '')}
                          alt={artwork.title}
                          onLoad={(e) => {
                            if (e.target.naturalWidth && e.target.naturalHeight) {
                              setVisualizerImageAspect(e.target.naturalWidth / e.target.naturalHeight);
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.08), transparent 70%)', pointerEvents: 'none' }} />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* RIGHT: Color Palette Panel */}
              <div className="room-wall-palette-panel">
                {/* Header */}
                <h4 style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)' }}></span>
                  Wall Paint Color
                </h4>

                {/* Selected color preview + hex */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: wallColor, border: '2px solid var(--border-color)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#ffffff', letterSpacing: '0.05em', userSelect: 'all', fontWeight: 600 }}>{wallColor.toUpperCase()}</span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>{WALL_COLORS.find(c => c.value === wallColor)?.name || 'Custom'}</span>
                  </div>
                </div>

                {/* Color Grid */}
                <div className="wall-color-grid">
                  {WALL_COLORS.map((color) => {
                    const isActive = wallColor === color.value;
                    const isLight = ['#ffffff', '#faf5e8', '#f7ecd3', '#f2ede4', '#faebd7', '#f5f0e8', '#fadcb9', '#f5deb3', '#ebd3d1', '#e2d8e6', '#d5e1df', '#d2dfd3', '#e0e0e0', '#f5f5f5', '#87ceeb', '#c0c0c0'].includes(color.value);
                    return (
                      <button
                        key={color.value}
                        className="wall-color-swatch-btn"
                        onClick={() => setWallColor(color.value)}
                        title={`${color.name} — ${color.value.toUpperCase()}`}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '6px',
                          backgroundColor: color.value,
                          background: color.value,
                          border: isActive ? '2px solid var(--accent-gold)' : '1px solid rgba(128,128,128,0.3)',
                          cursor: 'pointer',
                          transform: isActive ? 'scale(1.08)' : 'scale(1)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          boxShadow: isActive ? '0 0 0 3px rgba(212,175,55,0.5)' : '0 1px 3px rgba(0,0,0,0.25)'
                        }}
                      >
                        {isActive && <Check size={13} color={isLight ? '#000' : '#fff'} />}
                      </button>
                    );
                  })}
                </div>

                <p style={{ margin: '0.15rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  * 16ft × 11ft gallery wall scale. Figure = 5'4" (1.63m).
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🖼 Premium Fullscreen Image Lightbox Modal */}
      {showLightbox && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setShowLightbox(false)}
        >
          {/* Close button top right */}
          <button
            onClick={() => setShowLightbox(false)}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.5rem',
              zIndex: 1010
            }}
          >
            <X size={32} />
          </button>

          <img
            src={artwork.id ? `${API_BASE}/api/artworks/image/${artwork.id}` : (artwork.image || '')}
            alt={artwork.title}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              borderRadius: '4px',
              animation: 'zoomIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>
      )}

    </div>
  );
}

// Helpers & components for Room Visualizer Modal
// WomanSilhouette has been replaced by the realistic background image galleryWallBg
