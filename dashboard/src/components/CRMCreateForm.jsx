import React, { useState, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import { CONFIGS } from './crmConfigs';
import { getApiUrl } from '../services/api';
import CatalogueBuilder from './CatalogueBuilder';
import ExhibitionBuilder from './ExhibitionBuilder';
import ArtistBioBuilder from './ArtistBioBuilder';

const getModulePath = (moduleName) => {
  if (moduleName === 'collection_types') return 'collection-types';
  if (moduleName === 'collections') return 'artworks';
  return moduleName;
};

export default function CRMCreateForm({ module, onSuccess, onCancel, editRecord = null, isVcard = false }) {
  const config = CONFIGS[module];
  const fields = config?.fields || [];

  const [formData, setFormData] = useState({});
  const [lookups, setLookups] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = !!editRecord;

  // Fetch lookups if needed
  useEffect(() => {
    const lookupFields = fields.filter(f => f.type === 'lookup');
    lookupFields.forEach(field => {
      let endpoint = `http://localhost:8000/api/${field.lookupType}`;
      fetch(endpoint)
        .then(res => res.json())
        .then(data => {
          setLookups(prev => ({
            ...prev,
            [field.lookupType]: data || []
          }));
        })
        .catch(err => console.error(`Failed to fetch lookup: ${field.lookupType}`, err));
    });

    if (editRecord) {
      const initial = {};
      fields.forEach(f => {
        initial[f.name] = editRecord[f.name] !== undefined && editRecord[f.name] !== null ? editRecord[f.name] : '';
      });
      if (module === 'artists') {
        initial.artist_biography = editRecord.artist_biography || editRecord.bio || '';
        initial.bio = initial.artist_biography;
      }
      initial.id = editRecord.id;
      setFormData(initial);
    } else {
      const defaults = {};
      fields.forEach(f => {
        defaults[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
      });
      if (module === 'artists') {
        defaults.artist_biography = '';
        defaults.bio = '';
      }
      setFormData(defaults);
    }
  }, [module, editRecord]);

  const handleVcardChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;

      const fnMatch = text.match(/^FN:(.*)$/m);
      const nMatch = text.match(/^N:([^;]*);([^;]*)/m);
      const telMatch = text.match(/^TEL(?:[^:]*)*:(.*)$/m);
      const emailMatch = text.match(/^EMAIL(?:[^:]*)*:(.*)$/m);
      const adrMatch = text.match(/^ADR(?:[^:]*)*:(.*)$/m);

      let firstName = "";
      let lastName = "";
      if (fnMatch) {
        const parts = fnMatch[1].trim().split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      } else if (nMatch) {
        lastName = nMatch[1].trim();
        firstName = nMatch[2].trim();
      }

      const phone = telMatch ? telMatch[1].trim() : "";
      const email = emailMatch ? emailMatch[1].trim() : "";
      const rawAdr = adrMatch ? adrMatch[1].trim() : "";
      const address = rawAdr.replace(/;/g, " ").trim();

      alert("Vcard parsed successfully!");
      setFormData(prev => ({
        ...prev,
        first_name: firstName,
        last_name: lastName,
        name: firstName ? `${firstName} ${lastName}`.trim() : prev.name || "",
        phone: phone,
        phone_mobile: phone,
        email: email,
        address: address,
        primary_address_street: address
      }));
    };
    reader.readAsText(file);
  };

  const handleInputChange = (name, val) => {
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);

    let path = `/api/${getModulePath(module)}`;
    if (isEdit) {
      path += `/${formData.id || editRecord.id}`;
    }
    if (['exhibitions', 'framerheaven', 'catalogues', 'flashimages', 'videos'].includes(module)) {
      path = `/api/crm/${module}`;
      if (isEdit) {
        path += `/${formData.id || editRecord.id}`;
      }
    }

    fetch(getApiUrl(path), {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    })
      .then(res => {
        if (!res.ok) throw new Error("Database sync failed.");
        return res.json();
      })
      .then(result => {
        setSaving(false);
        alert(`${config.title} ${isEdit ? 'updated' : 'created'} successfully!`);
        if (!isEdit) {
          // Reset form
          const defaults = {};
          fields.forEach(f => {
            defaults[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
          });
          setFormData(defaults);
        }
        if (onSuccess) onSuccess();
      })
      .catch(err => {
        alert("Error saving record: " + err.message);
        setSaving(false);
      });
  };

  if (module === 'catalogues') {
    return (
      <CatalogueBuilder
        editRecord={editRecord}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    );
  }

  if (module === 'exhibitions') {
    return (
      <ExhibitionBuilder
        editRecord={editRecord}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    );
  }

  if (!config) return <div style={{ color: 'var(--text-muted)' }}>Invalid CRM Module selected.</div>;

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Plus size={20} /> {isEdit ? 'Update' : 'Create'} {config.title}
      </h2>

      {module === 'framerheaven' && (
        <div style={{
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '1rem',
          borderRadius: '8px',
          color: 'var(--accent-red)',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          lineHeight: '1.4'
        }}>
          Note: Image size should be (607 x 409) for Feature Image, rest should be (1600 x 615)
        </div>
      )}

      {isVcard && (
        <div style={{ marginBottom: '2rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Upload vCard File (.vcf) to auto-fill fields</label>
          <input type="file" accept=".vcf" onChange={handleVcardChange} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 auto' }} />
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {fields.map(field => {
            const isFullWidth = ['bio', 'description', 'address', 'artist_biography'].includes(field.name);
            if (field.name === 'profile_image' || field.name === 'image' || field.name === 'filename') {
              const val = formData[field.name] || '';
              const isPdf = typeof val === 'string' && val.toLowerCase().endsWith('.pdf');
              const imageUrl = val && !isPdf
                ? (val.startsWith('http')
                  ? val
                  : (field.name === 'profile_image'
                    ? getApiUrl(`/api/artists/image/${val}`)
                    : getApiUrl(`/api/artworks/image/${val}`)))
                : null;

              return (
                <div key={field.name} style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{field.label}</label>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '8px' }}>

                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid var(--accent-gold)', overflow: 'hidden', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(212, 175, 55, 0.15)' }}>
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isPdf ? (
                        <div style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', padding: '0.25rem' }}>PDF File</div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center', padding: '0.25rem' }}>No File</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {val || "No file uploaded yet."}
                      </span>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <label className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                          <Upload size={12} /> Upload File
                          <input
                            type="file"
                            accept={field.name === 'profile_image' || field.name === 'image' || module === 'flashimages' || module === 'exhibitions' || module === 'framerheaven' ? "image/*" : "*/*"}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;

                              // Check size limit: 3MB for fullscreen Flash Images, 1MB for other modules
                              const isImageField = field.name === 'profile_image' || field.name === 'image' || module === 'flashimages' || module === 'exhibitions' || module === 'framerheaven';
                              if (isImageField) {
                                const isFlash = module === 'flashimages';
                                const maxSize = isFlash ? 3 * 1024 * 1024 : 1 * 1024 * 1024; // 3MB for flashimages, 1MB for others
                                if (file.size > maxSize) {
                                  alert(`Error: File size exceeds ${isFlash ? '3MB' : '1MB'}. Please upload a smaller image.`);
                                  e.target.value = ''; // Reset input
                                  return;
                                }
                              }

                              const uploadData = new FormData();
                              uploadData.append('file', file);

                              const uploadEndpoint = field.name === 'profile_image'
                                ? '/api/artists/upload-image'
                                : '/api/artworks/upload-image';

                              fetch(getApiUrl(uploadEndpoint), {
                                method: 'POST',
                                body: uploadData
                              })
                                .then(res => {
                                  if (!res.ok) throw new Error("Upload failed");
                                  return res.json();
                                })
                                .then(resData => {
                                  if (resData.filename) {
                                    handleInputChange(field.name, resData.filename);
                                  }
                                })
                                .catch(err => alert("Upload error: " + err.message));
                            }}
                          />
                        </label>
                        {val && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            onClick={() => handleInputChange(field.name, '')}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {(field.name === 'profile_image' || field.name === 'image' || module === 'flashimages' || module === 'exhibitions' || module === 'framerheaven') && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                          Max size: {module === 'flashimages' ? '3MB (High Resolution for Fullscreen Slider)' : '1MB'}. Recommended: {module === 'flashimages' ? '1920x1080px+' : '1200px+ width/height'}.
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            }

            if (field.name === 'authenticity_letter' && module === 'collections') {
              const hasLetter = !!formData.authenticity_letter;
              const isAuto = formData.authenticity_letter === 'auto';

              return (
                <div key={field.name} style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={hasLetter}
                      onChange={(e) => {
                        handleInputChange('authenticity_letter', e.target.checked ? 'auto' : '');
                      }}
                      style={{ accentColor: 'var(--accent-gold)' }}
                    />
                    Issue Authenticity Letter?
                  </label>

                  {hasLetter && (
                    <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', padding: '1.5rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="radio"
                            name="letter_type"
                            checked={isAuto}
                            onChange={() => handleInputChange('authenticity_letter', 'auto')}
                            style={{ accentColor: 'var(--accent-gold)' }}
                          />
                          Auto-Generate Official Certificate
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="radio"
                            name="letter_type"
                            checked={!isAuto}
                            onChange={() => handleInputChange('authenticity_letter', '')}
                            style={{ accentColor: 'var(--accent-gold)' }}
                          />
                          Upload Custom Letter File
                        </label>
                      </div>

                      {!isAuto && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            {formData.authenticity_letter && formData.authenticity_letter !== 'auto' ? formData.authenticity_letter : "No file uploaded yet."}
                          </span>
                          <label className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                            <Upload size={12} /> Upload File
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const uploadData = new FormData();
                                uploadData.append('file', file);

                                fetch(getApiUrl('/api/artworks/upload-letter'), {
                                  method: 'POST',
                                  body: uploadData
                                })
                                  .then(res => {
                                    if (!res.ok) throw new Error("Upload failed");
                                    return res.json();
                                  })
                                  .then(resData => {
                                    if (resData.filename) {
                                      handleInputChange('authenticity_letter', resData.filename);
                                    }
                                  })
                                  .catch(err => alert("Upload error: " + err.message));
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (field.name === 'purchase_price' && formData.deal_type !== 'Purchase_Basis') {
              return null;
            }

            if (field.type === 'checkbox') {
              return (
                <div key={field.name} style={{ gridColumn: isFullWidth ? 'span 2' : 'span 1', display: 'flex', alignItems: 'center', minHeight: '60px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none', width: '100%' }}>
                    <input
                      type="checkbox"
                      checked={!!formData[field.name]}
                      onChange={(e) => handleInputChange(field.name, e.target.checked ? 1 : 0)}
                      style={{
                        accentColor: 'var(--accent-gold)',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {field.label}
                    </span>
                  </label>
                </div>
              );
            }

            if (field.name === 'artist_biography' || (module === 'artists' && (field.name === 'artist_biography' || field.name === 'bio'))) {
              return (
                <ArtistBioBuilder
                  key={field.name}
                  value={formData.artist_biography || formData.bio || ''}
                  onChange={(val) => {
                    handleInputChange('artist_biography', val);
                    handleInputChange('bio', val);
                  }}
                />
              );
            }

            return (
              <div key={field.name} style={{ gridColumn: isFullWidth ? 'span 2' : 'span 1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{field.label}</label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    rows="4"
                    required={field.required}
                    style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'none' }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                    style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  >
                    {field.options.map(opt => {
                      const val = opt.value !== undefined ? opt.value : opt;
                      const label = opt.label !== undefined ? opt.label : opt;
                      return <option key={val} value={val} style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>{label}</option>;
                    })}
                  </select>
                ) : field.type === 'lookup' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange(field.name, val);
                      if (field.name === 'artist_id' && module === 'collections' && val) {
                        fetch(getApiUrl(`/api/artworks/next-code/${val}`))
                          .then(res => res.json())
                          .then(data => {
                            if (data.next_code) {
                              setFormData(prev => ({
                                ...prev,
                                title: data.next_code,
                                code: data.numeric_part
                              }));
                            }
                          })
                          .catch(err => console.error("Error fetching next code:", err));
                      }
                    }}
                    required={field.required}
                    style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  >
                    <option value="" style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>-- Select {field.label} --</option>
                    {(lookups[field.lookupType] || []).map(item => (
                      <option key={item.id} value={item.id} style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>{item.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder || ''}
                    style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary" style={{ flex: 1, margin: 0, padding: '0.8rem' }}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" style={{ flex: onCancel ? 2 : 1, padding: '0.8rem', margin: 0 }} disabled={saving}>
            {saving ? `${isEdit ? 'Updating' : 'Saving'} ${config.title}...` : `${isEdit ? 'Update' : 'Save'} ${config.title}`}
          </button>
        </div>
      </form>
    </div>
  );
}
