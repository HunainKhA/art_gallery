import React, { useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, CheckCircle2, Loader2, Sparkles, Edit3, Save, RefreshCw } from 'lucide-react';
import { fetchArtists, fetchCollectionTypes, fetchMediums, getApiUrl } from '../services/api';

export default function PDFImportSection() {
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mediums, setMediums] = useState([]);

  // Form State - Phase 1
  const [artistId, setArtistId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [mediumId, setMediumId] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  // Preview State - Phase 2
  const [previewList, setPreviewList] = useState([]);
  const [isUploaded, setIsUploaded] = useState(false);

  // Global Bulk Apply State
  const [globalPrice, setGlobalPrice] = useState('');
  const [globalLength, setGlobalLength] = useState('');
  const [globalWidth, setGlobalWidth] = useState('');
  const [globalDealType, setGlobalDealType] = useState('Sale_Basis');
  const [globalPurchasePrice, setGlobalPurchasePrice] = useState('');

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [fetchingData, setFetchingData] = useState(true);

  // Load dropdown lists on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setFetchingData(true);
        const [artistsList, catsList, medsList] = await Promise.all([
          fetchArtists(),
          fetchCollectionTypes(),
          fetchMediums()
        ]);
        setArtists(artistsList || []);
        setCategories(catsList || []);
        setMediums(medsList || []);
      } catch (err) {
        setError('Failed to load form options: ' + err.message);
      } finally {
        setFetchingData(false);
      }
    };
    loadDropdownData();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
    } else {
      setPdfFile(null);
      setError('Please select a valid PDF catalog file.');
    }
  };

  // Phase 1 Submit: Upload PDF & fetch pages for preview
  const handleUploadAndPreview = async (e) => {
    e.preventDefault();
    if (!artistId) return setError('Please select an artist.');
    if (!pdfFile) return setError('Please upload a PDF file.');

    setLoading(true);
    setError('');
    setSuccessResult(null);

    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('artist_id', artistId);

    try {
      const response = await fetch(getApiUrl('/api/artworks/preview-pdf'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to split PDF catalog.');
      }

      const result = await response.json();
      const items = (result.artworks || []).map(item => ({ ...item, selected: true }));
      setPreviewList(items);
      setIsUploaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle value change for specific page row in grid
  const handleRowChange = (index, field, value) => {
    setPreviewList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Apply values to all rows in the editor
  const handleApplyGlobal = () => {
    setPreviewList(prev => 
      prev.map(item => ({
        ...item,
        price: globalPrice !== '' ? parseFloat(globalPrice) || 0 : item.price,
        length: globalLength !== '' ? parseFloat(globalLength) || 0 : item.length,
        width: globalWidth !== '' ? parseFloat(globalWidth) || 0 : item.width,
        deal_type: globalDealType !== '' ? globalDealType : item.deal_type,
        purchase_price: globalPurchasePrice !== '' ? parseFloat(globalPurchasePrice) || 0 : item.purchase_price,
      }))
    );
  };

  // Phase 2 Submit: Commit edited rows to the database
  const handleCommitImport = async () => {
    setLoading(true);
    setError('');

    const selectedArtworks = previewList.filter(item => item.selected);
    if (selectedArtworks.length === 0) {
      setError('Please select at least one artwork to import.');
      setLoading(false);
      return;
    }

    const payload = {
      artist_id: artistId,
      category_id: categoryId || null,
      medium_id: mediumId || null,
      artworks: selectedArtworks.map(item => ({
        temp_image_id: item.temp_image_id,
        title: item.title,
        code: item.code,
        price: parseFloat(item.price) || 0,
        length: parseFloat(item.length) || 0,
        width: parseFloat(item.width) || 0,
        deal_type: item.deal_type || 'Sale_Basis',
        purchase_price: parseFloat(item.purchase_price) || 0
      }))
    };

    try {
      const response = await fetch(getApiUrl('/api/artworks/commit-import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to commit bulk artworks.');
      }

      const result = await response.json();
      setSuccessResult(result);
      // Reset state
      setIsUploaded(false);
      setPreviewList([]);
      setPdfFile(null);
      const fileInput = document.getElementById('pdf-file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsUploaded(false);
    setPreviewList([]);
    setSuccessResult(null);
    setPdfFile(null);
    setError('');
  };

  if (fetchingData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader2 className="spin" size={32} style={{ color: 'var(--accent-gold)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading catalog options...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative Glow */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(189, 160, 76, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--accent-gold)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
              <Sparkles size={24} /> Interactive PDF Catalog Bulk Import
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Upload your catalog PDF. Review each page as an image, and fill details (title, code, size, price) inline before saving to the database.
            </p>
          </div>
          {isUploaded && (
            <button onClick={handleReset} className="btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Start Over
            </button>
          )}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Phase 1: Upload PDF Catalog */}
        {!isUploaded && !successResult && (
          <form onSubmit={handleUploadAndPreview} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Artist Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Artist <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  value={artistId} 
                  onChange={(e) => setArtistId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="" style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>-- Select Artist --</option>
                  {artists.map(a => (
                    <option key={a.id} value={a.id} style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>
                      {`${a.first_name || ''} ${a.last_name || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category / Type</label>
                <select 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="" style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>-- Select Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Medium Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Medium</label>
                <select 
                  value={mediumId} 
                  onChange={(e) => setMediumId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                >
                  <option value="" style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>-- Select Medium --</option>
                  {mediums.map(m => (
                    <option key={m.id} value={m.id} style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop PDF */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>PDF Catalog File <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ border: '2px dashed var(--border-color)', padding: '2.5rem 1.5rem', borderRadius: '12px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)', position: 'relative' }}>
                <input 
                  type="file" 
                  id="pdf-file-input"
                  accept=".pdf" 
                  onChange={handleFileChange} 
                  required
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', pointerEvents: 'none' }}>
                  <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(189, 160, 76, 0.1)', color: 'var(--accent-gold)' }}>
                    <FileText size={32} />
                  </div>
                  {pdfFile ? (
                    <div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.25rem' }}>{pdfFile.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Catalog Selected</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.25rem' }}>Click or drag PDF catalog file here</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We will render the pages to images for your review</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !artistId || !pdfFile}
              className="btn-primary" 
              style={{ width: '100%', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: (loading || !artistId || !pdfFile) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={18} /> Parsing PDF Pages...
                </>
              ) : (
                <>
                  <Upload size={18} /> Upload & Preview Pages
                </>
              )}
            </button>
          </form>
        )}

        {/* Phase 2: Interactive Grid Editor */}
        {isUploaded && previewList.length > 0 && (
          <div>
            {/* Global Bulk Apply Panel */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(189, 160, 76, 0.05)', border: '1px solid rgba(189, 160, 76, 0.15)', borderRadius: '12px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Edit3 size={16} /> Bulk Sizing / Pricing Apply:
              </div>
              <input 
                type="number" 
                placeholder="Price (PKR)" 
                value={globalPrice} 
                onChange={(e) => setGlobalPrice(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', width: '140px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
              />
              <input 
                type="number" 
                placeholder="Length (in)" 
                value={globalLength} 
                onChange={(e) => setGlobalLength(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', width: '110px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
              />
              <input 
                type="number" 
                placeholder="Width (in)" 
                value={globalWidth} 
                onChange={(e) => setGlobalWidth(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', width: '110px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
              />
              
              {/* Global Deal Type selection */}
              <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setGlobalDealType('Sale_Basis')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    background: globalDealType === 'Sale_Basis' ? 'var(--accent-gold)' : 'rgba(0,0,0,0.2)',
                    color: globalDealType === 'Sale_Basis' ? '#000' : 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Sale Basis
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalDealType('Purchase_Basis')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    background: globalDealType === 'Purchase_Basis' ? 'var(--accent-gold)' : 'rgba(0,0,0,0.2)',
                    color: globalDealType === 'Purchase_Basis' ? '#000' : 'var(--text-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Buy
                </button>
              </div>

              {/* Conditional Global Purchase Price */}
              {globalDealType === 'Purchase_Basis' && (
                <input 
                  type="number" 
                  placeholder="Buy Price (PKR)" 
                  value={globalPurchasePrice} 
                  onChange={(e) => setGlobalPurchasePrice(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', width: '140px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                />
              )}

              <button 
                onClick={handleApplyGlobal} 
                className="btn-primary" 
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '6px' }}
              >
                Apply to All Pages
              </button>
            </div>

            {/* Select All Checkbox */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="select-all-checkbox"
                  checked={previewList.length > 0 && previewList.every(item => item.selected)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPreviewList(prev => prev.map(item => ({ ...item, selected: checked })));
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                />
                <label htmlFor="select-all-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
                  Select All Pages
                </label>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Selected: {previewList.filter(item => item.selected).length} of {previewList.length} pages
              </span>
            </div>

            {/* Pages Grid Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
              {previewList.map((item, idx) => (
                <div key={item.temp_image_id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  gap: '0.85rem', 
                  padding: '0.85rem 1rem', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px',
                  opacity: item.selected ? 1 : 0.4,
                  transition: 'opacity 0.2s ease',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  
                  {/* Select Checkbox + Page Indicator + Thumbnail (Left Group) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
                      <input 
                        type="checkbox"
                        checked={!!item.selected}
                        onChange={(e) => handleRowChange(idx, 'selected', e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: 'var(--accent-gold)'
                        }}
                      />
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, width: '55px', textAlign: 'center' }}>
                      Page {item.page}
                    </div>

                    <div style={{ width: '80px', height: '110px', background: '#050505', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                      <img 
                        src={getApiUrl(`/api/artworks/temp-image/${item.temp_image_id}`)} 
                        alt={`Page ${item.page}`}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>

                  {/* Editable Inputs Grid (Fluid & responsive, never overflows) */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: item.deal_type === 'Purchase_Basis'
                      ? 'repeat(auto-fit, minmax(115px, 1fr))'
                      : 'repeat(auto-fit, minmax(125px, 1fr))', 
                    gap: '0.6rem', 
                    flex: 1,
                    minWidth: '280px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    
                    {/* Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Artwork Title</label>
                      <input 
                        type="text" 
                        value={item.title} 
                        onChange={(e) => handleRowChange(idx, 'title', e.target.value)}
                        style={{ padding: '0.55rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                      />
                    </div>

                    {/* Code */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>System Code</label>
                      <input 
                        type="text" 
                        value={item.code} 
                        onChange={(e) => handleRowChange(idx, 'code', e.target.value)}
                        style={{ padding: '0.55rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                      />
                    </div>

                    {/* Deal Type Switcher */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Deal Type</label>
                      <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', height: '34px', width: '100%', boxSizing: 'border-box' }}>
                        <button
                          type="button"
                          onClick={() => handleRowChange(idx, 'deal_type', 'Sale_Basis')}
                          style={{
                            flex: 1,
                            padding: '0 0.5rem',
                            fontSize: '0.75rem',
                            background: item.deal_type === 'Sale_Basis' ? 'var(--accent-gold)' : 'transparent',
                            color: item.deal_type === 'Sale_Basis' ? '#000' : 'var(--text-primary)',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Sale
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRowChange(idx, 'deal_type', 'Purchase_Basis')}
                          style={{
                            flex: 1,
                            padding: '0 0.5rem',
                            fontSize: '0.75rem',
                            background: item.deal_type === 'Purchase_Basis' ? 'var(--accent-gold)' : 'transparent',
                            color: item.deal_type === 'Purchase_Basis' ? '#000' : 'var(--text-primary)',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Buy
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Price (PKR)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={item.price} 
                        onChange={(e) => handleRowChange(idx, 'price', e.target.value)}
                        style={{ padding: '0.55rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                      />
                    </div>

                    {/* Conditional Buy Price (only for Purchase_Basis) */}
                    {item.deal_type === 'Purchase_Basis' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Buy Price (PKR)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={item.purchase_price || ''} 
                          onChange={(e) => handleRowChange(idx, 'purchase_price', e.target.value)}
                          style={{ padding: '0.55rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                        />
                      </div>
                    )}

                    {/* Length */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Length (in)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={item.length} 
                        onChange={(e) => handleRowChange(idx, 'length', e.target.value)}
                        style={{ padding: '0.55rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                      />
                    </div>

                    {/* Width */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, width: '100%' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Width (in)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={item.width} 
                        onChange={(e) => handleRowChange(idx, 'width', e.target.value)}
                        style={{ padding: '0.55rem 0.5rem', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 }}
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Commit Import Trigger Button */}
            <button 
              onClick={handleCommitImport} 
              disabled={loading}
              className="btn-primary" 
              style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={20} /> Registering Paintings to Database...
                </>
              ) : (
                <>
                  <Save size={20} /> Confirm & Save Selected Artworks ({previewList.filter(item => item.selected).length} items)
                </>
              )}
            </button>
          </div>
        )}

        {/* Phase 3: Success Result Screen */}
        {successResult && (
          <div style={{ marginTop: '1rem', textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={48} />
            </div>
            
            <h3 style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Import Completed Successfully!
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
              {successResult.message} The paintings have been registered under their respective artist, and high-quality image pages are indexed in the records.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', textLeft: 'left', marginBottom: '3rem' }}>
              {successResult.artworks.map((art) => (
                <div key={art.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ width: '100%', height: '150px', background: '#050505', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <img 
                      src={getApiUrl(`/api/artworks/image/${art.id}`)} 
                      alt={art.title} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>{art.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 500 }}>{art.code}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleReset} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
              Import Another Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
