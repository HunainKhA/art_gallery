import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function InventorySection({ frames, fittings, sheets, defaultTab, onRefresh }) {
  const [activeSubTab, setActiveSubTab] = useState(defaultTab || 'frames');
  
  useEffect(() => {
    if (defaultTab) {
      setActiveSubTab(defaultTab);
    }
  }, [defaultTab]);

  // Frame form states
  const [frameCode, setFrameCode] = useState('');
  const [frameDesc, setFrameDesc] = useState('');
  const [frameQty, setFrameQty] = useState('');
  const [frameBuying, setFrameBuying] = useState('');
  const [frameSelling, setFrameSelling] = useState('');
  const [frameMinInv, setFrameMinInv] = useState('');
  const [frameThick, setFrameThick] = useState('');
  const [frameColor, setFrameColor] = useState('');
  const [frameStyle, setFrameStyle] = useState('');
  const [frameSize, setFrameSize] = useState('');

  // Editing state for frames
  const [editingFrame, setEditingFrame] = useState(null);

  // Pagination states for all tables
  const [framesPage, setFramesPage] = useState(1);
  const [framesPerPage, setFramesPerPage] = useState(10);

  const [fittingsPage, setFittingsPage] = useState(1);
  const [fittingsPerPage, setFittingsPerPage] = useState(10);

  const [sheetsPage, setSheetsPage] = useState(1);
  const [sheetsPerPage, setSheetsPerPage] = useState(10);

  const handleEditFrameClick = (f) => {
    setEditingFrame(f);
    setFrameCode(f.item_id || '');
    setFrameDesc(f.description || '');
    setFrameQty(f.quantity !== null && f.quantity !== undefined ? f.quantity.toString() : '');
    setFrameBuying(f.buying_cost !== null && f.buying_cost !== undefined ? f.buying_cost.toString() : '');
    setFrameSelling(f.selling_price !== null && f.selling_price !== undefined ? f.selling_price.toString() : '');
    setFrameMinInv(f.min_inventory !== null && f.min_inventory !== undefined ? f.min_inventory.toString() : '');
    setFrameThick(f.thickness !== null && f.thickness !== undefined ? f.thickness.toString() : '');
    setFrameColor(f.color || '');
    setFrameStyle(f.style || '');
    setFrameSize(f.fsize || '');
  };

  const handleCancelFrameEdit = () => {
    setEditingFrame(null);
    setFrameCode('');
    setFrameDesc('');
    setFrameQty('');
    setFrameBuying('');
    setFrameSelling('');
    setFrameMinInv('');
    setFrameThick('');
    setFrameColor('');
    setFrameStyle('');
    setFrameSize('');
  };

  // Fitting form states
  const [fitName, setFitName] = useState('');
  const [fitPrice, setFitPrice] = useState('');
  const [fitDesc, setFitDesc] = useState('');
  const [editingFitting, setEditingFitting] = useState(null);

  const handleEditFittingClick = (fit) => {
    setEditingFitting(fit);
    setFitName(fit.name || '');
    setFitPrice(fit.price !== null && fit.price !== undefined ? fit.price.toString() : '');
    setFitDesc(fit.description || '');
  };

  const handleCancelFittingEdit = () => {
    setEditingFitting(null);
    setFitName('');
    setFitPrice('');
    setFitDesc('');
  };

  // Backing sheets form states
  const [sheetName, setSheetName] = useState('');
  const [sheetLength, setSheetLength] = useState('');
  const [sheetWidth, setSheetWidth] = useState('');
  const [sheetPrice, setSheetPrice] = useState('');
  const [editingSheet, setEditingSheet] = useState(null);

  const handleEditSheetClick = (sheet) => {
    setEditingSheet(sheet);
    setSheetName(sheet.name || '');
    setSheetLength(sheet.length !== null && sheet.length !== undefined ? sheet.length.toString() : '');
    setSheetWidth(sheet.width !== null && sheet.width !== undefined ? sheet.width.toString() : '');
    setSheetPrice(sheet.price !== null && sheet.price !== undefined ? sheet.price.toString() : '');
  };

  const handleCancelSheetEdit = () => {
    setEditingSheet(null);
    setSheetName('');
    setSheetLength('');
    setSheetWidth('');
    setSheetPrice('');
  };

  const [submitting, setSubmitting] = useState(false);

  const handleAddFrameSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      item_id: frameCode,
      description: frameDesc,
      quantity: parseFloat(frameQty) || 0.0,
      buying_cost: parseFloat(frameBuying) || 0.0,
      selling_price: parseFloat(frameSelling) || 0.0,
      min_inventory: parseFloat(frameMinInv) || 0.0,
      thickness: parseFloat(frameThick) || 0.0,
      branch_id: editingFrame ? editingFrame.branch_id : 1,
      is_local: editingFrame ? editingFrame.is_local : 1,
      color: frameColor || null,
      style: frameStyle || null,
      fsize: frameSize || null
    };

    const path = editingFrame 
      ? `/api/frames/${editingFrame.frame_id}` 
      : "/api/frames";
    const method = editingFrame ? "PUT" : "POST";

    fetch(getApiUrl(path), {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        setSubmitting(false);
        if (result.success) {
          alert(editingFrame ? "Frame rates successfully updated!" : "Frame successfully added to inventory!");
          onRefresh();
          handleCancelFrameEdit();
        } else {
          alert("Error: " + (result.message || "Failed to save frame."));
        }
      })
      .catch(err => {
        alert("Error saving frame: " + err.message);
        setSubmitting(false);
      });
  };

  const handleAddFittingSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      name: fitName,
      price: parseFloat(fitPrice) || 0.0,
      description: fitDesc,
      branch_id: editingFitting ? editingFitting.branch_id : 1
    };

    const path = editingFitting 
      ? `/api/fittings/${editingFitting.fitting_id}`
      : "/api/fittings";
    const method = editingFitting ? "PUT" : "POST";

    fetch(getApiUrl(path), {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        setSubmitting(false);
        if (result.success) {
          alert(editingFitting ? "Fitting rates successfully updated!" : "Fitting added successfully!");
          onRefresh();
          handleCancelFittingEdit();
        } else {
          alert("Error: " + (result.message || "Failed to save fitting."));
        }
      })
      .catch(err => {
        alert("Error saving fitting: " + err.message);
        setSubmitting(false);
      });
  };

  const handleDeleteFitting = (fitId) => {
    if (!confirm("Are you sure you want to delete this fitting option?")) return;
    fetch(getApiUrl(`/api/fittings/${fitId}`), { method: "DELETE" })
      .then(res => res.json())
      .then(result => {
        alert(result.message);
        onRefresh();
      })
      .catch(err => alert("Error: " + err.message));
  };

  const handleAddSheetSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      name: sheetName,
      length: parseFloat(sheetLength),
      width: parseFloat(sheetWidth),
      price: parseFloat(sheetPrice),
      unit: editingSheet ? editingSheet.unit : "inches"
    };

    const path = editingSheet 
      ? `/api/calculator/sheets/${editingSheet.id}`
      : "/api/calculator/sheets";
    const method = editingSheet ? "PUT" : "POST";

    fetch(getApiUrl(path), {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        setSubmitting(false);
        if (result.success) {
          alert(editingSheet ? "Glass sheet size preset successfully updated!" : "Glass sheet preset added successfully!");
          onRefresh();
          handleCancelSheetEdit();
        } else {
          alert("Error: " + (result.message || "Failed to save glass sheet size preset."));
        }
      })
      .catch(err => {
        alert("Error saving glass sheet size preset: " + err.message);
        setSubmitting(false);
      });
  };

  const handleDeleteFrame = (fid) => {
    if (!confirm("Are you sure you want to delete this frame from stock?")) return;
    fetch(getApiUrl(`/api/frames/${fid}`), { method: "DELETE" })
      .then(res => res.json())
      .then(result => {
        alert(result.message);
        onRefresh();
      })
      .catch(err => alert("Error: " + err.message));
  };

  const handleDeleteSheet = (sid) => {
    if (!confirm("Are you sure you want to delete this standard backing sheet preset?")) return;
    fetch(getApiUrl(`/api/calculator/sheets/${sid}`), { method: "DELETE" })
      .then(res => res.json())
      .then(result => {
        alert(result.message);
        onRefresh();
      })
      .catch(err => alert("Error: " + err.message));
  };

  // Reusable pagination rendering helper
  const renderPagination = (currentPage, totalPages, itemsPerPage, setItemsPerPage, setCurrentPage, totalItems, indexOfFirstItem, indexOfLastItem) => {
    if (totalItems === 0) return null;
    const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
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
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Showing <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfFirstItem + 1, totalItems)}</span> to <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfLastItem, totalItems)}</span> of <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{totalItems}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: 'var(--bg-input, rgba(20, 20, 20, 0.6))',
                color: '#fff',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                borderRadius: '4px',
                padding: '0.2rem 0.4rem',
                fontSize: '0.8rem',
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

          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                color: activePage === 1 ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s'
              }}
            >
              Prev
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - activePage) <= 1)
              .map((page, index, array) => {
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span style={{ color: 'var(--text-muted)', padding: '0.3rem 0.4rem', alignSelf: 'flex-end' }}>...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      style={{
                        background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'rgba(255, 255, 255, 0.03)',
                        color: activePage === page ? '#000' : '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontWeight: activePage === page ? '600' : 'normal',
                        padding: '0.3rem 0.6rem',
                        minWidth: '1.8rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
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
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                color: activePage === totalPages ? 'rgba(255, 255, 255, 0.2)' : '#fff',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
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

  // Slices calculations
  const totalFramesPages = Math.ceil(frames.length / framesPerPage);
  const activeFramesPage = framesPage > totalFramesPages ? Math.max(1, totalFramesPages) : framesPage;
  const indexOfLastFrame = activeFramesPage * framesPerPage;
  const indexOfFirstFrame = indexOfLastFrame - framesPerPage;
  const currentFrames = frames.slice(indexOfFirstFrame, indexOfLastFrame);

  const totalFittingsPages = Math.ceil(fittings.length / fittingsPerPage);
  const activeFittingsPage = fittingsPage > totalFittingsPages ? Math.max(1, totalFittingsPages) : fittingsPage;
  const indexOfLastFitting = activeFittingsPage * fittingsPerPage;
  const indexOfFirstFitting = indexOfLastFitting - fittingsPerPage;
  const currentFittings = fittings.slice(indexOfFirstFitting, indexOfLastFitting);

  const totalSheetsPages = Math.ceil(sheets.length / sheetsPerPage);
  const activeSheetsPage = sheetsPage > totalSheetsPages ? Math.max(1, totalSheetsPages) : sheetsPage;
  const indexOfLastSheet = activeSheetsPage * sheetsPerPage;
  const indexOfFirstSheet = indexOfLastSheet - sheetsPerPage;
  const currentSheets = sheets.slice(indexOfFirstSheet, indexOfLastSheet);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveSubTab('frames')}
          className={`nav-btn ${activeSubTab === 'frames' ? 'active' : ''}`}
          style={{ padding: '0.4rem 1.25rem', fontSize: '0.9rem' }}
        >
          Frames Inventory
        </button>
        <button 
          onClick={() => setActiveSubTab('fittings')}
          className={`nav-btn ${activeSubTab === 'fittings' ? 'active' : ''}`}
          style={{ padding: '0.4rem 1.25rem', fontSize: '0.9rem' }}
        >
          Fittings Inventory
        </button>
        <button 
          onClick={() => setActiveSubTab('sheets')}
          className={`nav-btn ${activeSubTab === 'sheets' ? 'active' : ''}`}
          style={{ padding: '0.4rem 1.25rem', fontSize: '0.9rem' }}
        >
          Glass Sheets Inventory
        </button>
      </div>

      {activeSubTab === 'frames' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Table List */}
          <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem' }}>Stock Listings ({frames.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Code</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Thickness</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Stock (ft)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Cost</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Retail</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentFrames.map((f) => (
                  <tr key={f.frame_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{f.item_id}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{f.description || 'N/A'}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{f.thickness}"</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: f.quantity <= f.min_inventory ? 700 : 'normal', color: f.quantity <= f.min_inventory ? 'var(--accent-red)' : '#fff' }}>
                      {f.quantity} ft
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{f.buying_cost}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{f.selling_price}</td>
                    <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditFrameClick(f)} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer' }} title="Edit Rates / Details"><Edit size={15} /></button>
                      <button onClick={() => handleDeleteFrame(f.frame_id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }} title="Delete Frame"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPagination(framesPage, totalFramesPages, framesPerPage, setFramesPerPage, setFramesPage, frames.length, indexOfFirstFrame, indexOfLastFrame)}
          </div>

          {/* Form Add/Edit Frame */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-gold)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {editingFrame ? <Edit size={18} /> : <Plus size={18} />} {editingFrame ? `Edit Frame Rates: ${editingFrame.item_id}` : 'Add Frame Profile'}
            </h3>
            
            <form onSubmit={handleAddFrameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Item Code *</label>
                  <input type="text" value={frameCode} onChange={(e) => setFrameCode(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} required placeholder="e.g. F203" disabled={!!editingFrame} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Stock Quantity (ft) *</label>
                  <input type="number" value={frameQty} onChange={(e) => setFrameQty(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} required placeholder="e.g. 100" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Description</label>
                <input type="text" value={frameDesc} onChange={(e) => setFrameDesc(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} placeholder="e.g. Gold ornate classic wooden frame" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Buying Cost (ft)</label>
                  <input type="number" value={frameBuying} onChange={(e) => setFrameBuying(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} placeholder="150" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Retail Price (ft) *</label>
                  <input type="number" value={frameSelling} onChange={(e) => setFrameSelling(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} required placeholder="300" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Thickness (in) *</label>
                  <input type="number" step="0.01" value={frameThick} onChange={(e) => setFrameThick(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} required placeholder="1.5" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Min Alert Level (ft)</label>
                  <input type="number" value={frameMinInv} onChange={(e) => setFrameMinInv(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} placeholder="15" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2' }}>Color</label>
                  <input type="text" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }} placeholder="Gold" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingFrame && (
                  <button type="button" onClick={handleCancelFrameEdit} className="btn-secondary" style={{ flex: 1, margin: 0 }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" style={{ flex: 2, margin: 0 }} disabled={submitting}>
                  {submitting ? 'Saving Frame...' : (editingFrame ? 'Update Frame Rates' : 'Save Frame')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'fittings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Fittings Table */}
          <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem' }}>Fittings Listings ({fittings.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price (PKR)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentFittings.map((fit) => (
                  <tr key={fit.fitting_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{fit.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{fit.price}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{fit.description || 'N/A'}</td>
                    <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditFittingClick(fit)} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer' }} title="Edit Rates / Details"><Edit size={15} /></button>
                      <button onClick={() => handleDeleteFitting(fit.fitting_id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }} title="Delete Fitting"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPagination(fittingsPage, totalFittingsPages, fittingsPerPage, setFittingsPerPage, setFittingsPage, fittings.length, indexOfFirstFitting, indexOfLastFitting)}
          </div>

          {/* Form Add/Edit Fitting */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-gold)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {editingFitting ? <Edit size={18} /> : <Plus size={18} />} {editingFitting ? `Edit Fitting Rates: ${editingFitting.name}` : 'Add Fitting Item'}
            </h3>
            <form onSubmit={handleAddFittingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Fitting Name *</label>
                <input type="text" value={fitName} onChange={(e) => setFitName(e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="e.g. Premium Museum Glass" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Retail Price (PKR) *</label>
                <input type="number" value={fitPrice} onChange={(e) => setFitPrice(e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="e.g. 500" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Description</label>
                <textarea value={fitDesc} onChange={(e) => setFitDesc(e.target.value)} rows="3" style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', resize: 'none' }} placeholder="e.g. Anti-reflective UV protection glass..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingFitting && (
                  <button type="button" onClick={handleCancelFittingEdit} className="btn-secondary" style={{ flex: 1, margin: 0 }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" style={{ flex: 2, margin: 0 }} disabled={submitting}>
                  {submitting ? 'Saving Fitting...' : (editingFitting ? 'Update Fitting Rates' : 'Save Fitting')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sheets Inventory Subtab */}
      {activeSubTab === 'sheets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Sheets List Table */}
          <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
             <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem' }}>Glass Sheets Listings ({sheets.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Length (in)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Width (in)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price (PKR)</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentSheets.map((sheet) => (
                  <tr key={sheet.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{sheet.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{sheet.length}"</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{sheet.width}"</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sheet.price} PKR</td>
                    <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditSheetClick(sheet)} style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer' }} title="Edit Glass Preset"><Edit size={15} /></button>
                      <button onClick={() => handleDeleteSheet(sheet.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }} title="Delete Glass Preset"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
                {sheets.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No standard glass sheets configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {renderPagination(sheetsPage, totalSheetsPages, sheetsPerPage, setSheetsPerPage, setSheetsPage, sheets.length, indexOfFirstSheet, indexOfLastSheet)}
          </div>
 
          {/* Form Add/Edit Sheet Preset */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-gold)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {editingSheet ? <Edit size={18} /> : <Plus size={18} />} {editingSheet ? `Edit Glass Preset: ${editingSheet.name}` : 'Add Glass Size Preset'}
            </h3>
            <form onSubmit={handleAddSheetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Preset Name *</label>
                <input type="text" value={sheetName} onChange={(e) => setSheetName(e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder='e.g. Glass Sheet (48" x 36")' />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Length (inches) *</label>
                  <input type="number" step="0.1" value={sheetLength} onChange={(e) => setSheetLength(e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="48" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Width (inches) *</label>
                  <input type="number" step="0.1" value={sheetWidth} onChange={(e) => setSheetWidth(e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="36" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Standard Cost (PKR) *</label>
                <input type="number" value={sheetPrice} onChange={(e) => setSheetPrice(e.target.value)} style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="e.g. 600" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingSheet && (
                  <button type="button" onClick={handleCancelSheetEdit} className="btn-secondary" style={{ flex: 1, margin: 0 }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" style={{ flex: 2, margin: 0 }} disabled={submitting}>
                  {submitting ? 'Saving Glass...' : (editingSheet ? 'Update Glass Preset' : 'Save Glass Size')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
