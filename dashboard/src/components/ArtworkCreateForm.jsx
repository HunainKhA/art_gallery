import React, { useState, useEffect } from 'react';
import { Plus, Upload, Calculator, Image as ImageIcon } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function ArtworkCreateForm({ onSuccess, onCancel, editRecord = null }) {
  const isEdit = !!editRecord;

  const [formData, setFormData] = useState({
    title: '',
    artist_id: '',
    category_id: '',
    medium_id: '',
    length: '',
    width: '',
    deal_type: 'Sale_Basis',
    status: 'Available',
    purchase_price: '',
    price: '',
    commission_pct: 40,
    discount: '',
    code: '',
    with_frame: '0',
    frame_charges: 0,
    description: '',
    image: '',
    authenticity_letter: 'auto'
  });

  const [lookups, setLookups] = useState({
    artists: [],
    categories: [],
    mediums: []
  });

  const [galleryShare, setGalleryShare] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [netPayableToArtist, setNetPayableToArtist] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  // Load Lookups
  useEffect(() => {
    Promise.all([
      fetch(getApiUrl('/api/artists')).then(r => r.json()).catch(() => []),
      fetch(getApiUrl('/api/collection-types')).then(r => r.json()).catch(() => []),
      fetch(getApiUrl('/api/mediums')).then(r => r.json()).catch(() => [])
    ]).then(([artistsData, categoriesData, mediumsData]) => {
      setLookups({
        artists: Array.isArray(artistsData) ? artistsData : [],
        categories: Array.isArray(categoriesData) ? categoriesData : [],
        mediums: Array.isArray(mediumsData) ? mediumsData : []
      });

      // Set default category if not editing
      if (!editRecord && Array.isArray(categoriesData) && categoriesData.length > 0) {
        const defaultCat = categoriesData.find(c => c.name?.toLowerCase().includes('painting')) || categoriesData[0];
        if (defaultCat) {
          setFormData(prev => ({ ...prev, category_id: prev.category_id || defaultCat.id }));
        }
      }
      if (!editRecord && Array.isArray(mediumsData) && mediumsData.length > 0) {
        setFormData(prev => ({ ...prev, medium_id: prev.medium_id || mediumsData[0].id }));
      }
    });

    if (editRecord) {
      const pPrice = parseFloat(editRecord.purchase_price_c || editRecord.purchase_price || 0) || '';
      const rPrice = parseFloat(editRecord.sale_gallery_price_c || editRecord.price || 0) || '';
      let comm = 40;
      if (rPrice > 0 && pPrice > 0 && rPrice > pPrice) {
        comm = Math.round(((rPrice - pPrice) / rPrice) * 100);
      }

      let realCode = '';
      const candidates = [editRecord.code, editRecord.document_name, editRecord.title, editRecord.code_c];
      for (const cand of candidates) {
        if (cand && typeof cand === 'string') {
          const val = cand.trim();
          if (val.includes('-') && !/^\d+$/.test(val)) {
            realCode = val;
            break;
          }
        }
      }
      if (!realCode) {
        realCode = editRecord.code || editRecord.document_name || editRecord.title || editRecord.code_c || '';
      }

      setFormData({
        id: editRecord.id,
        title: realCode || editRecord.document_name || editRecord.title || '',
        artist_id: editRecord.artist_id || '',
        category_id: editRecord.category_id || '',
        medium_id: editRecord.medium_id || '',
        length: editRecord.collection_size_length_c || editRecord.length || '',
        width: editRecord.collection_size_width_c || editRecord.width || '',
        deal_type: editRecord.sale_c || editRecord.deal_type || 'Sale_Basis',
        status: editRecord.collection_status || editRecord.status || 'Available',
        purchase_price: pPrice,
        price: rPrice,
        commission_pct: comm,
        code: realCode,
        with_frame: editRecord.with_frame_c || editRecord.with_frame || '0',
        frame_charges: editRecord.frame_charges_c || editRecord.frame_charges || 0,
        description: editRecord.description || '',
        image: editRecord.filename || editRecord.image || '',
        authenticity_letter: editRecord.authenticity_letter_field_c || 'auto'
      });

      if (pPrice > 0) {
        const ch = Math.round(pPrice * (comm / 100));
        setGalleryShare(ch);
        setNetPayableToArtist(pPrice - ch);
      }
    }
  }, [editRecord]);

  // Handle Artist Change -> Auto fetch next Artwork Code
  const handleArtistChange = (artistId) => {
    const artistObj = lookups.artists.find(a => a.id === artistId);
    let fallbackPrefix = "ART";
    if (artistObj) {
      const name = (artistObj.name || `${artistObj.first_name || ''} ${artistObj.last_name || ''}`).replace(/['"]/g, '').trim();
      const m = name.match(/^([A-Za-z]\.[A-Za-z])/);
      if (m) {
        fallbackPrefix = m[1].toUpperCase();
      } else {
        const tokens = name.split(/[\s.]+/).filter(Boolean);
        if (tokens.length >= 2 && tokens[0].length === 1 && tokens[1].length === 1) {
          fallbackPrefix = `${tokens[0]}.${tokens[1]}`.toUpperCase();
        } else if (tokens.length >= 1 && tokens[0].length >= 3) {
          fallbackPrefix = tokens[0].substring(0, 3).toUpperCase();
        }
      }
    }

    setFormData(prev => ({ 
      ...prev, 
      artist_id: artistId,
      code: '',
      title: ''
    }));

    if (!artistId || isEdit) return;

    setLoadingCode(true);
    fetch(getApiUrl(`/api/artworks/next-code?artist_id=${artistId}`))
      .then(r => r.json())
      .then(data => {
        setLoadingCode(false);
        if (data?.code) {
          setFormData(prev => ({
            ...prev,
            code: data.code,
            title: data.code
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            code: `${fallbackPrefix}-5009`,
            title: `${fallbackPrefix}-5009`
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch next code:", err);
        setLoadingCode(false);
        setFormData(prev => ({
          ...prev,
          code: `${fallbackPrefix}-5009`,
          title: `${fallbackPrefix}-5009`
        }));
      });
  };

  // Pricing Logic (Completely independent Gallery Price & Artist Commission Calculation)
  // 1. Gallery Selling Price (Independent for Dashboard / Website Display)
  const handleGalleryPriceChange = (val) => {
    setFormData(prev => ({ ...prev, price: val }));
  };

  // 2. Artist Quoted Price Change
  const handleArtistPriceChange = (val) => {
    setFormData(prev => ({ ...prev, purchase_price: val }));
    const artistAmt = parseFloat(val) || 0;
    const commPct = parseFloat(formData.commission_pct) || 40;
    if (artistAmt > 0) {
      const charges = Math.round(artistAmt * (commPct / 100));
      setGalleryShare(charges);
      setNetPayableToArtist(artistAmt - charges);
    } else {
      setGalleryShare(0);
      setNetPayableToArtist(0);
    }
  };

  // 3. Commission % Change on Artist Price
  const handleCommissionPctChange = (val) => {
    setFormData(prev => ({ ...prev, commission_pct: val }));
    const commPct = parseFloat(val) || 0;
    const artistAmt = parseFloat(formData.purchase_price) || 0;
    if (artistAmt > 0) {
      const charges = Math.round(artistAmt * (commPct / 100));
      setGalleryShare(charges);
      setNetPayableToArtist(artistAmt - charges);
    } else {
      setGalleryShare(0);
      setNetPayableToArtist(0);
    }
  };

  // 4. Discount % Change
  const handleDiscountChange = (discVal) => {
    const discPct = parseFloat(discVal) || 0;
    setFormData(prev => ({ ...prev, discount: discVal }));
    const artistAmt = parseFloat(formData.purchase_price) || 0;
    if (artistAmt > 0 && discPct > 0) {
      setDiscountAmount(Math.round(artistAmt * (discPct / 100)));
    } else {
      setDiscountAmount(0);
    }
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.artist_id) {
      alert("Please select an Artist.");
      return;
    }

    setSaving(true);
    const finalPayload = {
      ...formData,
      title: formData.code || formData.title || 'Artwork',
      purchase_price: parseFloat(formData.purchase_price) || 0,
      price: parseFloat(formData.price) || 0,
      length: parseFloat(formData.length) || 0,
      width: parseFloat(formData.width) || 0,
      frame_charges: parseFloat(formData.frame_charges) || 0
    };

    const endpoint = isEdit ? `/api/artworks/${formData.id}` : '/api/artworks';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(getApiUrl(endpoint), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save artwork.");
        return res.json();
      })
      .then(() => {
        setSaving(false);
        alert(`Artwork ${isEdit ? 'updated' : 'created'} successfully!`);
        if (onSuccess) onSuccess();
      })
      .catch(err => {
        setSaving(false);
        alert("Error saving artwork: " + err.message);
      });
  };

  const imageUrl = formData.image
    ? (formData.image.startsWith('http') ? formData.image : getApiUrl(`/api/artworks/image/${formData.image}`))
    : null;

  return (
    <div className="glass-card" style={{ padding: '2rem 2.5rem', maxWidth: '1150px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Plus size={22} /> {isEdit ? 'Update Artwork' : 'Create Artwork'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        
        {/* ROW 1: Artist | Length (inches) | Width (inches) */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Artist *
            </label>
            <select
              value={formData.artist_id}
              onChange={(e) => handleArtistChange(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            >
              <option value="">-- Select Artist * --</option>
              {lookups.artists.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
              Length (inches)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 24"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
              Width (inches)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 36"
              value={formData.width}
              onChange={(e) => setFormData({ ...formData, width: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* ROW 2: Medium | Deal Type | Status | Artwork Code (auto-filled) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.2fr', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Medium *
            </label>
            <select
              value={formData.medium_id}
              onChange={(e) => setFormData({ ...formData, medium_id: e.target.value })}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            >
              <option value="">-- Select Medium * --</option>
              {lookups.mediums.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Deal Type *
            </label>
            <select
              value={formData.deal_type}
              onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            >
              <option value="Sale_Basis">Sale Basis</option>
              <option value="Purchase_Basis">Gallery Purchase</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            >
              <option value="Available">Available</option>
              <option value="Sold">Soldout</option>
              <option value="Return">Return</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Artwork Code <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 400 }}>{loadingCode ? '(Generating...)' : '(Auto-assigned)'}</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                readOnly
                placeholder="Auto-generated on Artist select"
                value={formData.code}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.2rem 0.75rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--accent-gold)',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  cursor: 'not-allowed',
                  userSelect: 'none'
                }}
                title="System Generated Artwork Code (Protected)"
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔒</span>
            </div>
          </div>
        </div>

        {/* 🎨 PROFESSIONAL PRICING & COMMISSION BREAKDOWN (WITH HORIZONTAL ROWS) */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
        }}>
          {/* ROW 1: Gallery Selling Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Price (PKR) <span style={{ opacity: 0.7 }}>(Gallery Selling Price for Dashboard / Website)</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 265000"
                value={formData.price}
                onChange={(e) => handleGalleryPriceChange(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--accent-gold)', borderRadius: '8px', color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* HORIZONTAL DIVIDER */}
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '0.25rem 0' }} />

          {/* ROW 2: Artist Quoted Price | % | Charges | Payable to Artist */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 1.1fr 1.2fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Artist Price (PKR)
              </label>
              <input
                type="number"
                placeholder="e.g. 250000"
                value={formData.purchase_price}
                onChange={(e) => handleArtistPriceChange(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                %
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  placeholder="40"
                  value={formData.commission_pct}
                  onChange={(e) => handleCommissionPctChange(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1.8rem 0.75rem 0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Charges
              </label>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(212, 175, 55, 0.05)', border: '1px dashed rgba(212, 175, 55, 0.4)', borderRadius: '8px', color: 'var(--accent-gold)', fontSize: '0.95rem', fontWeight: 700 }}>
                PKR {galleryShare.toLocaleString()}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Payable to Artist
              </label>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#10b981', fontSize: '0.95rem', fontWeight: 700 }}>
                PKR {netPayableToArtist.toLocaleString()}
              </div>
            </div>
          </div>

          {/* HORIZONTAL DIVIDER */}
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '0.25rem 0' }} />

          {/* ROW 3: Framing Charges & Total Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1.5fr', gap: '1.25rem', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>
                Framed?
              </label>
              <select
                value={formData.with_frame}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    with_frame: val,
                    frame_charges: val === '0' ? 0 : prev.frame_charges
                  }));
                }}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>
                Frame Charges (PKR)
              </label>
              <input
                type="number"
                placeholder={formData.with_frame === '1' ? "e.g. 5000" : "0"}
                disabled={formData.with_frame !== '1'}
                value={formData.with_frame === '1' ? formData.frame_charges : 0}
                onChange={(e) => setFormData({ ...formData, frame_charges: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: formData.with_frame === '1' ? 'var(--bg-input)' : 'rgba(255,255,255,0.02)',
                  border: formData.with_frame === '1' ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: formData.with_frame === '1' ? 'var(--accent-gold)' : 'var(--text-muted)',
                  cursor: formData.with_frame === '1' ? 'text' : 'not-allowed',
                  fontWeight: formData.with_frame === '1' ? 700 : 400
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Amount
              </label>
              <div style={{
                padding: '0.75rem 1rem',
                background: formData.with_frame === '1' && parseFloat(formData.frame_charges || 0) > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                border: formData.with_frame === '1' && parseFloat(formData.frame_charges || 0) > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                borderRadius: '8px',
                color: formData.with_frame === '1' && parseFloat(formData.frame_charges || 0) > 0 ? '#10b981' : 'var(--accent-gold)',
                fontSize: '0.95rem',
                fontWeight: 700
              }}>
                PKR {(parseFloat(formData.price || 0) + (formData.with_frame === '1' ? parseFloat(formData.frame_charges || 0) : 0)).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Category & Description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Category / Collection Type *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              required
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            >
              <option value="">-- Select Category * --</option>
              {lookups.categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="Optional artwork description or remarks"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* ROW 5: Image Upload Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Artwork Image
          </label>
          <div style={{
            display: 'flex',
            gap: '1.25rem',
            alignItems: 'center',
            backgroundColor: 'var(--bg-input, rgba(255, 255, 255, 0.01))',
            border: '1px dashed var(--border-color)',
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            minHeight: '100px'
          }}>
            <div style={{
              width: '85px',
              height: '85px',
              borderRadius: '8px',
              border: '1px solid var(--accent-gold)',
              overflow: 'hidden',
              backgroundColor: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
            }}>
              {imageUrl ? (
                <img src={imageUrl} alt="Artwork Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                  <ImageIcon size={22} />
                  <span style={{ fontSize: '0.68rem' }}>No Image</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={formData.image}>
                {formData.image || "No artwork image uploaded"}
              </span>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <label className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <Upload size={14} /> Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        alert("File size exceeds 5MB limit.");
                        return;
                      }
                      const uploadData = new FormData();
                      uploadData.append('file', file);
                      fetch(getApiUrl('/api/artworks/upload-image'), {
                        method: 'POST',
                        body: uploadData
                      })
                        .then(res => res.json())
                        .then(resData => {
                          if (resData.filename) {
                            setFormData(prev => ({ ...prev, image: resData.filename }));
                          }
                        })
                        .catch(err => alert("Upload failed: " + err.message));
                    }}
                  />
                </label>

                {formData.image && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recommended resolution: 1200px+ (JPG, PNG, WebP)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          {onCancel && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ padding: '0.75rem 2rem', fontSize: '0.88rem', fontWeight: 600 }}
          >
            {saving ? 'Saving...' : isEdit ? 'Update Artwork' : 'Save Artwork'}
          </button>
        </div>

      </form>
    </div>
  );
}
