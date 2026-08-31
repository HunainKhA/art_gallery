import React, { useState, useEffect } from 'react';
import { Upload, X, CheckSquare, Square, Save, Loader, ArrowLeft } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function CatalogueBuilder({ editRecord = null, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    document_name: '',
    description: '',
    filename: '',
    artist_id: '',
    artwork_ids: []
  });

  const [artists, setArtists] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // 2. Populate form if in Edit Mode
  useEffect(() => {
    if (editRecord) {
      const selectedIds = editRecord.artwork_ids
        ? editRecord.artwork_ids.split(',').map(id => id.trim()).filter(Boolean)
        : [];
      
      setFormData({
        id: editRecord.id,
        document_name: editRecord.document_name || '',
        description: editRecord.description || '',
        filename: editRecord.filename || '',
        artist_id: editRecord.artist_id || '',
        artwork_ids: selectedIds
      });
    }
  }, [editRecord]);

  // 3. Fetch artworks when selected artist changes
  useEffect(() => {
    if (formData.artist_id) {
      setLoadingArtworks(true);
      fetch(getApiUrl(`/api/artworks?artist_id=${formData.artist_id}&limit=1000`))
        .then(res => res.json())
        .then(data => {
          setArtworks(Array.isArray(data) ? data : []);
          setLoadingArtworks(false);
        })
        .catch(err => {
          console.error("Failed to fetch artworks for artist:", err);
          setArtworks([]);
          setLoadingArtworks(false);
        });
    } else {
      setArtworks([]);
    }
  }, [formData.artist_id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArtistChange = (artistId) => {
    setFormData(prev => ({
      ...prev,
      artist_id: artistId,
      artwork_ids: [] // Reset selections when artist changes
    }));
  };

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

  const selectedArtworks = artworks.filter(art => formData.artwork_ids.includes(art.id));
  const unselectedArtworks = artworks.filter(art => !formData.artwork_ids.includes(art.id));

  const renderArtworkCard = (art) => {
    const isChecked = formData.artwork_ids.includes(art.id);
    const artImg = art.id
      ? getApiUrl(`/api/artworks/image/${art.id}`)
      : (art.filename ? getApiUrl(`/api/artworks/image/${art.filename}`) : (art.image ? getApiUrl(`/api/artworks/image/${art.image}`) : 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=100'));

    return (
      <div 
        key={art.id}
        onClick={() => toggleArtworkSelection(art.id)}
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.6rem',
          background: isChecked ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.01)',
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
        
        <div style={{ width: '45px', height: '45px', borderRadius: '4px', overflow: 'hidden', background: '#111', flexShrink: 0 }}>
          <img
            src={artImg}
            alt={art.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=100';
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {art.title}
          </h4>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0', fontWeight: 500 }}>
            {art.price ? `${art.price.toLocaleString()} PKR` : 'Inquiry'}
          </p>
        </div>
      </div>
    );
  };

  const handleSelectAll = () => {
    const allIds = artworks.map(art => art.id);
    setFormData(prev => ({
      ...prev,
      artwork_ids: allIds
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

    // Check file size (1MB = 1 * 1024 * 1024 bytes)
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Error: File size exceeds 1MB. Please upload a smaller image.");
      e.target.value = ''; // Reset input
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

    if (!formData.artist_id) {
      alert("Please select an Artist.");
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
      artist_id: formData.artist_id,
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

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      
      {/* Title */}
      <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Save size={22} /> {isEdit ? 'Update' : 'Create'} Artist Catalogue
      </h2>

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
              placeholder="e.g. Sadequain Masterpieces Portfolio"
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
              placeholder="Provide a detailed description of this catalogue..."
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
              <div style={{ width: '90px', height: '90px', borderRadius: '8px', border: '1px solid var(--accent-gold)', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0 }}>
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center', padding: '0.25rem' }}>No Cover</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {formData.filename || "No file uploaded. Web page will automatically display first artwork's picture if empty."}
                </span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                    <Upload size={12} /> Upload Image
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
                  Recommended: 1920x1080 px (Landscape) or 1200x1600 px (Portrait). Max size: 1MB.
                </span>
              </div>
            </div>
          </div>

          {/* Artist Selector */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Select Artist <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {loadingArtists ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Loader className="animate-spin" size={14} /> Loading artists...
              </div>
            ) : (
              <select
                value={formData.artist_id}
                onChange={(e) => handleArtistChange(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              >
                <option value="">-- Choose Artist --</option>
                {artists.map(artist => (
                  <option key={artist.id} value={artist.id}>{artist.name}</option>
                ))}
              </select>
            )}
          </div>

        </div>

        {/* Selected Artworks Selection View */}
        {formData.artist_id && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                  Select Artworks ({formData.artwork_ids.length} selected)
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                  Pick the artworks of the selected artist to include in this catalog
                </p>
              </div>

              {artworks.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                    onClick={handleSelectAll}
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                    onClick={handleDeselectAll}
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {loadingArtworks ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Loader className="animate-spin" size={24} color="var(--accent-gold)" /> Loading artist artworks...
              </div>
            ) : artworks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                No active artworks found in inventory for this artist. Create artworks for this artist first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. New / Available Artworks (Uper/top section) */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)' }}></span>
                    New / Available Artworks ({unselectedArtworks.length})
                  </h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '1rem', 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.01)'
                  }} className="custom-scrollbar">
                    {unselectedArtworks.length === 0 ? (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No new/unselected artworks. All works are already added to this catalogue.
                      </div>
                    ) : (
                      unselectedArtworks.map(renderArtworkCard)
                    )}
                  </div>
                </div>

                {/* 2. Old / Already Catalogued Artworks (Neeche/bottom section) */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-green, #10b981)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-green, #10b981)' }}></span>
                    Already Added / Existing Catalogue Artworks ({selectedArtworks.length})
                  </h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '1rem', 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.04)'
                  }} className="custom-scrollbar">
                    {selectedArtworks.length === 0 ? (
                      <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No artworks selected yet. Click artworks from the section above to add them here.
                      </div>
                    ) : (
                      selectedArtworks.map(renderArtworkCard)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
          background: rgba(212, 175, 55, 0.04) !important;
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
