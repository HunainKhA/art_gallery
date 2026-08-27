import React, { useState, useEffect } from 'react';
import { fetchWebsiteSettings, saveWebsiteSettings, getApiUrl } from '../services/api';
import { Loader, Globe, Eye, EyeOff, ShoppingCart, Check, AlertCircle, Settings, Upload } from 'lucide-react';

const SlashedIcon = ({ children, slashed }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
    {slashed && (
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '2px',
        backgroundColor: '#ef4444',
        transform: 'rotate(-45deg)',
        borderRadius: '1px',
        boxShadow: '0 0 2px rgba(0,0,0,0.5)'
      }} />
    )}
  </div>
);

export default function WebsiteSettingsSection() {
  const [settings, setSettings] = useState({
    hide_prices: false,
    hide_add_to_cart: false
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [sigVersion, setSigVersion] = useState(Date.now());

  const loadSettings = () => {
    setLoading(true);
    fetchWebsiteSettings()
      .then(data => {
        setSettings(data);
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

  const handleTogglePrices = async () => {
    const nextVal = !settings.hide_prices;
    const updated = { ...settings, hide_prices: nextVal };
    setSettings(updated);
    try {
      await saveWebsiteSettings(updated);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to save price visibility change.' });
      setSettings(settings); // Rollback
    }
  };

  const handleToggleCart = async () => {
    const nextVal = !settings.hide_add_to_cart;
    const updated = { ...settings, hide_add_to_cart: nextVal };
    setSettings(updated);
    try {
      await saveWebsiteSettings(updated);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Failed to save cart visibility change.' });
      setSettings(settings); // Rollback
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSignature(true);

    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch(getApiUrl('/api/artworks/upload-signature'), {
      method: 'POST',
      body: uploadData
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then(result => {
        setUploadingSignature(false);
        if (result.success) {
          setFeedback({ type: 'success', message: 'Owner signature uploaded successfully!' });
          setSigVersion(Date.now());
        }
      })
      .catch(err => {
        setUploadingSignature(false);
        setFeedback({ type: 'error', message: 'Failed to upload signature: ' + err.message });
      });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Loader className="spin-animation" size={32} color="var(--accent-gold)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
      <div>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={22} color="var(--accent-gold)" /> Website Display Controls
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Manage global visibility settings for artwork prices and cart actions on the public gallery website.
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Hide Prices Control Option */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1.25rem', 
          backgroundColor: 'rgba(255, 255, 255, 0.01)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '10px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, paddingRight: '1rem' }}>
            <div style={{ 
              padding: '8px', 
              backgroundColor: settings.hide_prices ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
              borderRadius: '8px', 
              color: settings.hide_prices ? 'var(--accent-red, #ef4444)' : 'var(--accent-green, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}>
              {settings.hide_prices ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Hide Artwork Prices</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Hides all pricing tags and currency symbols across the public collections and details pages.
              </div>
            </div>
          </div>
          
          {/* Switch Toggle */}
          <button 
            type="button"
            onClick={handleTogglePrices}
            style={{
              width: '50px',
              height: '26px',
              borderRadius: '13px',
              backgroundColor: settings.hide_prices ? 'var(--accent-gold)' : 'rgba(120, 120, 128, 0.25)',
              border: '1px solid var(--border-color)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              padding: 0
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              position: 'absolute',
              top: '3px',
              left: settings.hide_prices ? '27px' : '3px',
              transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(0, 0, 0, 0.08)'
            }} />
          </button>
        </div>

        {/* Hide Add to Cart Control Option */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1.25rem', 
          backgroundColor: 'rgba(255, 255, 255, 0.01)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '10px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, paddingRight: '1rem' }}>
            <div style={{ 
              padding: '8px', 
              backgroundColor: settings.hide_add_to_cart ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
              borderRadius: '8px', 
              color: settings.hide_add_to_cart ? 'var(--accent-red, #ef4444)' : 'var(--accent-green, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}>
              <SlashedIcon slashed={settings.hide_add_to_cart}>
                <ShoppingCart size={20} />
              </SlashedIcon>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Hide "Add to Cart" Button</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Disables online checkouts by hiding purchase buttons on the artwork details view.
              </div>
            </div>
          </div>
          
          {/* Switch Toggle */}
          <button 
            type="button"
            onClick={handleToggleCart}
            style={{
              width: '50px',
              height: '26px',
              borderRadius: '13px',
              backgroundColor: settings.hide_add_to_cart ? 'var(--accent-gold)' : 'rgba(120, 120, 128, 0.25)',
              border: '1px solid var(--border-color)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              padding: 0
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              position: 'absolute',
              top: '3px',
              left: settings.hide_add_to_cart ? '27px' : '3px',
              transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(0, 0, 0, 0.08)'
            }} />
          </button>
        </div>

        {/* Upload Owner Signature Option */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '12px',
          padding: '1.25rem', 
          backgroundColor: 'rgba(255, 255, 255, 0.01)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '10px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ 
              padding: '8px', 
              backgroundColor: 'rgba(212, 175, 55, 0.08)', 
              borderRadius: '8px', 
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Upload size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Owner Signature Image</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Upload the owner's signature image to overlay on the authenticity certificates (PNG/JPG/SVG).
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px' }}>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleSignatureUpload}
              disabled={uploadingSignature}
              style={{ display: 'none' }}
              id="signature-file-input"
            />
            <label 
              htmlFor="signature-file-input"
              className="pagination-btn"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid var(--border-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff'
              }}
            >
              {uploadingSignature ? 'Uploading...' : 'Upload Signature'}
            </label>
            
            <img 
              src={getApiUrl(`/api/artworks/signature?t=${sigVersion}`)} 
              alt="Current Signature"
              onError={(e) => { e.target.style.display = 'none'; }}
              onLoad={(e) => { e.target.style.display = 'block'; }}
              style={{ height: '40px', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
        </div>

      </div>

      {/* Auto Save indicator */}
      <div style={{ 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)', 
        textAlign: 'center', 
        marginTop: '0.5rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <Globe size={14} color="var(--accent-gold)" /> Settings are saved and updated on the website in real-time.
      </div>

    </div>
  );
}
