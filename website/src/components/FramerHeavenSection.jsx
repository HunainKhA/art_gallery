import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';

export default function FramerHeavenSection({ activeTab = 'Product', setActiveTab = () => { } }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 6 cards per page fits 3 columns beautifully

  const fetchFramerHeavenItems = () => {
    setLoading(true);
    fetch(getApiUrl('/api/crm/framerheaven'))
      .then(res => res.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setItems([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFramerHeavenItems();
  }, []);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const filteredItems = items.filter(item => {
    const category = item.category_id || 'Product';
    return category.toLowerCase() === activeTab.toLowerCase();
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const getItemImage = (id) => {
    return getApiUrl(`/api/artworks/image/${id}`);
  };

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>

      {/* Options Tab Selector (Products & Services) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '3rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('Product')}
          style={{
            padding: '0.55rem 2rem',
            fontSize: '0.9rem',
            borderRadius: '20px',
            border: activeTab === 'Product' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'Product' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
            color: activeTab === 'Product' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('Service')}
          style={{
            padding: '0.55rem 2rem',
            fontSize: '0.9rem',
            borderRadius: '20px',
            border: activeTab === 'Service' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'Service' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
            color: activeTab === 'Service' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          Services
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
          Loading workshops data...
        </div>
      ) : (
        <>
          {/* Items Grid Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '2.5rem'
          }} className="framer-heaven-grid">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className="glass-card framer-item-card"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid var(--border-color)',
                  transition: 'transform 0.3s ease, border-color 0.3s ease'
                }}
              >
                {/* Image container */}
                <div style={{ height: '220px', overflow: 'hidden', backgroundColor: '#111' }}>
                  <img
                    src={getItemImage(item.id)}
                    alt={item.document_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    className="framer-card-img"
                  />
                </div>

                {/* Text Content */}
                <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 0.75rem 0', fontWeight: 400 }}>
                    {item.document_name}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0, flex: 1 }}>
                    {item.description || 'Premium selection of bespoke framing materials and conservation glass protection.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No {activeTab.toLowerCase()}s found in this category.
            </div>
          )}

          {/* Pagination Controls */}
          {filteredItems.length > itemsPerPage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: '3.5rem',
              gap: '0.4rem'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                style={{
                  background: 'var(--bg-input)',
                  color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '6px',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
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
                        <span style={{ color: 'var(--text-muted)', padding: '0.55rem 0.75rem', alignSelf: 'flex-end' }}>...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        style={{
                          background: activePage === page ? 'var(--accent-gold, #cfa15c)' : 'var(--bg-input)',
                          color: activePage === page ? 'var(--bg-dark)' : 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          fontWeight: activePage === page ? '700' : '500',
                          padding: '0.55rem 1.1rem',
                          minWidth: '2.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
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
                  padding: '0.55rem 1.1rem',
                  borderRadius: '6px',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Hover effects */}
      <style>{`
        .framer-item-card:hover {
          border-color: var(--accent-gold) !important;
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5) !important;
        }
        .framer-item-card:hover .framer-card-img {
          transform: scale(1.04);
        }
      `}</style>
    </div>
  );
}
