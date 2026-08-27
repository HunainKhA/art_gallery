import React, { useState, useEffect } from 'react';
import { 
  Users, Key, Plus, Trash2, Shield, Check, X, RefreshCw, AlertCircle, Save, Phone, Clock
} from 'lucide-react';
import { 
  fetchGuestUsers, fetchGuestCredentials, createGuestCredential, deleteGuestCredential, 
  fetchWhatsAppNumber, saveWhatsAppNumber 
} from '../services/api';

export default function GuestAccessSection({ theme }) {
  const [users, setUsers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New credential form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [usersData, credsData, waData] = await Promise.all([
        fetchGuestUsers(),
        fetchGuestCredentials(),
        fetchWhatsAppNumber()
      ]);
      setUsers(usersData || []);
      setCredentials(credsData || []);
      setWhatsappNumber(waData?.whatsapp_number || '');
    } catch (err) {
      console.error("Failed to load guest data:", err);
      setFeedback({ type: 'error', message: 'Could not fetch guest access database tables.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      await saveWhatsAppNumber(whatsappNumber);
      setFeedback({ type: 'success', message: 'WhatsApp number updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update WhatsApp number.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setFeedback({ type: 'error', message: 'Username and password cannot be blank.' });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      await createGuestCredential(newUsername, newPassword);
      setNewUsername('');
      setNewPassword('');
      setFeedback({ type: 'success', message: 'One-time guest credential created successfully!' });
      // Refresh credentials list
      const credsData = await fetchGuestCredentials();
      setCredentials(credsData || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create guest credential.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCredential = async (id) => {
    if (!window.confirm("Are you sure you want to revoke/delete this credential?")) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await deleteGuestCredential(id);
      setFeedback({ type: 'success', message: 'Credential revoked/deleted successfully.' });
      const credsData = await fetchGuestCredentials();
      setCredentials(credsData || []);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to revoke credential.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <RefreshCw className="spin-animation" size={32} color="var(--accent-gold)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading guest data...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Feedback Panel */}
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

      {/* Grid of config settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* WhatsApp Business Number Configuration */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
              <Phone size={18} color="var(--accent-gold)" /> WhatsApp Business Settings
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Set the phone number where guests will submit their OTP login text codes.
            </p>
          </div>
          <form onSubmit={handleSaveWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>WhatsApp Number</label>
              <input 
                type="text" 
                placeholder="e.g. +923001234567" 
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                style={inputStyle}
                className="login-input"
              />
            </div>
            <button 
              type="submit" 
              disabled={actionLoading}
              style={{
                ...btnStyle,
                backgroundColor: theme === 'light' ? '#ffffff' : 'var(--accent-gold)',
                color: theme === 'light' ? '#374151' : '#000000',
                border: theme === 'light' ? '1px solid var(--border-color)' : 'none',
                boxShadow: theme === 'light' ? 'none' : 'var(--shadow-gold)'
              }}
              className="login-btn"
            >
              <Save size={16} /> Save Settings
            </button>
          </form>
        </div>

        {/* Generate One-Time Credentials */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
              <Key size={18} color="var(--accent-gold)" /> Create One-Time Login
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Generate credentials valid for 30 minutes once a guest enters them.
            </p>
          </div>
          <form onSubmit={handleCreateCredential} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Username</label>
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  style={inputStyle}
                  className="login-input"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Password</label>
                <input 
                  type="text" 
                  placeholder="Password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={inputStyle}
                  className="login-input"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={actionLoading}
              style={{
                ...btnStyle,
                backgroundColor: theme === 'light' ? '#ffffff' : 'var(--accent-gold)',
                color: theme === 'light' ? '#374151' : '#000000',
                border: theme === 'light' ? '1px solid var(--border-color)' : 'none',
                boxShadow: theme === 'light' ? 'none' : 'var(--shadow-gold)'
              }}
              className="login-btn"
            >
              <Plus size={16} /> Create Guest Pass
            </button>
          </form>
        </div>

      </div>

      {/* Active Guest Credentials Table */}
      <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          <Shield size={20} color="var(--accent-gold)" /> Active One-Time Passes
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Username</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Password</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Created At</th>
                <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {credentials.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No active credentials. Create one above to allow guests access.
                  </td>
                </tr>
              ) : (
                credentials.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{c.username}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{c.password}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', backgroundColor: c.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: c.active ? 'var(--accent-green)' : 'var(--accent-red)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        {c.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{c.created_at}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteCredential(c.id)}
                        disabled={actionLoading}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                        title="Delete credential"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Registrations Database */}
      <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
              <Users size={20} color="var(--accent-gold)" /> Guest Registrations & Webhook Log
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Database records of guests who submitted their phone numbers and requested unlock codes.
            </p>
          </div>
          <button 
            onClick={loadData}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} 
            className="btn-secondary"
          >
            <RefreshCw size={14} /> Refresh Log
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Phone</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Verified</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Session status</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No guest registration logs found in database.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{u.phone}</td>
                    <td style={{ padding: '0.75rem' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-gold)' }}>{u.verification_code}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        backgroundColor: u.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                        color: u.verified ? 'var(--accent-green)' : '#f59e0b', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {u.verified ? <Check size={12} /> : <Clock size={12} />}
                        {u.verified ? 'Verified' : 'Pending OTP'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {u.session_active ? (
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          Active until {u.session_expiry}
                        </span>
                      ) : u.session_expiry ? (
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          Expired ({u.session_expiry})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Never logged in</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{u.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  transition: 'var(--transition-smooth)'
};

const btnStyle = {
  width: '100%',
  padding: '0.7rem',
  backgroundColor: 'var(--accent-gold)',
  color: '#000',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'var(--transition-smooth)',
  boxShadow: 'var(--shadow-gold)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px'
};
