import React, { useState, useEffect } from 'react';
import { Mail, Search, Trash2, Send, RefreshCw, Check, AlertCircle, Users, Bell, Sparkles } from 'lucide-react';

export default function SubscribersSection() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [exhibitionsList, setExhibitionsList] = useState([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const fetchSubscribers = () => {
    setLoading(true);
    fetch('http://localhost:8000/api/subscribers')
      .then(res => res.json())
      .then(data => {
        setSubscribers(data.subscribers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching subscribers:", err);
        setLoading(false);
      });
  };

  const fetchExhibitions = () => {
    fetch('http://localhost:8000/api/crm/exhibitions')
      .then(res => res.json())
      .then(data => {
        setExhibitionsList(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error fetching exhibitions:", err));
  };

  useEffect(() => {
    fetchSubscribers();
    fetchExhibitions();
  }, []);

  const handleDeleteSubscriber = (id, email) => {
    if (!window.confirm(`Are you sure you want to remove subscriber: ${email}?`)) return;

    fetch(`http://localhost:8000/api/subscribers/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(() => {
        setActionMessage({ type: 'success', text: `Subscriber ${email} removed successfully.` });
        fetchSubscribers();
        setTimeout(() => setActionMessage(null), 4000);
      })
      .catch(err => {
        setActionMessage({ type: 'error', text: `Error: ${err.message}` });
      });
  };

  const handleBroadcastExhibitionUpdate = (e) => {
    if (e) e.preventDefault();
    if (!broadcastTitle) {
      alert("Please enter an exhibition title or update heading.");
      return;
    }

    setIsBroadcasting(true);
    fetch('http://localhost:8000/api/subscribers/notify-exhibition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exhibition_id: selectedExhibitionId || null,
        title: broadcastTitle,
        description: broadcastMessage
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsBroadcasting(false);
        setBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastMessage('');
        setSelectedExhibitionId('');
        setActionMessage({ type: 'success', text: data.message || "Exhibition update sent to all subscribers!" });
        setTimeout(() => setActionMessage(null), 5000);
      })
      .catch(err => {
        setIsBroadcasting(false);
        setActionMessage({ type: 'error', text: `Broadcast failed: ${err.message}` });
      });
  };

  const filteredSubscribers = subscribers.filter(s =>
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Mail size={24} style={{ color: 'var(--accent-gold)' }} />
            Newsletter Subscribers
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage newsletter subscribers and send instant email updates about new & updated exhibitions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchSubscribers}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '8px'
            }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            onClick={() => setBroadcastModalOpen(true)}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              background: 'var(--accent-gold)',
              color: '#000',
              fontWeight: 600
            }}
          >
            <Send size={15} /> Send Exhibition Update
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {actionMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.88rem',
          backgroundColor: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: actionMessage.type === 'success' ? '#10b981' : '#ef4444'
        }}>
          {actionMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {actionMessage.text}
        </div>
      )}

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-gold)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Subscribers</span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{subscribers.length}</strong>
            <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Active Recipients</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Delivery Status</span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: '#10b981', fontWeight: 700 }}>100%</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ready for Broadcast</span>
          </div>
        </div>
      </div>

      {/* Search and Table Container */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', position: 'relative', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search subscriber email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input, rgba(255,255,255,0.05))',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '60px' }}>#</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Subscriber Email</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Subscribed On</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.map((sub, idx) => (
                <tr
                  key={sub.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s ease'
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={15} style={{ color: 'var(--accent-gold)' }} />
                      {sub.email}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981'
                    }}>
                      Active
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {sub.created_at ? new Date(sub.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                      title="Remove Subscriber"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSubscribers.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    {searchQuery ? 'No subscribers match your search query.' : 'No newsletter subscribers found yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Exhibition Update Modal */}
      {broadcastModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-glass, #121316)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={20} style={{ color: 'var(--accent-gold)' }} />
              Broadcast Exhibition Update
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Send an email update to all <strong>{subscribers.length}</strong> active newsletter subscribers.
            </p>

            <form onSubmit={handleBroadcastExhibitionUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Optional Pick Exhibition */}
              {exhibitionsList.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Select Exhibition (Optional)
                  </label>
                  <select
                    value={selectedExhibitionId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedExhibitionId(id);
                      const ex = exhibitionsList.find(x => String(x.id) === String(id));
                      if (ex) {
                        setBroadcastTitle(`New Exhibition: ${ex.document_name}`);
                        setBroadcastMessage(`We are thrilled to announce our upcoming show "${ex.document_name}". Visit the gallery to experience the exclusive works.`);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">-- Choose an Exhibition --</option>
                    {exhibitionsList.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.document_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Email Subject / Update Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Solo Exhibition Opening This Weekend"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Message / Invitation Details
                </label>
                <textarea
                  rows="4"
                  placeholder="Write message details for the subscribers..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="btn-primary"
                  style={{
                    padding: '0.55rem 1.5rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {isBroadcasting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  {isBroadcasting ? 'Sending...' : 'Send Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
