import React, { useState, useEffect } from 'react';
import { Upload, X, CheckSquare, Square, Save, Loader, Calendar, AlertCircle } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function ExhibitionBuilder({ editRecord = null, onCancel, onSuccess }) {
  const [formData, setFormData] = useState({
    document_name: '',
    description: '',
    filename: '',
    active_date: '',
    exp_date: '',
    artist_id: '',
    artwork_ids: [],
    guest_pics: [],
    show_type: 'solo',
    group_artist_ids: [],
    video_url: ''
  });

  const [artists, setArtists] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [artistSearchQuery, setArtistSearchQuery] = useState('');

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

      const selectedGuests = editRecord.guest_pics
        ? editRecord.guest_pics.split(',').map(id => id.trim()).filter(Boolean)
        : [];

      const groupArtists = editRecord.group_artist_ids
        ? editRecord.group_artist_ids.split(',').map(id => id.trim()).filter(Boolean)
        : [];

      setFormData({
        id: editRecord.id,
        document_name: editRecord.document_name || '',
        description: editRecord.description || '',
        filename: editRecord.filename || '',
        active_date: editRecord.active_date || '',
        exp_date: editRecord.exp_date || '',
        artist_id: editRecord.artist_id || '',
        artwork_ids: selectedIds,
        guest_pics: selectedGuests,
        show_type: editRecord.show_type || 'solo',
        group_artist_ids: groupArtists,
        video_url: editRecord.video_url || ''
      });
    }
  }, [editRecord]);

  // 3. Fetch artworks when selected artist changes
  useEffect(() => {
    if (formData.show_type === 'solo' && formData.artist_id) {
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
    } else if (formData.show_type === 'group' && formData.group_artist_ids.length > 0) {
      setLoadingArtworks(true);
      Promise.all(
        formData.group_artist_ids.map(id =>
          fetch(getApiUrl(`/api/artworks?artist_id=${id}&limit=1000`))
            .then(res => res.json())
            .catch(() => [])
        )
      )
        .then(results => {
          const combined = results.flat();
          setArtworks(combined);
          setLoadingArtworks(false);
        })
        .catch(err => {
          console.error("Failed to fetch artworks for group artists:", err);
          setArtworks([]);
          setLoadingArtworks(false);
        });
    } else {
      setArtworks([]);
    }
  }, [formData.show_type, formData.artist_id, formData.group_artist_ids]);

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

  const toggleGroupArtistSelection = (artistId) => {
    setFormData(prev => {
      const isSelected = prev.group_artist_ids.includes(artistId);
      const newSelection = isSelected
        ? prev.group_artist_ids.filter(id => id !== artistId)
        : [...prev.group_artist_ids, artistId];
      return {
        ...prev,
        group_artist_ids: newSelection,
        artist_id: newSelection[0] || '', // Fallback single artist_id
        artwork_ids: [] // Reset artworks when group selections change
      };
    });
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

  // Filter artworks: New Work vs Old/Exhibited Work
  const newArtworks = artworks.filter(art => art.is_exhibited);
  const oldArtworks = artworks.filter(art => !art.is_exhibited);

  const [uploadingGuests, setUploadingGuests] = useState(false);

  const handleGuestPhotosUpload = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = ''; // Reset input to allow selecting files again
    if (files.length === 0) return;

    const remainingSlots = 30 - formData.guest_pics.length;
    if (remainingSlots <= 0) {
      alert("You have already reached the maximum limit of 30 guest photos.");
      return;
    }

    let filesToUpload = files;
    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} more photo(s) can be added (max 30 limit). Uploading the first ${remainingSlots} photo(s).`);
      filesToUpload = files.slice(0, remainingSlots);
    }

    setUploadingGuests(true);

    try {
      // Concurrently upload in batches of 5
      const uploadedNames = [];
      const batchSize = 5;
      for (let i = 0; i < filesToUpload.length; i += batchSize) {
        const batch = filesToUpload.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            const uploadData = new FormData();
            uploadData.append('file', file);
            try {
              const res = await fetch(getApiUrl('/api/crm/exhibitions/upload-guest-pic'), {
                method: 'POST',
                body: uploadData
              });
              if (!res.ok) throw new Error("Upload failed");
              const resData = await res.json();
              return resData.filename || null;
            } catch (err) {
              console.error("Guest photo upload error for file:", file.name, err);
              return null;
            }
          })
        );
        batchResults.forEach(name => {
          if (name) uploadedNames.push(name);
        });
      }

      if (uploadedNames.length > 0) {
        setFormData(prev => ({
          ...prev,
          guest_pics: [...prev.guest_pics, ...uploadedNames]
        }));
      }

      if (uploadedNames.length < filesToUpload.length) {
        const failedCount = filesToUpload.length - uploadedNames.length;
        alert(`${uploadedNames.length} photos uploaded successfully. (${failedCount} failed to upload)`);
      }
    } catch (err) {
      console.error("Guest photos upload error:", err);
      alert("Error uploading guest photos: " + err.message);
    } finally {
      setUploadingGuests(false);
    }
  };

  const removeGuestPhoto = (filenameToRemove) => {
    setFormData(prev => ({
      ...prev,
      guest_pics: prev.guest_pics.filter(name => name !== filenameToRemove)
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

  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check video file size (25MB = 25 * 1024 * 1024 bytes)
    const maxVideoSize = 25 * 1024 * 1024;
    if (file.size > maxVideoSize) {
      alert("Error: Video file size exceeds the 25MB limit. Please compress the video (recommended 10-15MB) or upload to YouTube/Vimeo and paste the link.");
      e.target.value = ''; // Reset input
      return;
    }

    setUploadingVideo(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch(getApiUrl('/api/crm/exhibitions/upload-video'), {
      method: 'POST',
      body: uploadData
    })
      .then(res => {
        if (!res.ok) throw new Error("Video upload failed");
        return res.json();
      })
      .then(resData => {
        if (resData.filename) {
          handleInputChange('video_url', resData.filename);
        }
        setUploadingVideo(false);
      })
      .catch(err => {
        alert("Video upload error: " + err.message);
        setUploadingVideo(false);
      });
  };

  const handleRemoveVideo = () => {
    const videoFile = formData.video_url;
    if (videoFile && !videoFile.startsWith('http')) {
      fetch(getApiUrl(`/api/crm/exhibitions/video/${videoFile}`), {
        method: 'DELETE'
      })
        .then(res => res.json())
        .then(data => {
          console.log("Deleted video file from disk:", data);
        })
        .catch(err => {
          console.error("Failed to delete video file:", err);
        });
    }
    handleInputChange('video_url', '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.document_name.trim()) {
      setErrorMessage("Please enter an Exhibition Title.");
      return;
    }

    if (formData.show_type === 'solo' && !formData.artist_id) {
      setErrorMessage("Please select an Artist.");
      return;
    }

    if (formData.show_type === 'group' && formData.group_artist_ids.length === 0) {
      setErrorMessage("Please select at least one Artist for the group.");
      return;
    }

    if (!formData.active_date) {
      setErrorMessage("Please select a Start Date.");
      return;
    }

    if (formData.artwork_ids.length === 0) {
      setErrorMessage("Please select at least one artwork to build the exhibition.");
      return;
    }

    setSaving(true);

    const payload = {
      document_name: formData.document_name,
      description: formData.description,
      filename: formData.filename,
      active_date: formData.active_date,
      exp_date: formData.exp_date || null,
      artist_id: formData.show_type === 'solo' ? formData.artist_id : (formData.group_artist_ids[0] || null),
      artwork_ids: formData.artwork_ids.join(','),
      guest_pics: formData.guest_pics.join(','),
      show_type: formData.show_type,
      group_artist_ids: formData.group_artist_ids.join(','),
      video_url: formData.video_url
    };

    let path = '/api/crm/exhibitions';
    if (isEdit) {
      path += `/${formData.id}`;
    }

    fetch(getApiUrl(path), {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save exhibition.");
        return res.json();
      })
      .then(() => {
        setSaving(false);
        alert(`Exhibition ${isEdit ? 'updated' : 'created'} successfully!`);
        if (onSuccess) onSuccess();
      })
      .catch(err => {
        setErrorMessage("Error saving exhibition: " + err.message);
        setSaving(false);
      });
  };

  const coverUrl = formData.filename
    ? (formData.filename.startsWith('http') ? formData.filename : getApiUrl(`/api/artworks/image/${formData.filename}`))
    : (formData.id ? getApiUrl(`/api/crm/exhibitions/image/${formData.id}`) : null);

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
            Code: {art.code || 'N/A'} • {art.price ? `${art.price.toLocaleString()} PKR` : 'Inquiry'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>

      {/* Title */}
      <h2 style={{ fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Calendar size={22} /> {isEdit ? 'Update' : 'Create'} Exhibition
      </h2>

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '12px' }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Basic Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          {/* Title */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 100 }}>
              Exhibition Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.document_name}
              onChange={(e) => handleInputChange('document_name', e.target.value)}
              placeholder="e.g. Masterpieces Solo Show"
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Start and End Dates */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 100 }}>
              Start Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={formData.active_date}
              onChange={(e) => handleInputChange('active_date', e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.exp_date}
              onChange={(e) => handleInputChange('exp_date', e.target.value)}
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
              placeholder="Provide a detailed description of this exhibition..."
              rows="3"
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'none' }}
            />
          </div>

          {/* Cover image uploader */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Exhibition Cover Banner (Optional)
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

          {/* Guest Photos Upload Area */}
          <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontWeight: 600 }}>
              Guest Photographs ({formData.guest_pics.length}/30 uploaded)
            </label>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Upload pictures of guests who attended the exhibition. These will only be displayed on the exhibition's page. (Max 30 pictures)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label
                  className="btn-secondary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '12px',
                    cursor: formData.guest_pics.length >= 30 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    margin: 0,
                    opacity: formData.guest_pics.length >= 30 ? 0.5 : 1
                  }}
                >
                  <Upload size={14} /> {uploadingGuests ? 'Uploading...' : 'Upload Photos (Multiple)'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple={true}
                    disabled={uploadingGuests || formData.guest_pics.length >= 30}
                    style={{ display: 'none' }}
                    onChange={handleGuestPhotosUpload}
                  />
                </label>
                {uploadingGuests && <Loader className="animate-spin" size={16} style={{ color: 'var(--accent-gold)' }} />}
              </div>

              {formData.guest_pics.length > 0 && (
                <div
                  className="custom-scrollbar"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    maxHeight: '280px',
                    overflowY: 'auto'
                  }}
                >
                  {formData.guest_pics.map((filename, idx) => {
                    const guestImgUrl = getApiUrl(`/api/crm/exhibitions/guest-pic/${filename}`);
                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          height: '90px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          backgroundColor: '#111'
                        }}
                      >
                        <img src={guestImgUrl} alt={`Guest ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeGuestPhoto(filename)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.85)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title="Remove Photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Video Upload Section */}
          <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontWeight: 700 }}>
              Exhibition Video (Autoplay at bottom of page)
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Upload a short video (MP4/WebM) associated with this exhibition. It will automatically play in a muted loop at the bottom of the exhibition's page.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
              {formData.video_url && (
                <div style={{ width: '120px', height: '90px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                  <video
                    src={formData.video_url.startsWith('http') ? formData.video_url : getApiUrl(`/api/crm/exhibitions/video/${formData.video_url}`)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {formData.video_url || "No video uploaded yet."}
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <label className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                    <Upload size={12} /> {uploadingVideo ? 'Uploading...' : 'Upload Video File'}
                    <input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" style={{ display: 'none' }} onChange={handleVideoUpload} disabled={uploadingVideo} />
                  </label>

                  <input
                    type="text"
                    value={formData.video_url.startsWith('http') ? formData.video_url : ''}
                    onChange={(e) => handleInputChange('video_url', e.target.value)}
                    placeholder="Or paste external video URL..."
                    style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                  />

                  {formData.video_url && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={handleRemoveVideo}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Recommended: MP4 format, 720p resolution, size 10-15MB (Max: 25MB limit). For larger files, upload to YouTube/Vimeo and paste the external URL.
                </span>
              </div>
            </div>
          </div>

          {/* Exhibition Type Selection (Solo vs Group) */}
          <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', fontWeight: 700 }}>
              Exhibition Type
            </label>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="show_type"
                  value="solo"
                  checked={formData.show_type === 'solo'}
                  onChange={() => {
                    setFormData(prev => ({ ...prev, show_type: 'solo', group_artist_ids: [], artist_id: '', artwork_ids: [] }));
                  }}
                  style={{ accentColor: 'var(--accent-gold)' }}
                />
                Solo Show
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="show_type"
                  value="group"
                  checked={formData.show_type === 'group'}
                  onChange={() => {
                    setFormData(prev => ({ ...prev, show_type: 'group', artist_id: '', group_artist_ids: [], artwork_ids: [] }));
                  }}
                  style={{ accentColor: 'var(--accent-gold)' }}
                />
                Group Show
              </label>
            </div>
          </div>

          {/* Artist Selector / Multi-Selector */}
          <div style={{ gridColumn: 'span 2' }}>
            {formData.show_type === 'solo' ? (
              <>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Select Artist <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {loadingArtists ? (
                  <div style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader className="animate-spin" size={14} /> Loading artists list...
                  </div>
                ) : (
                  <select
                    value={formData.artist_id}
                    onChange={(e) => handleArtistChange(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="">-- Choose an Artist --</option>
                    {artists.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.first_name} {a.last_name} ({a.email || 'No email'})
                      </option>
                    ))}
                  </select>
                )}
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Select Participating Artists <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {loadingArtists ? (
                  <div style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader className="animate-spin" size={14} /> Loading artists list...
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={artistSearchQuery}
                      onChange={(e) => setArtistSearchQuery(e.target.value)}
                      placeholder="🔍 Type to search artists by name..."
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.8rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        marginBottom: '0.75rem',
                        outline: 'none'
                      }}
                    />
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '0.85rem',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-input)'
                    }}>
                      {artists.filter(a => {
                        const fullName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
                        return fullName.includes(artistSearchQuery.toLowerCase());
                      }).map(a => {
                        const isChecked = formData.group_artist_ids.includes(a.id);
                        const artistProfileImg = a.profile_image
                          ? getApiUrl(`/api/artists/profile-image/${a.profile_image}`)
                          : 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=50';
                        return (
                          <div
                            key={a.id}
                            onClick={() => toggleGroupArtistSelection(a.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: `1px solid ${isChecked ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)'}`,
                              background: isChecked ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255,255,255,0.01)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', color: isChecked ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                              {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                            </div>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#111', flexShrink: 0 }}>
                              <img
                                src={artistProfileImg}
                                alt={a.first_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=50'; }}
                              />
                            </div>
                            <span style={{
                              fontSize: '0.8rem',
                              color: isChecked ? '#fff' : 'var(--text-secondary)',
                              fontWeight: isChecked ? 600 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {a.first_name} {a.last_name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

        </div>

        {/* Selected Artist's Artworks Selection Workspace */}
        {formData.artist_id && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-gold)', margin: 0, fontWeight: 700 }}>
                Select Artworks for Exhibition ({formData.artwork_ids.length} selected)
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    const allIds = artworks.map(art => art.id);
                    handleInputChange('artwork_ids', allIds);
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => handleInputChange('artwork_ids', [])}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {loadingArtworks ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--accent-gold)', gap: '0.5rem', alignItems: 'center' }}>
                <Loader className="animate-spin" size={18} /> Fetching artist's portfolio...
              </div>
            ) : artworks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                No artworks found in this artist's inventory.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* 1. NEW WORK DIV */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>🆕 New Work</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({newArtworks.length} items)</span>
                  </h4>
                  {newArtworks.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem 0', fontStyle: 'italic' }}>
                      No new artworks available for this artist.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      {newArtworks.map(renderArtworkCard)}
                    </div>
                  )}
                </div>

                {/* 2. OLD WORK DIV */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>🏛️ Old Work (Previously Exhibited)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({oldArtworks.length} items)</span>
                  </h4>
                  {oldArtworks.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                      No previously exhibited artworks found.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {oldArtworks.map(renderArtworkCard)}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* Buttons footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {saving ? <Loader className="animate-spin" size={14} /> : <Save size={14} />}
            {saving ? 'Saving...' : (isEdit ? 'Update Exhibition' : 'Publish Exhibition')}
          </button>
        </div>

      </form>
    </div>
  );
}
