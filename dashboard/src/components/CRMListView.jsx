import React, { useState, useEffect } from 'react';
import { Trash2, Upload, Edit, X, Printer, FileText, Plus } from 'lucide-react';
import { CONFIGS, LIST_COLUMNS } from './crmConfigs';
import CRMCreateForm from './CRMCreateForm';
import { getApiUrl } from '../services/api';

const getModulePath = (moduleName) => {
  if (moduleName === 'collection_types') return 'collection-types';
  if (moduleName === 'collections') return 'artworks';
  return moduleName;
};

export default function CRMListView({ module }) {
  const columns = LIST_COLUMNS[module] || [];
  const config = CONFIGS[module];
  
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  // Global Template & Toggle Letter States
  const [templateVersion, setTemplateVersion] = useState(Date.now());
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handleToggleLetter = (id) => {
    fetch(getApiUrl(`/api/artworks/${id}/toggle-letter`), {
      method: 'PUT'
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          fetchRecords();
        } else {
          alert("Failed to toggle letter status.");
        }
      })
      .catch(err => alert("Error toggling letter: " + err.message));
  };

  const handleStatusChange = (id, newStatus) => {
    fetch(getApiUrl(`/api/artworks/${id}/status`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          fetchRecords();
        } else {
          alert("Failed to update status.");
        }
      })
      .catch(err => alert("Error updating status: " + err.message));
  };


  const handleTemplateUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingTemplate(true);

    const uploadData = new FormData();
    uploadData.append('file', file);

    fetch(getApiUrl('/api/artworks/upload-global-template'), {
      method: 'POST',
      body: uploadData
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then(result => {
        setUploadingTemplate(false);
        if (result.success) {
          alert("Global authenticity template uploaded successfully!");
          setTemplateVersion(Date.now()); // bust cache
        }
      })
      .catch(err => {
        setUploadingTemplate(false);
        alert("Upload error: " + err.message);
      });
  };

  const fetchRecords = () => {
    setLoading(true);
    let path = `/api/${getModulePath(module)}`;
    if (['exhibitions', 'framerheaven', 'catalogues', 'flashimages', 'videos'].includes(module)) {
      path = `/api/crm/${module}`;
    } else if (module === 'collections') {
      path = `/api/artworks?limit=10000`;
    }

    fetch(getApiUrl(path))
      .then(res => {
        if (!res.ok) return [];
        return res.json();
      })
      .then(rows => {
        setData(Array.isArray(rows) ? rows : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setData([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    setEditingRecord(null);
    setSelectedIds([]);
    fetchRecords();
  }, [module]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, module]);

  const handleDelete = (id) => {
    if (!config) return;
    if (!confirm(`Are you sure you want to delete this ${config.title}?`)) return;

    let path = `/api/${getModulePath(module)}/${id}`;
    if (['exhibitions', 'framerheaven', 'catalogues', 'flashimages', 'videos'].includes(module)) {
      path = `/api/crm/${module}/${id}`;
    }

    fetch(getApiUrl(path), { method: "DELETE" })
      .then(res => res.json())
      .then(result => {
        alert(result.message);
        fetchRecords();
      })
      .catch(err => alert("Failed to delete record: " + err.message));
  };

  const handleBulkDelete = () => {
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected ${config?.title || 'item'}s?`)) return;
    
    setLoading(true);
    const deletePromises = selectedIds.map(id => {
      let path = `/api/${getModulePath(module)}/${id}`;
      if (['exhibitions', 'framerheaven', 'catalogues', 'flashimages', 'videos'].includes(module)) {
        path = `/api/crm/${module}/${id}`;
      }
      return fetch(getApiUrl(path), { method: "DELETE" }).then(res => res.json());
    });

    Promise.all(deletePromises)
      .then(results => {
        alert(`Successfully deleted ${selectedIds.length} records.`);
        setSelectedIds([]);
        fetchRecords();
      })
      .catch(err => {
        alert("Failed to delete some records: " + err.message);
        fetchRecords();
      });
  };

  const handleBulkToggleLetter = (shouldIssue) => {
    const idsToToggle = selectedIds.filter(id => {
      const row = data.find(r => r.id === id);
      if (!row) return false;
      const hasLetter = row.authenticity_letter === 'auto' || (!!row.authenticity_letter && row.authenticity_letter !== 'NULL' && row.authenticity_letter !== '');
      return shouldIssue ? !hasLetter : hasLetter;
    });

    if (idsToToggle.length === 0) {
      alert(shouldIssue ? "All selected artworks already have letters issued." : "None of the selected artworks have letters issued.");
      return;
    }

    setLoading(true);
    const togglePromises = idsToToggle.map(id => {
      return fetch(getApiUrl(`/api/artworks/${id}/toggle-letter`), {
        method: 'PUT'
      }).then(res => res.json());
    });

    Promise.all(togglePromises)
      .then(results => {
        alert(`Successfully updated certificate status for ${idsToToggle.length} artworks.`);
        setSelectedIds([]);
        fetchRecords();
      })
      .catch(err => {
        alert("Failed to update some certificates: " + err.message);
        fetchRecords();
      });
  };

  const safeData = Array.isArray(data) ? data : [];
  const filteredData = safeData.filter(row => {
    if (!search) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const renderPagination = () => {
    if (filteredData.length === 0) return null;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Showing <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfFirstItem + 1, filteredData.length)}</span> to <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfLastItem, filteredData.length)}</span> of <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{filteredData.length}</span> entries
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="pagination-select"
              style={{
                background: 'var(--bg-input, rgba(20, 20, 20, 0.6))',
                color: '#fff',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              className="pagination-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                color: activePage === 1 ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
              .map((page, index, array) => {
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span style={{ color: 'var(--text-muted)', padding: '0.4rem 0.5rem', alignSelf: 'flex-end' }}>...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`pagination-btn ${activePage === page ? 'active' : ''}`}
                      style={{
                        background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'rgba(255, 255, 255, 0.03)',
                        color: activePage === page ? '#000' : '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontWeight: activePage === page ? '600' : 'normal',
                        padding: '0.4rem 0.8rem',
                        minWidth: '2rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage === totalPages}
              className="pagination-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                color: activePage === totalPages ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render side-by-side Collection Types Manager if module is 'collection_types'
  if (module === 'collection_types') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Category List */}
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Collection Types ({filteredData.length})</h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', width: '220px' }}>
              <input 
                type="text" 
                placeholder="Search types..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>Loading records...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {columns.map(col => (
                    <th key={col.key} style={{ padding: '0.75rem 0.5rem' }}>{col.label}</th>
                  ))}
                  <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((row, idx) => (
                  <tr key={row.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {col.format ? col.format(row[col.key]) : row[col.key] || 'N/A'}
                      </td>
                    ))}
                    <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => setEditingRecord(row)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer' }}
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {renderPagination()}
        </div>

        {/* Right Side: Inline Form */}
        <div>
          <CRMCreateForm module="collection_types" onSuccess={fetchRecords} />
        </div>

      </div>
    );
  }
  // Standard generic view for all other CRM modules
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 📜 GLOBAL AUTHENTICITY CERTIFICATE TEMPLATE UPLOAD PANEL */}
      {module === 'collections' && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-gold)' }}>Global Authenticity Certificate Template</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Upload a single background image template (e.g. designed in Canva/Photoshop, containing borders, logo, and owner signature) once. 
            The system will automatically overlay painting details (Title, Artist, Dimensions, Serial) on top of this background.
          </p>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <div style={{ width: '150px', height: '100px', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img 
                src={getApiUrl(`/api/artworks/global-template?v=${templateVersion}`)} 
                alt="Current Template Preview" 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                <Upload size={14} /> {uploadingTemplate ? "Uploading Template..." : "Upload/Change Template"}
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleTemplateUpload}
                  disabled={uploadingTemplate}
                />
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supported formats: JPG, JPEG, PNG, WEBP</span>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{config?.title} listings ({filteredData.length})</h3>
          
          <div style={{ display: 'flex', gap: '0.5rem', width: '250px' }}>
            <input 
              type="text" 
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Bulk Actions Banner */}
        {selectedIds.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', fontWeight: 600 }}>
              {selectedIds.length} {config?.title || 'item'}{selectedIds.length > 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {module === 'collections' && (
                <>
                  <button
                    onClick={() => handleBulkToggleLetter(true)}
                    className="btn-secondary"
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--accent-gold)',
                      borderColor: 'rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    Issue Letters
                  </button>
                  <button
                    onClick={() => handleBulkToggleLetter(false)}
                    className="btn-secondary"
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    Revoke Letters
                  </button>
                </>
              )}
              <button
                onClick={handleBulkDelete}
                className="btn-primary"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--accent-red, #ef4444)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Trash2 size={14} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>Loading records...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {module !== 'invoices' && (
                  <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}>
                    <input 
                      type="checkbox"
                      checked={currentItems.length > 0 && currentItems.every(item => selectedIds.includes(item.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelects = [...selectedIds];
                          currentItems.forEach(item => {
                            if (!newSelects.includes(item.id)) {
                              newSelects.push(item.id);
                            }
                          });
                          setSelectedIds(newSelects);
                        } else {
                          const newSelects = selectedIds.filter(id => !currentItems.some(item => item.id === id));
                          setSelectedIds(newSelects);
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '0.75rem 0.5rem' }}>{col.label}</th>
                ))}
                {module !== 'invoices' && <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row, idx) => (
                <tr key={row.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  {module !== 'invoices' && (
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, row.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== row.id));
                          }
                        }}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {col.key === 'artist_biography' ? (() => {
                        const bioText = (row.artist_biography || row.bio || '').trim();
                        const hasBio = bioText !== '' && bioText !== 'Biography not available.' && bioText !== 'null';
                        return hasBio ? (
                          <button 
                            type="button"
                            onClick={() => setEditingRecord(row)}
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--accent-gold)',
                              border: '1px solid rgba(207, 161, 92, 0.3)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(207, 161, 92, 0.05)',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Biography available. Click to edit biography."
                          >
                            <FileText size={12} /> Edit Bio
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => setEditingRecord(row)}
                            style={{
                              fontSize: '0.75rem',
                              color: '#ef4444',
                              border: '1px dashed rgba(239, 68, 68, 0.4)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.06)',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                            title="No biography found. Click to add biography."
                          >
                            <Plus size={12} /> + Add Bio
                          </button>
                        );
                      })() : col.key === 'portfolio_report' ? (
                        <a 
                          href={getApiUrl(`/api/artists/${row.id}/portfolio-report`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--accent-gold)',
                            textDecoration: 'none',
                            border: '1px solid rgba(207, 161, 92, 0.3)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(207, 161, 92, 0.05)',
                            transition: 'all 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(207, 161, 92, 0.15)';
                            e.target.style.borderColor = 'var(--accent-gold)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(207, 161, 92, 0.05)';
                            e.target.style.borderColor = 'rgba(207, 161, 92, 0.3)';
                          }}
                        >
                          <FileText size={12} /> View
                        </a>
                      ) : col.key === 'authenticity_letter' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            checked={row[col.key] === 'auto' || (!!row[col.key] && row[col.key] !== 'NULL' && row[col.key] !== '')} 
                            onChange={() => handleToggleLetter(row.id)}
                            style={{
                              cursor: 'pointer',
                              accentColor: 'var(--accent-gold)',
                              width: '15px',
                              height: '15px'
                            }}
                          />
                          {(row[col.key] === 'auto' || (!!row[col.key] && row[col.key] !== 'NULL' && row[col.key] !== '')) ? (
                            <a 
                              href={getApiUrl(`/api/artworks/${row.id}/authenticity-letter`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--accent-gold)',
                                textDecoration: 'none',
                                border: '1px solid rgba(207, 161, 92, 0.3)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(207, 161, 92, 0.05)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(207, 161, 92, 0.15)';
                                e.target.style.borderColor = 'var(--accent-gold)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(207, 161, 92, 0.05)';
                                e.target.style.borderColor = 'rgba(207, 161, 92, 0.3)';
                              }}
                            >
                              View
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Letter</span>
                          )}
                        </div>
                      ) : col.key === 'profile_image' ? (
                        <div 
                          onClick={() => {
                            if (row.profile_image) {
                              setPreviewImage({
                                url: getApiUrl(`/api/artists/image/${row.profile_image}`),
                                title: row.name,
                                artist: row.title || 'Artist Profile',
                                code: null,
                                price: null
                              });
                            }
                          }}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#222', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: row.profile_image ? 'pointer' : 'default' }}
                          title="Click to view large profile"
                        >
                          {row.profile_image ? (
                            <img 
                              src={getApiUrl(`/api/artists/image/${row.profile_image}`)} 
                              alt={row.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100';
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>No Pic</span>
                          )}
                        </div>
                      ) : (col.key === 'filename' && (module === 'framerheaven' || module === 'catalogues' || module === 'flashimages')) ? (
                        <div 
                          onClick={() => {
                            if (row.filename && !row.filename.toLowerCase().endsWith('.pdf')) {
                              setPreviewImage({
                                url: getApiUrl(`/api/artworks/image/${row.filename}`),
                                title: row.document_name,
                                artist: module === 'framerheaven' ? (row.category_id || 'Product') : module === 'flashimages' ? 'Homepage Banner' : 'Catalogue Cover',
                                code: null,
                                price: null
                              });
                            }
                          }}
                          style={{ width: module === 'flashimages' ? '80px' : '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#222', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (row.filename && !row.filename.toLowerCase().endsWith('.pdf')) ? 'pointer' : 'default' }}
                          title={row.filename && !row.filename.toLowerCase().endsWith('.pdf') ? "Click to view large image" : ""}
                        >
                          {row.filename ? (
                            row.filename.toLowerCase().endsWith('.pdf') ? (
                              <div style={{ color: 'var(--accent-gold)', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText size={16} />
                                <span style={{ marginTop: '2px' }}>PDF</span>
                              </div>
                            ) : (
                              <img 
                                src={getApiUrl(`/api/artworks/image/${row.filename}`)} 
                                alt={row.document_name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100';
                                }}
                              />
                            )
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>No Pic</span>
                          )}
                        </div>
                      ) : col.key === 'image' ? (
                        <div 
                          onClick={() => {
                            if (row.id) {
                              setPreviewImage({
                                url: getApiUrl(`/api/artworks/image/${row.id}`),
                                title: row.title,
                                artist: row.artist_name,
                                code: row.code,
                                price: row.price
                              });
                            }
                          }}
                          style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#222', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: row.id ? 'pointer' : 'default' }}
                          title="Click to view large image"
                        >
                          {row.id ? (
                            <img 
                              src={getApiUrl(`/api/artworks/image/${row.id}`)} 
                              alt={row.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100';
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>No Pic</span>
                          )}
                        </div>
                      ) : (col.key === 'status' && module === 'collections') ? (
                        <select
                          value={row[col.key] || 'Available'}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          style={{
                            background: 'var(--bg-input, rgba(20, 20, 20, 0.6))',
                            color: 'var(--text-primary, #fff)',
                            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                            borderRadius: '4px',
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="Available" style={{ background: 'var(--bg-dark, #121418)', color: 'var(--text-primary, #fff)' }}>Available</option>
                          <option value="Sold" style={{ background: 'var(--bg-dark, #121418)', color: 'var(--text-primary, #fff)' }}>Soldout</option>
                          <option value="Return" style={{ background: 'var(--bg-dark, #121418)', color: 'var(--text-primary, #fff)' }}>Return</option>
                          {row[col.key] && !['Available', 'Sold', 'Return'].includes(row[col.key]) && (
                            <option value={row[col.key]} style={{ background: 'var(--bg-dark, #121418)', color: 'var(--text-primary, #fff)' }}>{row[col.key]}</option>
                          )}
                        </select>
                      ) : (
                        col.format ? col.format(row[col.key]) : row[col.key] || 'N/A'
                      )}
                    </td>
                  ))}
                    <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {module === 'collections' && (
                        <a 
                          href={getApiUrl(`/api/artworks/${row.id}/tag`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                          title="Print Tag / Card"
                        >
                          <Printer size={15} />
                        </a>
                      )}
                      <button 
                        onClick={() => setEditingRecord(row)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer' }}
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (module !== 'invoices' ? 2 : 0)} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {renderPagination()}
      </div>

      {/* 🛠️ EDIT GLASSMORPHISM MODAL OVERLAY */}
      {editingRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
          }}>
            <button 
              onClick={() => setEditingRecord(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={16} />
            </button>
            <CRMCreateForm 
              module={module} 
              editRecord={editingRecord}
              onCancel={() => setEditingRecord(null)}
              onSuccess={() => {
                setEditingRecord(null);
                fetchRecords();
              }} 
            />
          </div>
        </div>
      )}

      {/* 🖼️ HIGH-RESOLUTION ARTWORK LIGHTBOX MODAL (IPAD OPTIMIZED) */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '2rem',
            cursor: 'zoom-out'
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200
            }}
          >
            <X size={20} />
          </button>

          {/* Image Card Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{
              maxWidth: '90%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'default',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '1rem' }}>
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '65vh', 
                  objectFit: 'contain', 
                  borderRadius: '6px' 
                }} 
              />
            </div>
            
            {/* Metadata Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(15, 15, 15, 0.95)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>{previewImage.title || 'Untitled'}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    {previewImage.artist || 'Unknown Artist'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {previewImage.code && (
                    <span style={{ display: 'inline-block', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Code: {previewImage.code}
                    </span>
                  )}
                  {previewImage.price && (
                    <div style={{ fontSize: '1.05rem', color: 'var(--accent-green, #10b981)', fontWeight: 700 }}>
                      {parseFloat(previewImage.price).toLocaleString()} PKR
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
