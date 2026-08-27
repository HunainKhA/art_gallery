import React, { useState, useEffect } from 'react';
import { fetchWebsiteSettings, saveWebsiteSettings, getApiUrl } from '../services/api';
import { Loader, Check, AlertCircle, FileText, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function AboutSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [savingAbout, setSavingAbout] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Settings parent state for saving
  const [settings, setSettings] = useState({});

  // About Us Content States
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutSubtitle, setAboutSubtitle] = useState('');
  const [aboutStoryTitle, setAboutStoryTitle] = useState('');
  const [aboutStoryContent, setAboutStoryContent] = useState('');
  const [aboutFramingTitle, setAboutFramingTitle] = useState('');
  const [aboutFramingContent, setAboutFramingContent] = useState('');
  
  // Vision & Mission States
  const [aboutVisionTitle, setAboutVisionTitle] = useState('');
  const [aboutVisionContent, setAboutVisionContent] = useState('');
  const [aboutMissionTitle, setAboutMissionTitle] = useState('');
  const [aboutMissionContent, setAboutMissionContent] = useState('');
  
  // About Us Image States
  const [aboutStoryImage, setAboutStoryImage] = useState('');
  const [aboutFramingImage, setAboutFramingImage] = useState('');
  const [aboutVisionImage, setAboutVisionImage] = useState('');
  const [aboutMissionImage, setAboutMissionImage] = useState('');
  
  const [uploadingStoryImage, setUploadingStoryImage] = useState(false);
  const [uploadingFramingImage, setUploadingFramingImage] = useState(false);
  const [uploadingVisionImage, setUploadingVisionImage] = useState(false);
  const [uploadingMissionImage, setUploadingMissionImage] = useState(false);
  
  // Image History State
  const [historyImages, setHistoryImages] = useState([]);

  const loadHistoryImages = () => {
    fetch(getApiUrl('/api/settings/about/images'))
      .then(res => res.json())
      .then(data => {
        setHistoryImages(data);
      })
      .catch(err => console.error("Error loading history images:", err));
  };

  const loadSettings = () => {
    setLoading(true);
    fetchWebsiteSettings()
      .then(data => {
        setSettings(data);
        setAboutTitle(data.about_title || '');
        setAboutSubtitle(data.about_subtitle || '');
        setAboutStoryTitle(data.about_story_title || '');
        setAboutStoryContent(data.about_story_content || '');
        setAboutFramingTitle(data.about_framing_title || '');
        setAboutFramingContent(data.about_framing_content || '');
        setAboutStoryImage(data.about_story_image || '');
        setAboutFramingImage(data.about_framing_image || '');
        setAboutVisionImage(data.about_vision_image || '');
        setAboutMissionImage(data.about_mission_image || '');
        
        // Populate Vision & Mission
        setAboutVisionTitle(data.about_vision_title || '');
        setAboutVisionContent(data.about_vision_content || '');
        setAboutMissionTitle(data.about_mission_title || '');
        setAboutMissionContent(data.about_mission_content || '');
        
        loadHistoryImages();
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading settings:", err);
        setFeedback({ type: 'error', message: 'Failed to load website settings.' });
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleImageUpload = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    if (target === 'story') {
      setUploadingStoryImage(true);
    } else if (target === 'framing') {
      setUploadingFramingImage(true);
    } else if (target === 'vision') {
      setUploadingVisionImage(true);
    } else if (target === 'mission') {
      setUploadingMissionImage(true);
    }

    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch(getApiUrl('/api/settings/about/upload'), {
      method: 'POST',
      body: uploadData
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then(result => {
        if (target === 'story') {
          setUploadingStoryImage(false);
          if (result.success) {
            setAboutStoryImage(result.filename);
            setFeedback({ type: 'success', message: 'Story image uploaded! Save changes to finalize.' });
            loadHistoryImages();
          }
        } else if (target === 'framing') {
          setUploadingFramingImage(false);
          if (result.success) {
            setAboutFramingImage(result.filename);
            setFeedback({ type: 'success', message: 'Journey image uploaded! Save changes to finalize.' });
            loadHistoryImages();
          }
        } else if (target === 'vision') {
          setUploadingVisionImage(false);
          if (result.success) {
            setAboutVisionImage(result.filename);
            setFeedback({ type: 'success', message: 'Vision image uploaded! Save changes to finalize.' });
            loadHistoryImages();
          }
        } else if (target === 'mission') {
          setUploadingMissionImage(false);
          if (result.success) {
            setAboutMissionImage(result.filename);
            setFeedback({ type: 'success', message: 'Mission image uploaded! Save changes to finalize.' });
            loadHistoryImages();
          }
        }
      })
      .catch(err => {
        if (target === 'story') setUploadingStoryImage(false);
        else if (target === 'framing') setUploadingFramingImage(false);
        else if (target === 'vision') setUploadingVisionImage(false);
        else if (target === 'mission') setUploadingMissionImage(false);
        setFeedback({ type: 'error', message: 'Failed to upload image: ' + err.message });
      });
  };

  const handleDeleteImage = (filename) => {
    if (!window.confirm("Are you sure you want to permanently delete this image from server history?")) return;
    
    fetch(getApiUrl(`/api/settings/about/image/${filename}`), {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setFeedback({ type: 'success', message: 'Image deleted successfully from history!' });
          // If the deleted image was active, clear it
          if (aboutStoryImage === filename) setAboutStoryImage('');
          if (aboutFramingImage === filename) setAboutFramingImage('');
          if (aboutVisionImage === filename) setAboutVisionImage('');
          if (aboutMissionImage === filename) setAboutMissionImage('');
          // Refresh list
          loadHistoryImages();
        } else {
          throw new Error(result.detail || "Delete failed");
        }
      })
      .catch(err => {
        console.error(err);
        setFeedback({ type: 'error', message: 'Failed to delete image: ' + err.message });
      });
  };

  const handleSaveAboutContent = async (e) => {
    e.preventDefault();
    setSavingAbout(true);
    setFeedback(null);
    
    const updated = {
      ...settings,
      about_title: aboutTitle,
      about_subtitle: aboutSubtitle,
      about_story_title: aboutStoryTitle,
      about_story_content: aboutStoryContent,
      about_framing_title: aboutFramingTitle,
      about_framing_content: aboutFramingContent,
      about_story_image: aboutStoryImage,
      about_framing_image: aboutFramingImage,
      about_vision_title: aboutVisionTitle,
      about_vision_content: aboutVisionContent,
      about_mission_title: aboutMissionTitle,
      about_mission_content: aboutMissionContent,
      about_vision_image: aboutVisionImage,
      about_mission_image: aboutMissionImage
    };
    
    try {
      await saveWebsiteSettings(updated);
      setSettings(updated);
      setFeedback({ type: 'success', message: 'About Us page content and images updated successfully!' });
      loadHistoryImages();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to save About Us content: ' + err.message });
    } finally {
      setSavingAbout(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader className="spin-animation" size={32} color="var(--accent-gold)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading About Us settings...</span>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
      <div>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={22} color="var(--accent-gold)" /> Edit About Us Page
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Manage dynamic content, stories, images, and service descriptions shown on the public "About Us" section.
        </p>
      </div>

      {feedback && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          borderLeft: `4px solid ${feedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`, 
          padding: '0.75rem 1.25rem', 
          borderRadius: '8px' 
        }}>
          {feedback.type === 'success' ? <Check size={16} color="var(--accent-green)" /> : <AlertCircle size={16} color="var(--accent-red)" />}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSaveAboutContent} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        

        {/* Section 1: Our Story */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1rem' }}>Section 1: Our Story</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Heading</label>
            <input 
              type="text" 
              value={aboutStoryTitle} 
              onChange={(e) => setAboutStoryTitle(e.target.value)}
              style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Description</label>
            <textarea 
              rows="5"
              value={aboutStoryContent} 
              onChange={(e) => setAboutStoryContent(e.target.value)}
              style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Story Image Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Section Image (Our Story)</label>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'story')}
                disabled={uploadingStoryImage}
                style={{ display: 'none' }}
                id="story-image-input"
              />
              <label 
                htmlFor="story-image-input"
                className="pagination-btn"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff'
                }}
              >
                <Upload size={14} />
                {uploadingStoryImage ? 'Uploading...' : 'Choose Image'}
              </label>

              {aboutStoryImage ? (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img 
                    src={getApiUrl(`/api/settings/image/${aboutStoryImage}`)} 
                    alt="Story Section"
                    style={{ height: '50px', width: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{aboutStoryImage}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <ImageIcon size={14} /> No image uploaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Our Journey */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1rem' }}>Section 2: Our Journey</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Heading</label>
            <input 
              type="text" 
              value={aboutFramingTitle} 
              onChange={(e) => setAboutFramingTitle(e.target.value)}
              style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Description</label>
            <textarea 
              rows="5"
              value={aboutFramingContent} 
              onChange={(e) => setAboutFramingContent(e.target.value)}
              style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Framing Image Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Section Image (Our Journey)</label>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'framing')}
                disabled={uploadingFramingImage}
                style={{ display: 'none' }}
                id="framing-image-input"
              />
              <label 
                htmlFor="framing-image-input"
                className="pagination-btn"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff'
                }}
              >
                <Upload size={14} />
                {uploadingFramingImage ? 'Uploading...' : 'Choose Image'}
              </label>

              {aboutFramingImage ? (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <img 
                     src={getApiUrl(`/api/settings/image/${aboutFramingImage}`)} 
                     alt="Journey Section"
                     style={{ height: '50px', width: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                   />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{aboutFramingImage}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <ImageIcon size={14} /> No image uploaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Vision & Mission */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1rem' }}>Section 3: Vision & Mission</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vision Heading</label>
              <input 
                type="text" 
                value={aboutVisionTitle} 
                onChange={(e) => setAboutVisionTitle(e.target.value)}
                style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mission Heading</label>
              <input 
                type="text" 
                value={aboutMissionTitle} 
                onChange={(e) => setAboutMissionTitle(e.target.value)}
                style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vision Description</label>
              <textarea 
                rows="4"
                value={aboutVisionContent} 
                onChange={(e) => setAboutVisionContent(e.target.value)}
                style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mission Description</label>
              <textarea 
                rows="4"
                value={aboutMissionContent} 
                onChange={(e) => setAboutMissionContent(e.target.value)}
                style={{ padding: '0.7rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Vision & Mission Images Upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Vision Image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vision Section Image</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'vision')}
                  disabled={uploadingVisionImage}
                  style={{ display: 'none' }}
                  id="vision-image-input"
                />
                <label 
                  htmlFor="vision-image-input"
                  className="pagination-btn"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff'
                  }}
                >
                  <Upload size={14} />
                  {uploadingVisionImage ? 'Uploading...' : 'Choose Image'}
                </label>
                {aboutVisionImage ? (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={getApiUrl(`/api/settings/image/${aboutVisionImage}`)} 
                      alt="Vision Section"
                      style={{ height: '50px', width: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{aboutVisionImage}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <ImageIcon size={14} /> No image uploaded
                  </div>
                )}
              </div>
            </div>

            {/* Mission Image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mission Section Image</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'mission')}
                  disabled={uploadingMissionImage}
                  style={{ display: 'none' }}
                  id="mission-image-input"
                />
                <label 
                  htmlFor="mission-image-input"
                  className="pagination-btn"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff'
                  }}
                >
                  <Upload size={14} />
                  {uploadingMissionImage ? 'Uploading...' : 'Choose Image'}
                </label>
                {aboutMissionImage ? (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={getApiUrl(`/api/settings/image/${aboutMissionImage}`)} 
                      alt="Mission Section"
                      style={{ height: '50px', width: '70px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{aboutMissionImage}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <ImageIcon size={14} /> No image uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Upload History Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1rem' }}>Section 4: Upload History</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
            Select any previously uploaded image to set it for either "Our Story" or "Our Journey", or delete it permanently from history.
          </p>

          {historyImages.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
              gap: '1rem',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              {historyImages.map(filename => (
                <div 
                  key={filename} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px',
                    padding: '6px',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'transform 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {/* Delete button at top-right */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(filename)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(239, 68, 68, 0.9)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                      transition: 'background-color 0.2s ease',
                      zIndex: 5
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'; }}
                    title="Delete Image"
                  >
                    <Trash2 size={12} />
                  </button>

                  <img 
                    src={getApiUrl(`/api/settings/image/${filename}`)} 
                    alt="History item" 
                    style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', width: '100%', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setAboutStoryImage(filename);
                        setFeedback({ type: 'success', message: 'Set as Story image! Save changes to finalize.' });
                      }}
                      style={{ 
                        flex: '1 1 calc(50% - 2px)', 
                        fontSize: '0.65rem', 
                        padding: '4px 2px', 
                        borderRadius: '4px', 
                        background: aboutStoryImage === filename ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                        color: aboutStoryImage === filename ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Story
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setAboutFramingImage(filename);
                        setFeedback({ type: 'success', message: 'Set as Journey image! Save changes to finalize.' });
                      }}
                      style={{ 
                        flex: '1 1 calc(50% - 2px)', 
                        fontSize: '0.65rem', 
                        padding: '4px 2px', 
                        borderRadius: '4px', 
                        background: aboutFramingImage === filename ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                        color: aboutFramingImage === filename ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Journey
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setAboutVisionImage(filename);
                        setFeedback({ type: 'success', message: 'Set as Vision image! Save changes to finalize.' });
                      }}
                      style={{ 
                        flex: '1 1 calc(50% - 2px)', 
                        fontSize: '0.65rem', 
                        padding: '4px 2px', 
                        borderRadius: '4px', 
                        background: aboutVisionImage === filename ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                        color: aboutVisionImage === filename ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Vision
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setAboutMissionImage(filename);
                        setFeedback({ type: 'success', message: 'Set as Mission image! Save changes to finalize.' });
                      }}
                      style={{ 
                        flex: '1 1 calc(50% - 2px)', 
                        fontSize: '0.65rem', 
                        padding: '4px 2px', 
                        borderRadius: '4px', 
                        background: aboutMissionImage === filename ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                        color: aboutMissionImage === filename ? '#000' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Mission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              No upload history found. Upload a new image above to start history.
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={savingAbout}
          style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem', borderRadius: '8px', alignSelf: 'stretch', marginTop: '1rem', fontWeight: 600 }}
        >
          {savingAbout ? 'Saving Content...' : 'Save About Us Content'}
        </button>
      </form>
    </div>
  );
}
