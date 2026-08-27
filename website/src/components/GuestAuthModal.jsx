import React, { useState, useEffect, useRef } from 'react';
import {
  X, CheckCircle2, MessageSquare, Clock, Lock, Unlock, Mail, Phone, User, Shield, AlertCircle
} from 'lucide-react';
import {
  registerGuest, checkGuestStatus, loginGuest, simulateWhatsAppVerify, verifyGuestOtp
} from '../services/api';

export default function GuestAuthModal({ isOpen, onClose, guestSession, onLoginSuccess, onLogout }) {
  const [step, setStep] = useState('register'); // 'register', 'verify', 'login', 'active'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [manualOtp, setManualOtp] = useState('');
  const [manualVerifyLoading, setManualVerifyLoading] = useState(false);

  const [remainingTime, setRemainingTime] = useState('');
  const pollingRef = useRef(null);

  // Sync step with guestSession state
  useEffect(() => {
    if (isOpen) {
      if (guestSession && guestSession.token) {
        setStep('active');
      } else {
        // Clear previous state if opening a fresh modal
        setStep('register');
        setError('');
        setUsername('');
        setPassword('');
      }
    }
  }, [isOpen, guestSession]);

  // Handle countdown for active session
  useEffect(() => {
    let timer;
    if (step === 'active' && guestSession && guestSession.expiry) {
      const updateCountdown = () => {
        const diff = new Date(guestSession.expiry) - new Date();
        if (diff <= 0) {
          setRemainingTime('Expired');
          onLogout();
          setStep('register');
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setRemainingTime(`${minutes}m ${seconds}s`);
        }
      };

      updateCountdown();
      timer = setInterval(updateCountdown, 1000);
    }
    return () => clearInterval(timer);
  }, [step, guestSession, onLogout]);

  // Poll guest status during verify step
  useEffect(() => {
    if (step === 'verify' && code) {
      const pollStatus = async () => {
        try {
          const data = await checkGuestStatus(code);
          if (data.verified) {
            clearInterval(pollingRef.current);
            if (data.username && data.password) {
              setUsername(data.username);
              setPassword(data.password);
            }
            setStep('login');
            setError('');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      };

      pollingRef.current = setInterval(pollStatus, 2000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, code]);

  if (!isOpen) return null;

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await registerGuest(email, phone);
      if (res.status === 'success' || res.code) {
        setCode(res.code);
        setWhatsappLink(res.whatsapp_link);
        setStep('verify');
      } else {
        setError('Failed to generate verification code.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginGuest(code, username, password);
      if (res.status === 'success' && res.token) {
        onLoginSuccess({
          email,
          phone,
          token: res.token,
          expiry: res.expiry
        });
        setStep('active');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      setError(err.message || 'Verification and Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const [hasOpenedWhatsApp, setHasOpenedWhatsApp] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOpenWhatsApp = () => {
    setHasOpenedWhatsApp(true);
    setError('');
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmWhatsAppSent = async () => {
    if (!hasOpenedWhatsApp) {
      setError('Please click "Verify via WhatsApp" first to send the code to our gallery number.');
      return;
    }
    if (!code) return;
    setConfirmLoading(true);
    setError('');
    try {
      const res = await verifyGuestOtp(code);
      if (res.status === 'success' && res.username && res.password) {
        setUsername(res.username);
        setPassword(res.password);
        setStep('login');
      } else {
        setError('WhatsApp verification is pending. Please ensure the code is sent on WhatsApp.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please ensure the message was sent to WhatsApp.');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeInModal 0.3s ease'
    }} onClick={onClose}>

      <div style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-premium)',
        position: 'relative',
        animation: 'slideUpModal 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '5px',
            transition: 'var(--transition-smooth)'
          }}
          className="modal-close-btn"
        >
          <X size={20} />
        </button>

        {/* Form Title & Icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            color: 'var(--accent-gold)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }}>
            {step === 'active' ? <Unlock size={24} /> : <Lock size={24} />}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {step === 'register' && 'Login'}
            {step === 'verify' && 'WhatsApp Verification'}
            {step === 'login' && 'Enter Guest Credentials'}
            {step === 'active' && 'Active Session'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {step === 'register' && 'Register your details to receive one-time access instructions.'}
            {step === 'verify' && 'Send the verification code to our business WhatsApp.'}
            {step === 'login' && 'Use the username and password provided by the administrator.'}
            {step === 'active' && 'Your guest access session is valid and running.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderLeft: '4px solid var(--accent-red)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            <AlertCircle size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: REGISTER */}
        {step === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  className="modal-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Phone Number</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Phone size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  placeholder="e.g. +923001234567"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                  className="modal-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={submitButtonStyle}
              className="modal-btn"
            >
              {loading ? 'Generating Code...' : 'Register'}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY */}
        {step === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', width: '100%' }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--border-color)',
              padding: '1rem 2rem',
              borderRadius: '12px',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Login Code</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '0.25rem', letterSpacing: '2px' }}>
                {code}
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, margin: '0 0 0.5rem 0' }}>
              To activate your access, click the button below to send this verification code to our official gallery WhatsApp.
            </p>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              style={{
                ...submitButtonStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#25D366',
                color: '#fff',
                boxShadow: '0 4px 15px rgba(37, 211, 102, 0.25)',
                cursor: 'pointer',
                border: 'none',
                width: '100%'
              }}
            >
              <MessageSquare size={18} /> {hasOpenedWhatsApp ? 'Re-open WhatsApp to Send Code' : 'Verify via WhatsApp (Send Code)'}
            </button>

            {/* Waiting / Confirmation Action */}
            {hasOpenedWhatsApp ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                  <CheckCircle2 size={16} />
                  <span>WhatsApp opened. Please send the message on WhatsApp.</span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmWhatsAppSent}
                  disabled={confirmLoading}
                  style={{
                    ...submitButtonStyle,
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 700,
                    cursor: confirmLoading ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                  className="modal-btn"
                >
                  {confirmLoading ? 'Verifying Dispatch...' : 'I Have Sent The WhatsApp Message → Proceed'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div className="dot-pulse" />
                <span>Waiting for WhatsApp dispatch...</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: LOGIN */}
        {step === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderLeft: '4px solid var(--accent-green)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem'
            }}>
              <CheckCircle2 size={16} color="var(--accent-green)" style={{ flexShrink: 0 }} />
              <span>OTP verified successfully! Your one-time access credentials have been auto-generated and prefilled below.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>One-Time Username</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={inputStyle}
                  className="modal-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>One-Time Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Shield size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  className="modal-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={submitButtonStyle}
              className="modal-btn"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        )}

        {/* STEP 4: ACTIVE */}
        {step === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{
              backgroundColor: 'rgba(212, 175, 55, 0.05)',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              padding: '1.25rem 2rem',
              borderRadius: '12px',
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Time Remaining</span>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                {remainingTime}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600, marginTop: '4px' }}>
                <CheckCircle2 size={12} /> Pricing & Shopping Actions Unlocked
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span>Email:</span>
                <span style={{ fontWeight: 600 }}>{guestSession?.email || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span>Phone:</span>
                <span style={{ fontWeight: 600 }}>{guestSession?.phone || 'N/A'}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              style={{
                ...submitButtonStyle,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--accent-red)',
                boxShadow: 'none'
              }}
              className="modal-btn-logout"
            >
              Sign Out Session
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-close-btn:hover {
          color: var(--text-primary) !important;
          transform: rotate(90deg);
        }
        .modal-input:focus {
          border-color: var(--accent-gold) !important;
          background-color: rgba(255, 255, 255, 0.01) !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15) !important;
        }
        .modal-btn:hover {
          background-color: var(--accent-gold-hover) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3) !important;
        }
        .modal-btn-logout:hover {
          background-color: rgba(239, 68, 68, 0.18) !important;
          color: #ff5f5f !important;
        }
        .dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--accent-gold);
          animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem 0.75rem 2.5rem',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'var(--transition-smooth)'
};

const submitButtonStyle = {
  width: '100%',
  padding: '0.85rem',
  backgroundColor: 'var(--accent-gold)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'var(--transition-smooth)',
  boxShadow: 'var(--shadow-gold)',
  marginTop: '0.5rem'
};
