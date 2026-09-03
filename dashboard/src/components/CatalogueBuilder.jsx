import React, { useState, useEffect, useMemo } from 'react';
import { Upload, X, CheckSquare, Square, Save, Loader, Search, Users, User, Filter, Image as ImageIcon } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function CatalogueBuilder({ editRecord = null, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    document_name: '',
    description: '',
    filename: '',
    artist_ids: [], // Array of selected artist IDs
    artwork_ids: []  // Array of selected artwork IDs
  });

  const [artists, setArtists] = useState([]);
  const [allArtworks, setAllArtworks] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filter controls
  const [artistSearch, setArtistSearch] = useState('');
  const [artworkSearch, setArtworkSearch] = useState('');
  const [artistFilterMode, setArtistFilterMode] = useState('all'); // 'all' or 'selected'

  const isEdit = !!editRecord;

  // 1. Fetch Artists list on mount
  useEffect(() => {
    setLoadingArtists(true);
    fetch(getApiUrl('/api/artists'))
      .then(res => res.json())
      .then(data => {
        setArtists(Array.isArray(data) ? data : []);
        setLoadingArtists(false);
      })
      .catch(err => {
        console.error("Failed to load artists list:", err);
        setLoadingArtists(false);
      });
  }, []);

  // 2. Fetch all artworks from inventory
  useEffect(() => {
    setLoadingArtworks(true);
    fetch(getApiUrl('/api/artworks?limit=10000'))
      .then(res => res.json())
      .then(data => {
        setAllArtworks(Array.isArray(data) ? data : []);
        setLoadingArtworks(false);
      })
      .catch(err => {
        console.error("Failed to load artworks inventory:", err);
        setAllArtworks([]);
        setLoadingArtworks(false);
      });
  }, []);

  // 3. Populate form if in Edit Mode
  useEffect(() => {
    if (editRecord) {
      const selectedArtIds = editRecord.artwork_ids
        ? editRecord.artwork_ids.split(',').map(id => id.trim()).filter(Boolean)
        : [];
      
      const selectedArtArtistIds = editRecord.artist_id
        ? editRecord.artist_id.split(',').map(id => id.trim()).filter(Boolean)
        : [];

      setFormData({
        id: editRecord.id,
        document_name: editRecord.document_name || '',
        description: editRecord.description || '',
        filename: editRecord.filename || '',
        artist_ids: selectedArtArtistIds,
        artwork_ids: selectedArtIds
      });

      if (selectedArtArtistIds.length > 0) {
        setArtistFilterMode('selected');
      }
    }
  }, [editRecord]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle single artist selection in multi-artist mode
  const toggleArtistSelection = (artistId) => {
    setFormData(prev => {
      const isSelected = prev.artist_ids.includes(artistId);
      const updated = isSelected
        ? prev.artist_ids.filter(id => id !== artistId)
        : [...prev.artist_ids, artistId];
      return {
        ...prev,
        artist_ids: updated
      };
    });
  };

  const handleSelectAllArtists = () => {
    setFormData(prev => ({
      ...prev,
      artist_ids: artists.map(a => a.id)
    }));
  };

  const handleClearArtistSelection = () => {
    setFormData(prev => ({
      ...prev,
      artist_ids: []
    }));
  };

  // Toggle artwork selection
  const toggleArtworkSelection = (artworkId) => {
    setFormData(prev => {
      const isSelected = prev.artwork_ids.includes(artworkId);
      const newSelection = isSelected
        ? prev.artwork_ids.filter(id => id !== artworkId)
        : [...prev.artwork_ids, artworkId];
      return {
        ...prev,
        artwork_ids: newSelection
      };
    });
  };

  // Filter artworks according to artist filter mode and search queries
  const filteredAvailableArtworks = useMemo(() => {
    return allArtworks.filter(art => {
      // 1. Artist matching
      if (artistFilterMode === 'selected' && formData.artist_ids.length > 0) {
        if (!formData.artist_ids.includes(art.artist_id)) {
          return false;
        }
      }

      // 2. Search query (title, code, artist name)
      if (artworkSearch.trim()) {
        const q = artworkSearch.toLowerCase();
        const titleMatch = (art.title || '').toLowerCase().includes(q);
        const codeMatch = (art.code || '').toLowerCase().includes(q);
        const artistMatch = (art.artist_name || art.artist || '').toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !artistMatch) {
          return false;
        }
      }

      return true;
    });
  }, [allArtworks, artistFilterMode, formData.artist_ids, artworkSearch]);

  const selectedArtworks = useMemo(() => {
    return allArtworks.filter(art => formData.artwork_ids.includes(art.id));
  }, [allArtworks, formData.artwork_ids]);

  const unselectedArtworks = useMemo(() => {
    return filteredAvailableArtworks.filter(art => !formData.artwork_ids.includes(art.id));
  }, [filteredAvailableArtworks, formData.artwork_ids]);

  const handleSelectAllVisible = () => {
    const visibleIds = filteredAvailableArtworks.map(art => art.id);
    setFormData(prev => ({
      ...prev,
      artwork_ids: Array.from(new Set([...prev.artwork_ids, ...visibleIds]))
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      artwork_ids: []
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (1MB max)
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Error: File size exceeds 1MB. Please upload a smaller image.");
      e.target.value = '';
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch(getApiUrl('/api/artworks/upload-image'), {
      method: 'POST',
      body: uploadData
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then(resData => {
        if (resData.filename) {
          handleInputChange('filename', resData.filename);
        }
      })
      .catch(err => alert("Cover upload error: " + err.message));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.document_name.trim()) {
      alert("Please enter a Catalogue Title.");
      return;
    }

    if (formData.artwork_ids.length === 0) {
      alert("Please select at least one artwork to build the catalogue.");
      return;
    }

    setSaving(true);

    const payload = {
      document_name: formData.document_name,
      description: formData.description,
      filename: formData.filename,
      artist_id: formData.artist_ids.join(','),
      artwork_ids: formData.artwork_ids.join(',')
    };

    let path = '/api/crm/catalogues';
    if (isEdit) {
      path += `/${formData.id}`;
    }

    fetch(getApiUrl(path), {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save catalogue.");
        return res.json();
      })
      .then(() => {
        setSaving(false);
        alert(`Catalogue ${isEdit ? 'updated' : 'created'} successfully!`);
        if (onSuccess) onSuccess();
      })
      .catch(err => {
        alert("Error saving catalogue: " + err.message);
        setSaving(false);
      });
  };

  const coverUrl = formData.filename
    ? getApiUrl(`/api/artworks/image/${formData.filename}`)
    : null;

  // Render Artwork Card without any prices
  const renderArtworkCard = (art) => {
    const isChecked = formData.artwork_ids.includes(art.id);
    const artImg = art.id
      ? getApiUrl(`/api/artworks/image/${art.id}`)
      : (art.filename ? getApiUrl(`/api/artworks/image/${art.filename}`) : (art.image ? getApiUrl(`/api/artworks/image/${art.image}`) : ''));

    const dimStr = (art.length && art.width) ? `${art.length}" x ${art.width}"` : '';

    return (
      <div 
        key={art.id}
        onClick={() => toggleArtworkSelection(art.id)}
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.65rem 0.8rem',
          background: isChecked ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.015)',
          border: `1px solid ${isChecked ? 'var(--accent-gold)' : 'var(--border-color)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          userSelect: 'none'
        }}
        className="artwork-checkbox-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', color: isChecked ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
          {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
        </div>
        
        <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: '#141416', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}>
          <img
            src={artImg}
            alt={art.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getApiUrl('/api/artworks/image/placeholder');
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {art.title || art.code || 'Untitled'}
          </h4>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', margin: '0.15rem 0 0 0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {art.artist_name || art.artist || 'Unknown Artist'}
          </p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
            {[art.medium_name, dimStr].filter(Boolean).join(' • ') || 'Artwork'}
          </p>
        </div>
      </div>
    );
  };

  const filteredArtistsList = artists.filter(a => 
    (a.name || '').toLowerCase().includes(artistSearch.toLowerCase())
  );

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '950px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', color: 'var(--accent-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Save size={22} /> {isEdit ? 'Update' : 'Create'} Exhibition & Artist Catalogue
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.3rem 0 0 0' }}>
            Compile single or multiple artists' artworks into a high-resolution PDF catalogue without prices.
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', margin: 0 }}>
            <X size={14} style={{ marginRight: '0.3rem' }} /> Back
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Basic Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          
          {/* Title */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Catalogue Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text"
              value={formData.document_name}
              onChange={(e) => handleInputChange('document_name', e.target.value)}
              placeholder="e.g. Masterpieces Collection 2026 / Solo Exhibition"
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Description */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Description
            </label>
            <textarea 
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide a detailed curatorial note or exhibition description..."
              rows="3"
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'none' }}
            />
          </div>

          {/* Cover image uploader */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Cover Image (Optional)
            </label>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '8px', border: '1px solid var(--accent-gold)', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center', padding: '0.25rem' }}>No Cover</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {formData.filename || "No custom cover uploaded. The catalogue will automatically use the first selected artwork."}
                </span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                    <Upload size={12} /> Upload Cover
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>
                  {formData.filename && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={() => handleInputChange('filename', '')}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Max size: 1MB. High resolution square/landscape image recommended.
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ARTIST SELECTION / MULTI-ARTISTS FILTER                   */}
          {/* ========================================================= */}
          <div style={{ gridColumn: 'span 2', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, margin: 0 }}>
                  <Users size={16} /> Artist Selection Mode
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0.2rem 0 0 0' }}>
                  Choose whether this catalogue is for All Artists, Multiple Artists, or a Specific Solo Artist
                </p>
              </div>

              {/* Mode Switcher */}
              <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setArtistFilterMode('all')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: artistFilterMode === 'all' ? 600 : 400,
                    color: artistFilterMode === 'all' ? '#000' : 'var(--text-secondary)',
                    backgroundColor: artistFilterMode === 'all' ? 'var(--accent-gold)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  All Artists ({artists.length})
                </button>
                <button
                  type="button"
                  onClick={() => setArtistFilterMode('selected')}
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: artistFilterMode === 'selected' ? 600 : 400,
                    color: artistFilterMode === 'selected' ? '#000' : 'var(--text-secondary)',
                    backgroundColor: artistFilterMode === 'selected' ? 'var(--accent-gold)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Specific / Multiple Artists ({formData.artist_ids.length})
                </button>
              </div>
            </div>

            {/* Selected Artists Mode Box */}
            {artistFilterMode === 'selected' && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      placeholder="Search artist name to filter..."
                      style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                    onClick={handleSelectAllArtists}
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                    onClick={handleClearArtistSelection}
                  >
                    Clear
                  </button>
                </div>

                {/* Artists Multi-Select Tags Grid */}
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.4rem', 
                  maxHeight: '140px', 
                  overflowY: 'auto', 
                  padding: '0.6rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.1)'
                }} className="custom-scrollbar">
                  {loadingArtists ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading artists list...</span>
                  ) : filteredArtistsList.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matching artists found.</span>
                  ) : (
                    filteredArtistsList.map(a => {
                      const isSel = formData.artist_ids.includes(a.id);
                      return (
                        <div
                          key={a.id}
                          onClick={() => toggleArtistSelection(a.id)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: isSel ? 600 : 400,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            backgroundColor: isSel ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isSel ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                            color: isSel ? 'var(--accent-gold)' : 'var(--text-secondary)',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSel && <CheckSquare size={12} />}
                          {a.name}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================= */}
        {/* ARTWORKS SELECTION SECTION                                */}
        {/* ========================================================= */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={18} color="var(--accent-gold)" /> Select Artworks ({formData.artwork_ids.length} selected)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                Pick artworks across single or multiple artists to include in this catalogue
              </p>
            </div>

            {/* Search and Bulk Selection Controls */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  value={artworkSearch}
                  onChange={(e) => setArtworkSearch(e.target.value)}
                  placeholder="Filter artworks..."
                  style={{ width: '100%', padding: '0.4rem 0.6rem 0.4rem 2rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                />
              </div>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                onClick={handleSelectAllVisible}
                title="Select all visible filtered artworks"
              >
                Select All
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                onClick={handleDeselectAll}
                title="Clear all artwork selections"
              >
                Deselect All
              </button>
            </div>
          </div>

          {loadingArtworks ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Loader className="animate-spin" size={24} color="var(--accent-gold)" /> Loading artworks inventory...
            </div>
          ) : allArtworks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
              No active artworks found in inventory.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* 1. Available / Unselected Artworks */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)' }}></span>
                  Available Inventory Artworks ({unselectedArtworks.length})
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                  gap: '0.75rem', 
                  maxHeight: '260px', 
                  overflowY: 'auto', 
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.01)'
                }} className="custom-scrollbar">
                  {unselectedArtworks.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {artworkSearch ? 'No matching artworks found for this search.' : 'All matching artworks have been added to this catalogue.'}
                    </div>
                  ) : (
                    unselectedArtworks.map(renderArtworkCard)
                  )}
                </div>
              </div>

              {/* 2. Included / Selected Artworks */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: '#10b981', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  Artworks Included in this Catalogue ({selectedArtworks.length})
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                  gap: '0.75rem', 
                  maxHeight: '260px', 
                  overflowY: 'auto', 
                  padding: '0.75rem',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.03)'
                }} className="custom-scrollbar">
                  {selectedArtworks.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No artworks selected yet. Click on any artwork from the section above to add it to the catalogue.
                    </div>
                  ) : (
                    selectedArtworks.map(renderArtworkCard)
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, margin: 0, padding: '0.75rem' }}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" style={{ flex: onCancel ? 2 : 1, padding: '0.75rem', margin: 0 }} disabled={saving}>
            {saving ? <><Loader className="animate-spin" size={14} /> Saving Catalogue...</> : `${isEdit ? 'Update' : 'Save'} Catalogue`}
          </button>
        </div>

      </form>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--accent-gold);
        }
        .artwork-checkbox-card:hover {
          border-color: var(--accent-gold) !important;
          background: rgba(212, 175, 55, 0.05) !important;
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
