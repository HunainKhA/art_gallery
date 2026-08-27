import React, { useState, useEffect } from 'react';
import { Search, Edit } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function FrameHeavensRatesSection({ frames, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Form edit states
  const [editBuyingCost, setEditBuyingCost] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleStartEdit = (f) => {
    setEditingId(f.frame_id);
    setEditBuyingCost(f.buying_cost !== null && f.buying_cost !== undefined ? f.buying_cost.toString() : '');
    setEditSellingPrice(f.selling_price !== null && f.selling_price !== undefined ? f.selling_price.toString() : '');
  };

  const handleCancelInline = () => {
    setEditingId(null);
  };

  const handleSaveInline = (f) => {
    setSubmitting(true);

    const payload = {
      item_id: f.item_id,
      description: f.description || '',
      quantity: f.quantity || 0.0,
      buying_cost: parseFloat(editBuyingCost) || 0.0,
      selling_price: parseFloat(editSellingPrice) || 0.0,
      min_inventory: f.min_inventory || 0.0,
      thickness: f.thickness || 0.0,
      branch_id: f.branch_id || 1,
      is_local: f.is_local || 1,
      color: f.color || null,
      style: f.style || null,
      fsize: f.fsize || null
    };

    fetch(getApiUrl(`/api/frames/${f.frame_id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        setSubmitting(false);
        if (result.success) {
          alert("Frame rates updated successfully!");
          onRefresh();
          setEditingId(null);
        } else {
          alert("Error: " + (result.message || "Failed to update rates."));
        }
      })
      .catch(err => {
        alert("Error updating frame rates: " + err.message);
        setSubmitting(false);
      });
  };

  const filteredFrames = frames.filter(f => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (f.item_id && f.item_id.toLowerCase().includes(query)) ||
      (f.description && f.description.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredFrames.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFrames.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Search & Filter Bar */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Frame Heavens Rates Manager</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Search and quickly update base buying costs and retail selling prices per foot directly in the table row.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', width: '320px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search by code or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.55rem 1rem 0.55rem 2.25rem', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              color: '#fff',
              fontSize: '0.85rem'
            }} 
          />
        </div>
      </div>

      {/* Full Width Table of Frames */}
      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem' }}>Frame Profiles ({filteredFrames.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Code</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Thickness</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', width: '160px' }}>Buying Cost (ft)</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', width: '160px' }}>Retail Price (ft)</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((f) => {
              const isEditing = editingId === f.frame_id;
              return (
                <tr 
                  key={f.frame_id} 
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    backgroundColor: isEditing ? 'rgba(212, 175, 55, 0.04)' : 'transparent',
                    transition: 'background-color 0.2s ease'
                  }}
                  className="frame-rate-row"
                >
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-gold)', verticalAlign: 'middle' }}>{f.item_id}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', verticalAlign: 'middle' }}>{f.description || 'N/A'}</td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}>{f.thickness}"</td>
                  
                  {isEditing ? (
                    <>
                      <td style={{ padding: '0.5rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <input 
                          type="number" 
                          value={editBuyingCost} 
                          onChange={(e) => setEditBuyingCost(e.target.value)} 
                          style={{ 
                            width: '100%', 
                            padding: '0.4rem 0.6rem', 
                            background: 'var(--bg-input)', 
                            border: '1px solid var(--accent-gold)', 
                            borderRadius: '6px', 
                            color: '#fff',
                            textAlign: 'right',
                            fontSize: '0.85rem'
                          }} 
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <input 
                          type="number" 
                          value={editSellingPrice} 
                          onChange={(e) => setEditSellingPrice(e.target.value)} 
                          style={{ 
                            width: '100%', 
                            padding: '0.4rem 0.6rem', 
                            background: 'var(--bg-input)', 
                            border: '1px solid var(--accent-gold)', 
                            borderRadius: '6px', 
                            color: '#fff',
                            textAlign: 'right',
                            fontSize: '0.85rem'
                          }} 
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSaveInline(f)} 
                            className="btn-primary" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                            disabled={submitting}
                          >
                            Save
                          </button>
                          <button 
                            onClick={handleCancelInline} 
                            className="btn-secondary" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', margin: 0 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>{f.buying_cost.toLocaleString()} PKR</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent-gold)', verticalAlign: 'middle' }}>{f.selling_price.toLocaleString()} PKR</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button 
                          onClick={() => handleStartEdit(f)} 
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit size={12} /> Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {filteredFrames.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No frames matched the search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredFrames.length > 0 && (
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
              Showing <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfFirstItem + 1, filteredFrames.length)}</span> to <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfLastItem, filteredFrames.length)}</span> of <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{filteredFrames.length}</span> entries
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
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
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
                  style={{
                    background: 'var(--bg-input)',
                    color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
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
                          style={{
                            background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'var(--bg-input)',
                            color: activePage === page ? 'var(--bg-dark)' : 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
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
                  style={{
                    background: 'var(--bg-input)',
                    color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
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
        )}
      </div>

      <style>{`
        .frame-rate-row:hover {
          background-color: rgba(255, 255, 255, 0.015) !important;
        }
      `}</style>
    </div>
  );
}
