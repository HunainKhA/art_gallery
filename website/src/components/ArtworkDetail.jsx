import React, { useState, useEffect, useRef } from 'react';
import { Info, Calculator, ArrowLeft, MessageCircle, Mail, ShoppingBag } from 'lucide-react';
import { formatPrice } from '../services/currency';

export default function ArtworkDetail({ artworkId, onBack, onAddToCart, cartItems, currency, setCurrency, exchangeRates }) {
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

    fetch("http://localhost:8000/api/artworks/inquiry", {
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

  // Premium Pan & Zoom States
  const [zoomScale, setZoomScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mouse drag handlers for panning zoomed image
  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomScale <= 1) return;
    e.preventDefault();
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    
    // Contain panning boundaries dynamically based on zoom scale
    const maxBoundX = (zoomScale - 1) * 200;
    const maxBoundY = (zoomScale - 1) * 200;
    newX = Math.max(-maxBoundX, Math.min(maxBoundX, newX));
    newY = Math.max(-maxBoundY, Math.min(maxBoundY, newY));
    
    setPanPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Mobile Touch drag handlers
  const handleTouchStart = (e) => {
    if (zoomScale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ 
      x: e.touches[0].clientX - panPosition.x, 
      y: e.touches[0].clientY - panPosition.y 
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoomScale <= 1 || e.touches.length !== 1) return;
    let newX = e.touches[0].clientX - dragStart.x;
    let newY = e.touches[0].clientY - dragStart.y;
    
    const maxBoundX = (zoomScale - 1) * 200;
    const maxBoundY = (zoomScale - 1) * 200;
    newX = Math.max(-maxBoundX, Math.min(maxBoundX, newX));
    newY = Math.max(-maxBoundY, Math.min(maxBoundY, newY));
    
    setPanPosition({ x: newX, y: newY });
  };

  useEffect(() => {
    // Fetch individual artwork details from Python backend API
    fetch(`http://localhost:8000/api/artworks/${artworkId}`)
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
          message: `I would like to inquire about the artwork: "${data.title}" (Code: ${data.code || 'N/A'}).`
        }));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [artworkId]);

  // Run the Sheet Sizing Calculator API
  const handleCalculateSheet = (e) => {
    e.preventDefault();
    if (!customLength || !customWidth) return;
    
    setCalculating(true);
    fetch("http://localhost:8000/api/calculator/suggest-sheet", {
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

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>Loading artwork details...</div>;
  if (error) return <div style={{ color: 'var(--accent-red)', padding: '2rem' }}>Error: {error}</div>;
  if (!artwork) return null;

  const isInCart = cartItems.some(item => item.id === artwork.id);
  const formattedPriceForInquiry = formatPrice(artwork.price, currency, exchangeRates);

  const whatsappUrl = `https://wa.me/923008285600?text=${encodeURIComponent(
    `Hi, I would like to inquire about the artwork: "${artwork.title}" (Code: ${artwork.code || 'N/A'}). Listed price is ${formattedPriceForInquiry}.`
  )}`;

  const emailUrl = `mailto:mainframethegallery@gmail.com?subject=${encodeURIComponent(
    `Inquiry regarding Artwork: ${artwork.title} (Code: ${artwork.code || 'N/A'})`
  )}&body=${encodeURIComponent(
    `Hi Mainframe Gallery,\n\nI would like to inquire about the pricing and availability of the following artwork:\n\nArtwork Title: ${artwork.title}\nCode: ${artwork.code || 'N/A'}\nArtist: ${artwork.artist_name || 'N/A'}\nPrice: ${formattedPriceForInquiry}\n\nThank you!`
  )}`;

  return (
    <div className="page-content">
      {/* Back Button */}
      <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '2rem', display: 'inline-flex', alignItems: 'center' }}>
        <ArrowLeft size={16} /> Back to Gallery
      </button>

      <div className="artwork-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) 1fr', gap: '3rem', alignItems: 'start' }}>
        
        {/* Artwork Image View with Pan and Zoom */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div 
            className="artwork-image-container glass-card" 
            style={{ 
              padding: '1.25rem', 
              overflow: 'hidden', 
              position: 'relative', 
              cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              userSelect: 'none',
              touchAction: 'none' // Disables native scrolling when zooming/panning on touch devices
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <img 
               src={artwork.id ? `http://localhost:8000/api/artworks/image/${artwork.id}` : (artwork.image || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800')} 
              alt={artwork.title} 
              style={{
                width: '100%',
                maxHeight: '550px',
                objectFit: 'contain',
                borderRadius: '8px',
                display: 'block',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transform: `scale(${zoomScale}) translate(${panPosition.x / zoomScale}px, ${panPosition.y / zoomScale}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'none'
              }}
            />
            {zoomScale > 1 && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.7)', color: 'var(--accent-gold)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                Drag to Pan
              </div>
            )}
          </div>

          {/* Zoom Slider Control below the picture */}
          <div className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '95px' }}>
                Zoom: {Math.round(zoomScale * 100)}%
              </span>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="0.1" 
                value={zoomScale} 
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setZoomScale(val);
                  if (val === 1) {
                    setPanPosition({ x: 0, y: 0 });
                  }
                }}
                style={{ 
                  flexGrow: 1, 
                  accentColor: 'var(--accent-gold)', 
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px'
                }}
              />
            </div>
            {zoomScale > 1 && (
              <button 
                onClick={() => {
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                }} 
                className="btn-secondary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Reset Zoom
              </button>
            )}
          </div>
        </div>

        {/* Artwork Info & Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Code: {artwork.code || 'N/A'}</span>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', marginTop: '0.25rem' }}>{artwork.title}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>By <strong>{artwork.artist_name || 'Unknown Artist'}</strong></p>
          </div>

          {/* Pricing & Inquiry controls */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {artwork.status === 'Available' || artwork.status === 'not_sold' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Price</span>
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--accent-gold)', margin: 0, fontWeight: 700 }}>
                      {formatPrice(artwork.price, currency, exchangeRates)}
                    </h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignSelf: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Convert Price</span>
                    <select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)} 
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        outline: 'none',
                        fontWeight: 600,
                        backgroundColor: '#1a1a1a',
                      }}
                    >
                      <option value="PKR">🇵🇰 PKR</option>
                      <option value="USD">🇺🇸 USD</option>
                      <option value="EUR">🇪🇺 EUR</option>
                      <option value="GBP">🇬🇧 GBP</option>
                      <option value="AED">🇦🇪 AED</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {artwork.price && artwork.price > 0 && (
                    <button 
                      onClick={() => onAddToCart(artwork)}
                      className="btn-primary"
                      disabled={isInCart}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.85rem 1.5rem', 
                        borderRadius: '8px', 
                        fontWeight: 600,
                        backgroundColor: isInCart ? 'rgba(255,255,255,0.05)' : 'var(--accent-gold)',
                        color: isInCart ? 'var(--text-muted)' : '#000',
                        borderColor: isInCart ? 'var(--border-color)' : 'var(--accent-gold)',
                        cursor: isInCart ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ShoppingBag size={18} /> {isInCart ? 'In Cart' : 'Add to Cart'}
                    </button>
                  )}
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      backgroundColor: '#25D366', 
                      borderColor: '#25D366', 
                      color: '#fff', 
                      textDecoration: 'none', 
                      padding: '0.85rem 1.5rem', 
                      borderRadius: '8px', 
                      fontWeight: 600 
                    }}
                  >
                    <MessageCircle size={18} /> WhatsApp Inquiry
                  </a>
                  <button 
                    onClick={handleEmailInquiryClick}
                    className="btn-secondary"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      padding: '0.85rem 1.5rem', 
                      borderRadius: '8px', 
                      fontWeight: 600 
                    }}
                  >
                    <Mail size={18} /> Email Inquiry
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Status</span>
                  <h2 style={{ fontSize: '1.8rem', color: 'var(--accent-red)', margin: 0, fontWeight: 700 }}>
                    SOLD OUT
                  </h2>
                </div>
                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  SOLD
                </span>
              </>
            )}
          </div>

          {/* Artwork Specs */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Artwork Specifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Dimensions:</span>
                <p style={{ fontWeight: 500 }}>{artwork.width}" Width x {artwork.length}" Height</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Medium / Frame:</span>
                <p style={{ fontWeight: 500 }}>{artwork.with_frame === '1' ? 'Framed Artwork' : 'Canvas Only'}</p>
              </div>
            </div>
            {artwork.description && (
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Description:</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{artwork.description}</p>
              </div>
            )}
          </div>



        </div>
      </div>

      {/* Inquiry Form Section */}
      {showInquiryForm && (
        <div 
          ref={inquiryFormRef}
          className="glass-card" 
          style={{ 
            marginTop: '3rem', 
            padding: '2.5rem', 
            boxShadow: 'var(--shadow-premium)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px'
          }}
        >
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--accent-gold)' }}>Inquiry</h2>
          
          {inquirySuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <h3 style={{ color: 'var(--accent-green)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Thank You!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Your inquiry has been submitted successfully. We will get back to you shortly.</p>
              <button 
                onClick={() => {
                  setInquirySuccess(false);
                  setInquiryData({
                    name: '',
                    email: '',
                    phone: '',
                    mobile: '',
                    city: '',
                    country: 'Pakistan',
                    address: '',
                    message: `I would like to inquire about the artwork: "${artwork.title}" (Code: ${artwork.code || 'N/A'}).`
                  });
                }}
                className="btn-secondary"
                style={{ marginTop: '1.5rem', marginInline: 'auto' }}
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {inquiryError && (
                <div style={{ color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {inquiryError}
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    value={inquiryData.name}
                    onChange={(e) => setInquiryData({...inquiryData, name: e.target.value})}
                    placeholder="Name"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <input 
                    type="email" 
                    required
                    value={inquiryData.email}
                    onChange={(e) => setInquiryData({...inquiryData, email: e.target.value})}
                    placeholder="Email"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Phone</label>
                  <input 
                    type="text" 
                    value={inquiryData.phone}
                    onChange={(e) => setInquiryData({...inquiryData, phone: e.target.value})}
                    placeholder="Phone"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Mobile <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                  <input 
                    type="text" 
                    required
                    value={inquiryData.mobile}
                    onChange={(e) => setInquiryData({...inquiryData, mobile: e.target.value})}
                    placeholder="Mobile"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>City</label>
                  <input 
                    type="text" 
                    value={inquiryData.city}
                    onChange={(e) => setInquiryData({...inquiryData, city: e.target.value})}
                    placeholder="City"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Country</label>
                  <input 
                    type="text" 
                    value={inquiryData.country}
                    onChange={(e) => setInquiryData({...inquiryData, country: e.target.value})}
                    placeholder="Country"
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Address</label>
                <input 
                  type="text" 
                  value={inquiryData.address}
                  onChange={(e) => setInquiryData({...inquiryData, address: e.target.value})}
                  placeholder="Address"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>What you wanna ask!</label>
                <textarea 
                  rows="4"
                  value={inquiryData.message}
                  onChange={(e) => setInquiryData({...inquiryData, message: e.target.value})}
                  placeholder="What you wanna ask!"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  disabled={inquirySubmitting}
                  className="btn-primary" 
                  style={{ 
                    padding: '0.85rem 3rem', 
                    fontSize: '1rem',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: 'auto',
                    minWidth: '200px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {inquirySubmitting ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
}
