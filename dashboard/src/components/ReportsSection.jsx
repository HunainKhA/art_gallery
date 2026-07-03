import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function ReportsSection() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchReport = (e) => {
    if (e) e.preventDefault();
    setLoadingReport(true);
    
    Promise.all([
      fetch(getApiUrl(`/api/sales/reports/daily?date_str=${reportDate}&branch_id=1`)).then(res => res.json()),
      fetch(getApiUrl(`/api/sales/invoices?branch_id=1&from_date=${reportDate}&to_date=${reportDate}`)).then(res => res.json())
    ])
      .then(([summaryData, invoiceList]) => {
        setReport(summaryData);
        setInvoices(invoiceList || []);
        setLoadingReport(false);
      })
      .catch(err => {
        alert("Failed to load report: " + err.message);
        setLoadingReport(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [reportDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportDate]);

  const viewInvoiceReceiptDetails = (inv) => {
    fetch(getApiUrl(`/api/sales/invoices/${inv.invoice_id1}?branch_id=1`))
      .then(res => res.json())
      .then(fullDetails => {
        setSelectedInvoice(fullDetails);
      })
      .catch(err => alert("Error: " + err.message));
  };

  const handleCancelInvoice = (invId1) => {
    if (!confirm(`Are you sure you want to cancel Invoice #${invId1}? This will reverse the transaction and mark it cancelled.`)) return;
    
    fetch(getApiUrl(`/api/sales/invoices/${invId1}/cancel?branch_id=1`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellation_id: `cancel_pos_staff_${Math.random().toString(36).substr(2, 5).toUpperCase()}` })
    })
      .then(res => res.json())
      .then(result => {
        alert(result.message);
        setSelectedInvoice(null);
        fetchReport();
      })
      .catch(err => alert("Error cancelling invoice: " + err.message));
  };

  // Pagination calculations
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const activePage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const indexOfLastInvoice = activePage * itemsPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - itemsPerPage;
  const currentInvoices = invoices.slice(indexOfFirstInvoice, indexOfLastInvoice);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Daily Sales Query</h3>
        <form onSubmit={fetchReport} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
          <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1.25rem' }}>Fetch Report</button>
        </form>
      </div>

      {loadingReport ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-gold)' }}>Loading daily reports database logs...</div>
      ) : (
        <>
          {report && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--accent-gold)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Total Invoiced Sales</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--accent-gold)', display: 'block', marginTop: '0.25rem' }}>{(parseFloat(report.total) || 0).toLocaleString()} PKR</strong>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--accent-green)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Advances Received</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--accent-green)', display: 'block', marginTop: '0.25rem' }}>{(parseFloat(report.advance) || 0).toLocaleString()} PKR</strong>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--accent-blue)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Outstanding Balances</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--accent-blue)', display: 'block', marginTop: '0.25rem' }}>{(parseFloat(report.balance) || 0).toLocaleString()} PKR</strong>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--accent-red)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Discounts Given</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--accent-red)', display: 'block', marginTop: '0.25rem' }}>{(parseFloat(report.discount) || 0).toLocaleString()} PKR</strong>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '1.25rem' }}>Daily Invoices Issued ({invoices.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>ID</th>
                  <th style={{ padding: '0.75rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem' }}>Billing Total</th>
                  <th style={{ padding: '0.75rem' }}>Advance Paid</th>
                  <th style={{ padding: '0.75rem' }}>Balance Due</th>
                  <th style={{ padding: '0.75rem' }}>Payment Mode</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentInvoices.map((inv) => (
                  <tr key={inv.invoice_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: inv.is_cancel ? 0.4 : 1 }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)' }}>#{inv.invoice_id1}</td>
                    <td style={{ padding: '0.75rem' }}>{inv.customer_name}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{inv.total.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-green)' }}>{inv.advance.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-blue)' }}>{inv.balance.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem' }}>{inv.mode_of_payment}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {inv.is_cancel ? (
                        <span style={{ color: 'var(--accent-red)' }}>Cancelled</span>
                      ) : inv.balance === 0 ? (
                        <span style={{ color: 'var(--accent-green)' }}>Paid</span>
                      ) : (
                        <span style={{ color: 'var(--accent-gold)' }}>Partial</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => viewInvoiceReceiptDetails(inv)} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No invoices issued for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {invoices.length > 0 && (
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
                  Showing <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfFirstInvoice + 1, invoices.length)}</span> to <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{Math.min(indexOfLastInvoice, invoices.length)}</span> of <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>{invoices.length}</span> entries
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
            )}
          </div>
        </>
      )}

      {/* Invoice Detail modal */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '700px', width: '100%', overflowY: 'auto', maxHeight: '90vh', position: 'relative', border: '1px solid var(--accent-gold)' }}>
            <button onClick={() => setSelectedInvoice(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-gold)' }}>MAINFRAME THE GALLERY</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Invoice Details</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div><strong>Invoice ID:</strong> #{selectedInvoice.invoice_id1}</div>
              <div><strong>Status:</strong> {selectedInvoice.is_cancel ? 'CANCELLED' : selectedInvoice.balance === 0 ? 'PAID' : 'PARTIAL'}</div>
              <div><strong>Customer Name:</strong> {selectedInvoice.customer_name}</div>
              <div><strong>Customer Phone:</strong> {selectedInvoice.customer_phone || 'N/A'}</div>
              <div><strong>Address:</strong> {selectedInvoice.customer_address || 'N/A'}</div>
              <div><strong>Date:</strong> {new Date(selectedInvoice.system_date).toLocaleString()}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Item Code</th>
                  <th style={{ padding: '0.5rem' }}>Description</th>
                  <th style={{ padding: '0.5rem' }}>Feet Size</th>
                  <th style={{ padding: '0.5rem' }}>Retail Price (ft)</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.5rem', color: 'var(--accent-gold)' }}>{item.code}</td>
                    <td style={{ padding: '0.5rem' }}>{item.description || 'Custom Frame'}</td>
                    <td style={{ padding: '0.5rem' }}>{item.feet_size.toFixed(2)} ft</td>
                    <td style={{ padding: '0.5rem' }}>{item.selling_price || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span><strong>{selectedInvoice.total.toLocaleString()} PKR</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-red)' }}><span>Discount:</span><strong>-{selectedInvoice.discount.toLocaleString()} PKR</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)' }}><span>Advance:</span><strong>{selectedInvoice.advance.toLocaleString()} PKR</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', color: 'var(--accent-gold)' }}><span>Balance Due:</span><strong>{selectedInvoice.balance.toLocaleString()} PKR</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => window.print()} className="btn-secondary" style={{ flex: 1 }}>Print</button>
              {!selectedInvoice.is_cancel && (
                <button onClick={() => handleCancelInvoice(selectedInvoice.invoice_id1)} className="btn-secondary" style={{ flex: 1, borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>Cancel Invoice</button>
              )}
              <button onClick={() => setSelectedInvoice(null)} className="btn-primary" style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
