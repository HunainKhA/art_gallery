import React, { useState, useEffect } from 'react';
import { fetchBannerConfig, saveBannerConfig, uploadBannerImage, getBannerImageUrl } from '../services/api';
import { Loader, Upload, RefreshCw, Check, Save, Image, Palette, FileText } from 'lucide-react';

export default function ExhibitionsBannerSection() {
  const [config, setConfig] = useState({
    mode: 'template',
    title: 'WE DELIVER ARTWORKS WORLD WIDE.',
    subtitle: 'FREE DELIVERY ALL OVER PAKISTAN.',
    bgColor: '#ffffff',
    textColor: '#8fa499',
    subtitleColor: '#cfa15c',
    borderColor: '#8fa499',
    hasPlaneIllustration: true,
    customImage: '',
    illustrationImage: 'default_pakistan_airplane_map.png'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadConfig = () => {
    setLoading(true);
    fetchBannerConfig()
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading banner config:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveBannerConfig(config);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Banner design updated successfully.' });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to save configuration.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to connect to the server.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the banner to the default delivery design?")) {
      setConfig({
        mode: 'template',
        title: 'WE DELIVER ARTWORKS WORLD WIDE.',
        subtitle: 'FREE DELIVERY ALL OVER PAKISTAN.',
        bgColor: '#ffffff',
        textColor: '#8fa499',
        subtitleColor: '#cfa15c',
        borderColor: '#8fa499',
        hasPlaneIllustration: true,
        customImage: '',
        illustrationImage: 'default_pakistan_airplane_map.png'
      });
      setFeedback({ type: 'success', message: 'Reset to default values. Don\'t forget to click Save.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadBannerImage(file);
      if (res.success && res.filename) {
        setConfig(prev => ({
          ...prev,
          [type]: res.filename
        }));
        setFeedback({ type: 'success', message: 'Image uploaded successfully.' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload image to server.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '350px', gap: '1rem' }}>
        <Loader className="animate-spin" size={36} color="var(--accent-gold)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading banner designer config...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Feedback Alert */}
      {feedback && (
        <div 
          className="glass-card" 
          style={{ 
            padding: '1rem 1.5rem', 
            marginBottom: '2rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            borderLeft: feedback.type === 'success' ? '4px solid var(--accent-green)' : '4px solid var(--accent-red)',
            animation: 'slideDown 0.3s ease'
          }}
        >
          <Check color={feedback.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'} size={20} />
          <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>{feedback.message}</p>
        </div>
      )}

      {/* Two-Column Designer Workspace */}
      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }} className="designer-workspace">
        
        {/* LEFT COLUMN: Controls */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Layout Mode */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} color="var(--accent-gold)" /> 1. Select Layout Mode
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* Template Mode Card */}
              <div 
                onClick={() => setConfig(prev => ({ ...prev, mode: 'template' }))}
                style={{
                  border: config.mode === 'template' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                  backgroundColor: config.mode === 'template' ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
                className="mode-card"
              >
                <FileText size={28} color={config.mode === 'template' ? 'var(--accent-gold)' : 'var(--text-secondary)'} style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ color: '#fff', margin: '0 0 0.25rem 0', fontWeight: 600 }}>CSS Template</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Customizable texts, colors & illustration</p>
              </div>

              {/* Custom Image Mode Card */}
              <div 
                onClick={() => setConfig(prev => ({ ...prev, mode: 'custom' }))}
                style={{
                  border: config.mode === 'custom' ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                  backgroundColor: config.mode === 'custom' ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
                className="mode-card"
              >
                <Image size={28} color={config.mode === 'custom' ? 'var(--accent-gold)' : 'var(--text-secondary)'} style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ color: '#fff', margin: '0 0 0.25rem 0', fontWeight: 600 }}>Custom Graphic</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Upload a complete pre-designed banner image</p>
              </div>

            </div>
          </div>

          {/* Section 2: Layout Configuration Settings */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} color="var(--accent-gold)" /> 2. Banner Settings
            </h3>

            {config.mode === 'template' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Texts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Title Text</label>
                  <input 
                    type="text" 
                    value={config.title}
                    onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem'
                    }}
                    placeholder="Enter main banner text..."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Subtitle Text</label>
                  <input 
                    type="text" 
                    value={config.subtitle}
                    onChange={(e) => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      color: '#fff',
                      fontSize: '0.95rem'
                    }}
                    placeholder="Enter subtitle banner text..."
                  />
                </div>

                {/* Colors Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Background Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={config.bgColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                        style={{ width: '42px', height: '42px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        value={config.bgColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                        style={{ flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.75rem', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Border Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={config.borderColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                        style={{ width: '42px', height: '42px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        value={config.borderColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                        style={{ flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.75rem', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Title Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={config.textColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
                        style={{ width: '42px', height: '42px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        value={config.textColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
                        style={{ flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.75rem', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Subtitle Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="color" 
                        value={config.subtitleColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitleColor: e.target.value }))}
                        style={{ width: '42px', height: '42px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <input 
                        type="text" 
                        value={config.subtitleColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, subtitleColor: e.target.value }))}
                        style={{ flex: 1, backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 0.75rem', color: '#fff', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                </div>

                {/* Plane Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="hasPlane" 
                    checked={config.hasPlaneIllustration}
                    onChange={(e) => setConfig(prev => ({ ...prev, hasPlaneIllustration: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="hasPlane" style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}>
                    Show Airplane Map Illustration
                  </label>
                </div>

                {/* Custom Illustration Upload */}
                {config.hasPlaneIllustration && (
                  <div style={{ border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Change Illustration Image (Optional)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.6rem 1.25rem',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                        className="file-upload-label"
                      >
                        <Upload size={16} />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, 'illustrationImage')} 
                          style={{ display: 'none' }}
                          disabled={uploading}
                        />
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {config.illustrationImage === 'default_pakistan_airplane_map.png' ? 'Default Plane Map' : config.illustrationImage}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Custom Banner Image Upload */}
                <div style={{ border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Image size={40} color="var(--text-secondary)" style={{ margin: '0 auto' }} />
                  <div>
                    <h4 style={{ color: '#fff', margin: '0 0 0.25rem 0' }}>Upload Custom Banner Graphic</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Recommended size: 1200x260 pixels (PNG, JPG, WEBP)</p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <label 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--accent-gold)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#000',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        transition: 'all 0.2s'
                      }}
                      className="file-upload-label"
                    >
                      <Upload size={16} />
                      {uploading ? 'Uploading...' : 'Choose Banner Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'customImage')} 
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  {config.customImage && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 500 }}>
                      Current file: {config.customImage}
                    </span>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleSave} 
              disabled={saving || uploading}
              className="btn-primary"
              style={{
                flex: 2,
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '8px'
              }}
            >
              {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            <button 
              onClick={handleReset} 
              disabled={saving || uploading}
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                borderRadius: '8px'
              }}
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Sticky Preview */}
        <div style={{ flex: '1 1 450px', position: 'relative' }}>
          <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              Live Preview
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              This is how the delivery banner will render at the top of the Exhibitions page.
            </p>

            {/* Banner Container */}
            <div 
              style={{
                backgroundColor: config.bgColor || '#ffffff',
                borderColor: config.borderColor || '#8fa499',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 2rem',
                borderRadius: '12px',
                border: `3px double ${config.borderColor || '#8fa499'}`,
                position: 'relative',
                overflow: 'hidden',
                gap: '1.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                minHeight: '140px',
                transition: 'all 0.3s ease'
              }}
            >
              {config.mode === 'custom' && config.customImage ? (
                <img 
                  src={getBannerImageUrl(config.customImage)} 
                  alt="Custom Graphic Preview" 
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    maxHeight: '180px',
                    objectFit: 'contain',
                    borderRadius: '6px'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1579783902882-c0d3dad7b119?w=800&text=Custom+Banner+Image+Placeholder';
                  }}
                />
              ) : (
                <>
                  {/* Left Column Texts */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h2 
                      style={{ 
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '1.4rem', 
                        fontWeight: '800', 
                        color: config.textColor || '#8fa499', 
                        margin: 0,
                        letterSpacing: '0.04em',
                        lineHeight: '1.25'
                      }}
                    >
                      {config.title || 'WE DELIVER ARTWORKS WORLD WIDE.'}
                    </h2>
                    <p 
                      style={{ 
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '0.95rem', 
                        fontWeight: '700', 
                        color: config.subtitleColor || '#cfa15c', 
                        margin: 0,
                        letterSpacing: '0.02em'
                      }}
                    >
                      {config.subtitle || 'FREE DELIVERY ALL OVER PAKISTAN.'}
                    </p>
                  </div>

                  {/* Right Column Illustration */}
                  {config.hasPlaneIllustration && (
                    <div style={{ flexShrink: 0, height: '110px', display: 'flex', alignItems: 'center' }}>
                      <img 
                        src={getBannerImageUrl(config.illustrationImage || 'default_pakistan_airplane_map.png')} 
                        alt="Illustration Preview" 
                        style={{
                          height: '100%',
                          width: 'auto',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Hint Box */}
            <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-gold)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Pro Tip</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
                For a perfect match with the gallery branding, we recommend using capital letters for texts and matching the **Border Color** with the **Title Color**.
              </p>
            </div>

          </div>
        </div>

      </div>

      <style>{`
        .mode-card:hover {
          border-color: var(--accent-gold) !important;
          background-color: rgba(212, 175, 55, 0.02) !important;
        }
        .file-upload-label:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        @media (max-width: 992px) {
          .designer-workspace {
            flex-direction: column-reverse !important;
          }
        }
      `}</style>

    </div>
  );
}
