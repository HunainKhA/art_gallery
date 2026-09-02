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
    <div className="page-content framer-heaven-wrapper" style={{ animation: 'fadeIn 0.5s ease' }}>

      {/* Options Tab Selector (Products & Services) */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.75rem',
        marginBottom: '3rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '1.25rem'
      }}>
        <button
          onClick={() => setActiveTab('Product')}
          style={{
            padding: '0.6rem 1.8rem',
            fontSize: '12px',
            fontWeight: activeTab.toLowerCase() === 'product' ? 500 : 400,
            borderRadius: '0px',
            border: 'none',
            borderBottom: activeTab.toLowerCase() === 'product' ? '2px solid var(--text-primary)' : '2px solid transparent',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            opacity: activeTab.toLowerCase() === 'product' ? 1 : 0.75
          }}
          className={`framer-tab-btn ${activeTab.toLowerCase() === 'product' ? 'active' : ''}`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('Service')}
          style={{
            padding: '0.6rem 1.8rem',
            fontSize: '12px',
            fontWeight: activeTab.toLowerCase() === 'service' ? 500 : 400,
            borderRadius: '0px',
            border: 'none',
            borderBottom: activeTab.toLowerCase() === 'service' ? '2px solid var(--text-primary)' : '2px solid transparent',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'Montserrat, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            opacity: activeTab.toLowerCase() === 'service' ? 1 : 0.75
          }}
          className={`framer-tab-btn ${activeTab.toLowerCase() === 'service' ? 'active' : ''}`}
        >
          Services
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#000000', fontSize: '14px', fontWeight: 400 }}>
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
                className="framer-item-card"
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
                }}
              >
                {/* Image container */}
                <div style={{ height: '230px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                  <img
                    src={getItemImage(item.id)}
                    alt={item.document_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    className="framer-card-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500';
                    }}
                  />
                </div>

                {/* Text Content */}
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{
                    fontSize: '14px',
                    color: '#000000',
                    margin: '0 0 0.6rem 0',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }} className="framer-item-title">
                    {item.document_name}
                  </h3>
                  <p style={{
                    color: '#000000',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    margin: 0,
                    flex: 1,
                    fontWeight: 400,
                    opacity: 0.85
                  }} className="framer-item-desc">
                    {item.description || 'Premium selection of bespoke framing materials and conservation glass protection.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#000000', fontSize: '14px', fontWeight: 400 }}>
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
                  background: '#ffffff',
                  color: '#000000',
                  border: '1px solid #000000',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '0px',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 400,
                  opacity: activePage === 1 ? 0.4 : 1
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
                        <span style={{ color: '#000000', padding: '0.55rem 0.75rem', alignSelf: 'flex-end', fontSize: '12px' }}>...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        style={{
                          background: activePage === page ? '#000000' : '#ffffff',
                          color: activePage === page ? '#ffffff' : '#000000',
                          border: '1px solid #000000',
                          fontWeight: 400,
                          padding: '0.55rem 1.1rem',
                          minWidth: '2.6rem',
                          borderRadius: '0px',
                          cursor: 'pointer',
                          fontSize: '12px'
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
                  background: '#ffffff',
                  color: '#000000',
                  border: '1px solid #000000',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '0px',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 400,
                  opacity: activePage === totalPages ? 0.4 : 1
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Local styles for Framer's Heaven */}
      <style>{`
        .framer-item-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important;
          border-color: #000000 !important;
        }
        .framer-item-card:hover .framer-card-img {
          transform: scale(1.04);
        }
        .framer-item-title {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          font-weight: 400 !important;
          font-size: 14px !important;
        }
        .framer-item-desc {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          font-weight: 400 !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
}
