import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Shield, User, LogOut, Package, Calculator, BarChart3, Plus, 
  Trash2, Search, Check, AlertCircle, ShoppingCart, RefreshCw, X, CreditCard, Eye, Edit,
  ChevronDown, ChevronRight, Upload, Users, Image, Layers, Palette, Menu, ChevronLeft,
  Home, DollarSign, TrendingUp, Globe, Sun, Moon, Activity, Mail
} from 'lucide-react';
import { getLogoUrl, getApiUrl } from '../services/api';


// Import modularized sections
import DashboardOverviewSection from './DashboardOverviewSection';
import POSBillingSection from './POSBillingSection';
import InventorySection from './InventorySection';
import SheetSizerSection from './SheetSizerSection';
import ReportsSection from './ReportsSection';
import CRMCreateForm from './CRMCreateForm';
import CRMListView from './CRMListView';
import CRMImportView from './CRMImportView';
import FrameHeavensRatesSection from './FrameHeavensRatesSection';
import PDFImportSection from './PDFImportSection';
import ExhibitionsBannerSection from './ExhibitionsBannerSection';
import WebsiteSettingsSection from './WebsiteSettingsSection';
import GuestAccessSection from './GuestAccessSection';
import AboutSettingsSection from './AboutSettingsSection';
import SubscribersSection from './SubscribersSection';

export default function StaffPortal({ theme, toggleTheme }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('mainframe_staff_logged_in') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Security and Password Change States
  const [currentPassword, setCurrentPassword] = useState(() => {
    return localStorage.getItem('mainframe_staff_password') || 'Sh@hz@d8179';
  });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentSection, setCurrentSection] = useState(() => {
    return localStorage.getItem('mainframe_staff_section') || 'overview';
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginUsername === 'mfa1shahzad' && loginPassword === currentPassword) {
      sessionStorage.setItem('mainframe_staff_logged_in', 'true');
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (oldPassword !== currentPassword) {
      setChangeError('Old password does not match.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setChangeError('Password must be at least 6 characters.');
      return;
    }

    localStorage.setItem('mainframe_staff_password', newPassword);
    setCurrentPassword(newPassword);
    setChangeSuccess('Password updated successfully!');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };
  const [collapsedMenus, setCollapsedMenus] = useState(() => {
    const initialSection = localStorage.getItem('mainframe_staff_section') || 'overview';
    const defaults = {
      inventory: true,
      artists: true,
      collections: true,
      collection_types: true,
      medium: true,
      customers: true,
      payments: true,
      invoices: true,
      exhibitions: true,
      framerheaven: true,
      catalogues: true,
      flashimages: true,
      videos: true
    };
    
    // Auto-expand parent category based on initial section
    if (initialSection.startsWith('inventory_')) defaults.inventory = false;
    else if (initialSection.startsWith('artists_')) defaults.artists = false;
    else if (initialSection.startsWith('collections_') || initialSection === 'pdf_import') defaults.collections = false;
    else if (initialSection.startsWith('collection_types_')) defaults.collection_types = false;
    else if (initialSection.startsWith('mediums_')) defaults.medium = false;
    else if (initialSection.startsWith('customers_')) defaults.customers = false;
    else if (initialSection.startsWith('payments_')) defaults.payments = false;
    else if (initialSection.startsWith('invoices_')) defaults.invoices = false;
    else if (initialSection.startsWith('exhibitions_')) defaults.exhibitions = false;
    else if (initialSection.startsWith('framerheaven_')) defaults.framerheaven = false;
    else if (initialSection.startsWith('catalogues_')) defaults.catalogues = false;
    else if (initialSection.startsWith('flashimages_')) defaults.flashimages = false;
    else if (initialSection.startsWith('videos_')) defaults.videos = false;
    
    return defaults;
  });

  // Shared state
  const [frames, setFrames] = useState([]);
  const [fittings, setFittings] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard Analytics state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchDashboardStats = () => {
    setStatsLoading(true);
    fetch(getApiUrl("/api/sales/dashboard-stats"))
      .then(res => {
        if (!res.ok) throw new Error("Could not fetch dashboard analytics.");
        return res.json();
      })
      .then(data => {
        setDashboardStats(data);
        setStatsLoading(false);
      })
      .catch(err => {
        console.error("Dashboard stats fetch error:", err);
        setStatsLoading(false);
      });
  };

  // Fetch initial data
  const fetchInventoryAndCustomers = () => {
    setLoading(true);
    fetchDashboardStats();
    Promise.all([
      fetch(getApiUrl("/api/frames?branch_id=1")).then(res => res.json()),
      fetch(getApiUrl("/api/fittings?branch_id=1")).then(res => res.json()),
      fetch(getApiUrl("/api/calculator/sheets")).then(res => res.json()),
      fetch(getApiUrl("/api/customers")).then(res => res.json())
    ])
      .then(([frameData, fittingData, sheetData, customerData]) => {
        setFrames(frameData || []);
        setFittings(fittingData || []);
        setSheets(sheetData || []);
        setCustomers(customerData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Staff Portal fetch error:", err);
        setError("Failed to fetch database inventory files.");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchInventoryAndCustomers();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('mainframe_staff_section', currentSection);
  }, [currentSection]);

  const toggleMenu = (menuKey) => {
    setCollapsedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const handleCategoryClick = (menuKey) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setCollapsedMenus(prev => ({
        ...prev,
        [menuKey]: false
      }));
    } else {
      toggleMenu(menuKey);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1.5rem', backgroundColor: 'var(--bg-dark)' }}>
        <form onSubmit={handleLogin} className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)', borderRadius: '20px' }}>
          
          {/* Logo & CP Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
            <img src={getLogoUrl()} alt="Logo" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-title)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                Mainframe Portal
              </h2>
              <p style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Control Panel Access
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--accent-red)', padding: '1rem 1.25rem', borderRadius: '8px', animation: 'shake 0.4s ease' }}>
              <AlertCircle size={18} color="var(--accent-red)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{loginError}</span>
            </div>
          )}

          {/* Input Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Username Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Username</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Enter username" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem 0.85rem 2.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                  className="login-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Shield size={16} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Enter password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 3rem 0.85rem 2.75rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  <Eye size={16} style={{ color: showPassword ? 'var(--accent-gold)' : 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{
              padding: '0.9rem',
              backgroundColor: 'var(--accent-gold)',
              color: '#000',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-gold)',
              transition: 'var(--transition-smooth)',
              marginTop: '0.5rem'
            }}
            className="login-btn"
          >
            Sign In
          </button>

        </form>

        {/* Shaking Animation for Error and Input Focus effects */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
          }
          .login-input:focus {
            border-color: var(--accent-gold) !important;
            box-shadow: var(--shadow-gold) !important;
            background-color: rgba(255,255,255,0.02) !important;
          }
          .login-btn:hover {
            background-color: var(--accent-gold-hover) !important;
            transform: translateY(-2px);
          }
          .login-btn:active {
            transform: translateY(0);
          }
        `}</style>

      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      
      {/* 🏛️ FIXED CONTROL PANEL LEFT SIDEBAR */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '230px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-color)',
        padding: '2rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        overflowY: 'auto',
        zIndex: 100,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Sidebar CP Branding Header */}
        <div style={{ 
          marginBottom: '2rem', 
          paddingBottom: '1rem', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '8px', 
              flex: 1,
              cursor: 'pointer'
            }}
            onClick={() => setCurrentSection('overview')}
            title="Go to Dashboard Overview"
          >
            <img 
              src={getLogoUrl()} 
              alt="Logo" 
              style={{ 
                width: '80px',
                height: '80px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }} 
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              CONTROL PANEL
            </span>
          </div>
        </div>

        {/* Dashboard Overview */}
        <button 
          onClick={() => setCurrentSection('overview')} 
          className={`nav-btn ${currentSection === 'overview' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Dashboard Overview" : ""}
        >
          <Home size={18} color={currentSection === 'overview' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Dashboard Overview</span>}
        </button>

        {/* POS Invoice Billing */}
        <button 
          onClick={() => setCurrentSection('billing')} 
          className={`nav-btn ${currentSection === 'billing' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "POS Invoice Billing" : ""}
        >
          <ShoppingCart size={18} color={currentSection === 'billing' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>POS Invoice Billing</span>}
        </button>

        {/* Frame Heavens Rates */}
        <button 
          onClick={() => setCurrentSection('frame_heavens_rates')} 
          className={`nav-btn ${currentSection === 'frame_heavens_rates' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Frame Heavens Rates" : ""}
        >
          <DollarSign size={18} color={currentSection === 'frame_heavens_rates' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Frame Heavens Rates</span>}
        </button>

        {/* Inventory Stock (Collapsible) */}
        <div>
          <button 
            onClick={() => handleCategoryClick('inventory')}
            className={`nav-btn`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px' 
            }}
            title={isSidebarCollapsed ? "Inventory Stock" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Package size={18} /> 
              {!isSidebarCollapsed && <span>Inventory Stock</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.inventory ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.inventory && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('inventory_frames')} className={`submenu-btn ${currentSection === 'inventory_frames' ? 'active' : ''}`}>• Frames Inventory</button>
              <button onClick={() => setCurrentSection('inventory_fittings')} className={`submenu-btn ${currentSection === 'inventory_fittings' ? 'active' : ''}`}>• Fittings Inventory</button>
              <button onClick={() => setCurrentSection('inventory_sheets')} className={`submenu-btn ${currentSection === 'inventory_sheets' ? 'active' : ''}`}>• Glass Sheets Inventory</button>
            </div>
          )}
        </div>

        {/* Glass Sheet Sizer */}
        <button 
          onClick={() => setCurrentSection('calculator')} 
          className={`nav-btn ${currentSection === 'calculator' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Glass Sheet Sizer" : ""}
        >
          <Calculator size={18} color={currentSection === 'calculator' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Glass Sheet Sizer</span>}
        </button>

        {/* Sales Reports */}
        <button 
          onClick={() => setCurrentSection('reports')} 
          className={`nav-btn ${currentSection === 'reports' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Sales Reports" : ""}
        >
          <BarChart3 size={18} color={currentSection === 'reports' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Sales Reports</span>}
        </button>

        <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

        {/* CRM MODULES: Artists */}
        <div>
          <button 
            onClick={() => handleCategoryClick('artists')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Artists" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Users size={18} /> 
              {!isSidebarCollapsed && <span>Artists</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.artists ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.artists && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('artists_create')} className={`submenu-btn ${currentSection === 'artists_create' ? 'active' : ''}`}>• Create Artist</button>
              <button onClick={() => setCurrentSection('artists_vcard')} className={`submenu-btn ${currentSection === 'artists_vcard' ? 'active' : ''}`}>• Create from Vcard</button>
              <button onClick={() => setCurrentSection('artists_view')} className={`submenu-btn ${currentSection === 'artists_view' ? 'active' : ''}`}>• View Artists</button>
              <button onClick={() => setCurrentSection('artists_import')} className={`submenu-btn ${currentSection === 'artists_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Collections (Artworks) */}
        <div>
          <button 
            onClick={() => handleCategoryClick('collections')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Collections" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Image size={18} /> 
              {!isSidebarCollapsed && <span>Collections</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.collections ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.collections && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('collections_create')} className={`submenu-btn ${currentSection === 'collections_create' ? 'active' : ''}`}>• Create Collection</button>
              <button onClick={() => setCurrentSection('collections_view')} className={`submenu-btn ${currentSection === 'collections_view' ? 'active' : ''}`}>• View Collections</button>
              <button onClick={() => setCurrentSection('collections_import')} className={`submenu-btn ${currentSection === 'collections_import' ? 'active' : ''}`}>• Import</button>
              <button onClick={() => setCurrentSection('pdf_import')} className={`submenu-btn ${currentSection === 'pdf_import' ? 'active' : ''}`}>• PDF Catalog Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Collections Type (Categories) */}
        <div>
          <button 
            onClick={() => handleCategoryClick('collection_types')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Collections Type" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Layers size={18} /> 
              {!isSidebarCollapsed && <span>Collections Type</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.collection_types ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.collection_types && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('collection_types_create')} className={`submenu-btn ${currentSection === 'collection_types_create' ? 'active' : ''}`}>• Create Col. Type</button>
              <button onClick={() => setCurrentSection('collection_types_view')} className={`submenu-btn ${currentSection === 'collection_types_view' ? 'active' : ''}`}>• View Col. Types</button>
              <button onClick={() => setCurrentSection('collection_types_import')} className={`submenu-btn ${currentSection === 'collection_types_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Medium */}
        <div>
          <button 
            onClick={() => handleCategoryClick('medium')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Medium" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Palette size={18} /> 
              {!isSidebarCollapsed && <span>Medium</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.medium ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.medium && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('mediums_create')} className={`submenu-btn ${currentSection === 'mediums_create' ? 'active' : ''}`}>• Create Medium</button>
              <button onClick={() => setCurrentSection('mediums_view')} className={`submenu-btn ${currentSection === 'mediums_view' ? 'active' : ''}`}>• View Medium</button>
              <button onClick={() => setCurrentSection('mediums_import')} className={`submenu-btn ${currentSection === 'mediums_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Customers */}
        <div>
          <button 
            onClick={() => handleCategoryClick('customers')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Customers" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <User size={18} /> 
              {!isSidebarCollapsed && <span>Customers</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.customers ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.customers && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('customers_create')} className={`submenu-btn ${currentSection === 'customers_create' ? 'active' : ''}`}>• Create Customer</button>
              <button onClick={() => setCurrentSection('customers_vcard')} className={`submenu-btn ${currentSection === 'customers_vcard' ? 'active' : ''}`}>• Create from Vcard</button>
              <button onClick={() => setCurrentSection('customers_view')} className={`submenu-btn ${currentSection === 'customers_view' ? 'active' : ''}`}>• View Customers</button>
              <button onClick={() => setCurrentSection('customers_import')} className={`submenu-btn ${currentSection === 'customers_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Payments */}
        <div>
          <button 
            onClick={() => handleCategoryClick('payments')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Payments" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <CreditCard size={18} /> 
              {!isSidebarCollapsed && <span>Payments</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.payments ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.payments && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('payments_create')} className={`submenu-btn ${currentSection === 'payments_create' ? 'active' : ''}`}>• Create Payments</button>
              <button onClick={() => setCurrentSection('payments_view')} className={`submenu-btn ${currentSection === 'payments_view' ? 'active' : ''}`}>• View Payments</button>
              <button onClick={() => setCurrentSection('payments_import')} className={`submenu-btn ${currentSection === 'payments_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Invoices */}
        <div>
          <button 
            onClick={() => handleCategoryClick('invoices')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Invoices" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <FileText size={18} /> 
              {!isSidebarCollapsed && <span>Invoices</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.invoices ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.invoices && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('invoices_view')} className={`submenu-btn ${currentSection === 'invoices_view' ? 'active' : ''}`}>• View Invoices</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Exhibitions */}
        <div>
          <button 
            onClick={() => handleCategoryClick('exhibitions')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Exhibitions" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Layers size={18} /> 
              {!isSidebarCollapsed && <span>Exhibitions</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.exhibitions ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.exhibitions && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('exhibitions_create')} className={`submenu-btn ${currentSection === 'exhibitions_create' ? 'active' : ''}`}>• Create Exhibition</button>
              <button onClick={() => setCurrentSection('exhibitions_view')} className={`submenu-btn ${currentSection === 'exhibitions_view' ? 'active' : ''}`}>• View Exhibitions</button>
              <button onClick={() => setCurrentSection('exhibitions_banner')} className={`submenu-btn ${currentSection === 'exhibitions_banner' ? 'active' : ''}`}>• Exhibitions Banner</button>
              <button onClick={() => setCurrentSection('exhibitions_import')} className={`submenu-btn ${currentSection === 'exhibitions_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* About Us Settings */}
        <button 
          onClick={() => setCurrentSection('about_settings')} 
          className={`nav-btn ${currentSection === 'about_settings' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "About Us Editor" : ""}
        >
          <FileText size={18} color={currentSection === 'about_settings' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>About Us</span>}
        </button>

        {/* CRM MODULES: Framer's Heaven */}
        <div>
          <button 
            onClick={() => handleCategoryClick('framerheaven')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Framer's Heaven" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Package size={18} /> 
              {!isSidebarCollapsed && <span>Framer's Heaven</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.framerheaven ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.framerheaven && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('framerheaven_create')} className={`submenu-btn ${currentSection === 'framerheaven_create' ? 'active' : ''}`}>• Create Framer's</button>
              <button onClick={() => setCurrentSection('framerheaven_view')} className={`submenu-btn ${currentSection === 'framerheaven_view' ? 'active' : ''}`}>• View Framer's</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Catalogues */}
        <div>
          <button 
            onClick={() => handleCategoryClick('catalogues')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Catalogues" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <FileText size={18} /> 
              {!isSidebarCollapsed && <span>Catalogues</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.catalogues ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.catalogues && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('catalogues_create')} className={`submenu-btn ${currentSection === 'catalogues_create' ? 'active' : ''}`}>• Create Catalogues</button>
              <button onClick={() => setCurrentSection('catalogues_view')} className={`submenu-btn ${currentSection === 'catalogues_view' ? 'active' : ''}`}>• View Catalogues</button>
              <button onClick={() => setCurrentSection('catalogues_import')} className={`submenu-btn ${currentSection === 'catalogues_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Flash Images */}
        <div>
          <button 
            onClick={() => handleCategoryClick('flashimages')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Flash Images" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <Image size={18} /> 
              {!isSidebarCollapsed && <span>Flash Images</span>}
            </span>
            {!isSidebarCollapsed && (collapsedMenus.flashimages ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.flashimages && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('flashimages_create')} className={`submenu-btn ${currentSection === 'flashimages_create' ? 'active' : ''}`}>• Create Flash</button>
              <button onClick={() => setCurrentSection('flashimages_view')} className={`submenu-btn ${currentSection === 'flashimages_view' ? 'active' : ''}`}>• View Flash</button>
            </div>
          )}
        </div>

        {/* CRM MODULES: Videos */}
        <div>
          <button 
            onClick={() => handleCategoryClick('videos')} 
            className="nav-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              width: '100%', 
              padding: '0.75rem 1rem' 
            }}
            title={isSidebarCollapsed ? "Videos" : ""}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? '0' : '0.75rem' }}>
              <FileText size={18} /> 
              {!isSidebarCollapsed && <span>Videos</span>}
            </span>
             {!isSidebarCollapsed && (collapsedMenus.videos ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
          </button>
          {!isSidebarCollapsed && !collapsedMenus.videos && (
            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button onClick={() => setCurrentSection('videos_create')} className={`submenu-btn ${currentSection === 'videos_create' ? 'active' : ''}`}>• Create Videos</button>
              <button onClick={() => setCurrentSection('videos_view')} className={`submenu-btn ${currentSection === 'videos_view' ? 'active' : ''}`}>• View Videos</button>
              <button onClick={() => setCurrentSection('videos_import')} className={`submenu-btn ${currentSection === 'videos_import' ? 'active' : ''}`}>• Import</button>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

        {/* Guest Access Manager */}
        <button 
          onClick={() => setCurrentSection('guest_access')} 
          className={`nav-btn ${currentSection === 'guest_access' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Guest Access" : ""}
        >
          <Shield size={18} color={currentSection === 'guest_access' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Guest Access</span>}
        </button>

        {/* Website Settings */}
        <button 
          onClick={() => setCurrentSection('website_settings')} 
          className={`nav-btn ${currentSection === 'website_settings' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Website Controls" : ""}
        >
          <Globe size={18} color={currentSection === 'website_settings' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Website Controls</span>}
        </button>

        {/* Newsletter Subscribers */}
        <button 
          onClick={() => setCurrentSection('subscribers')} 
          className={`nav-btn ${currentSection === 'subscribers' ? 'active' : ''}`}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem', 
            width: '100%', 
            textAlign: 'left', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px' 
          }}
          title={isSidebarCollapsed ? "Newsletter Subscribers" : ""}
        >
          <Mail size={18} color={currentSection === 'subscribers' ? 'var(--accent-gold)' : 'inherit'} /> 
          {!isSidebarCollapsed && <span>Subscribers</span>}
        </button>

      </aside>

      {/* 🖼️ DYNAMIC MAIN CONTENT PANEL */}
      <main style={{
        marginLeft: '230px',
        flex: 1,
        minHeight: '100vh',
        padding: '2.5rem 1.5rem 2.5rem 1rem',
        overflowX: 'visible',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>

        {/* Title Header with Profile Dropdown & Refresh Data */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2.5rem', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '1.5rem',
          position: 'relative'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={14} /> INTERNAL CONTROL PANEL
            </span>
            <h1 style={{ fontSize: '2.5rem', marginTop: '0.25rem' }}>Dashboard</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* Refresh Data button */}
            <button 
              onClick={fetchInventoryAndCustomers}
              className="btn-secondary" 
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh Data
            </button>

            {/* 👤 Profile Avatar with dropdown toggle */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '6px 12px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition-smooth)'
                }}
                className="profile-btn-nav"
              >
                {/* Round Avatar User icon instead of "S" */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: theme === 'light' ? '#ffffff' : 'var(--accent-gold)',
                  color: theme === 'light' ? '#374151' : '#000000',
                  border: theme === 'light' ? '1px solid var(--border-color)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <User size={16} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }} className="profile-name-text">
                  Shahzad
                </span>
                <ChevronDown size={14} style={{ transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--text-muted)' }} />
              </button>

              {/* Profile Dropdown Menu Card */}
              {isProfileMenuOpen && (
                <div 
                  className="glass-card" 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '260px',
                    padding: '1.25rem 1rem',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
                    borderRadius: '14px',
                    animation: 'fadeIn 0.2s ease'
                  }}
                >
                  {/* Header User info */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: theme === 'light' ? '#ffffff' : 'var(--accent-gold)',
                      color: theme === 'light' ? '#374151' : '#000000',
                      border: theme === 'light' ? '1px solid var(--border-color)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: theme === 'light' ? 'none' : 'var(--shadow-gold)'
                    }}>
                      <User size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>MFA Shahzad</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Administrator</span>
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    
                    {/* Change Password */}
                    <button
                      onClick={() => {
                        setCurrentSection('security');
                        setIsProfileMenuOpen(false);
                      }}
                      className="dropdown-item-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <Shield size={14} /> Change Password
                    </button>

                    {/* Toggle Theme */}
                    <button
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="dropdown-item-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    {/* Exit Portal / Back to Gallery */}
                    <button
                      onClick={() => {
                        window.location.hash = 'home';
                        setIsProfileMenuOpen(false);
                      }}
                      className="dropdown-item-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <Home size={14} /> Exit Portal
                    </button>

                    {/* Divider */}
                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                    {/* Logout */}
                    <button
                      onClick={() => {
                        sessionStorage.removeItem('mainframe_staff_logged_in');
                        setIsLoggedIn(false);
                        setLoginUsername('');
                        setLoginPassword('');
                        setIsProfileMenuOpen(false);
                      }}
                      className="dropdown-item-btn logout-red"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.1)',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        color: 'var(--accent-red)',
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <LogOut size={14} /> Log Out
                    </button>

                  </div>

                </div>
              )}
            </div>

          </div>
        </div>

        {/* Dynamic Content Panel */}
        <div style={{ minHeight: '500px' }}>
          {error && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '4px solid var(--accent-red)' }}>
              <AlertCircle color="var(--accent-red)" size={20} />
              <div>
                <h4 style={{ color: 'var(--accent-red)' }}>System Alert</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Dashboard Overview */}
          {currentSection === 'overview' && (
            <DashboardOverviewSection 
              stats={dashboardStats} 
              frames={frames}
              loading={statsLoading} 
              onRefresh={fetchDashboardStats} 
              onNavigate={setCurrentSection}
            />
          )}

          {/* 1. POS Billing Header */}
          {currentSection === 'billing' && (
            <POSBillingSection 
              frames={frames} 
              fittings={fittings} 
              customers={customers} 
              onSuccess={fetchInventoryAndCustomers} 
            />
          )}

          {/* Frame Heavens Rates Section */}
          {currentSection === 'frame_heavens_rates' && (
            <FrameHeavensRatesSection 
              frames={frames} 
              onRefresh={fetchInventoryAndCustomers} 
            />
          )}

          {/* 2. Inventory subsections */}
          {currentSection.startsWith('inventory_') && (
            <InventorySection 
              frames={frames} 
              fittings={fittings} 
              sheets={sheets}
              defaultTab={currentSection.replace('inventory_', '')}
              onRefresh={fetchInventoryAndCustomers} 
            />
          )}

          {/* 3. Calculator */}
          {currentSection === 'calculator' && (
            <SheetSizerSection />
          )}

          {/* 4. POS Reports */}
          {currentSection === 'reports' && (
            <ReportsSection />
          )}

          {/* 5. Dynamic CRM Modules: Create Forms */}
          {currentSection.endsWith('_create') && (
            <CRMCreateForm 
              module={currentSection.replace('_create', '')}
              onSuccess={fetchInventoryAndCustomers}
            />
          )}

          {/* 6. Dynamic CRM Modules: Vcard Creators */}
          {currentSection.endsWith('_vcard') && (
            <CRMCreateForm 
              module={currentSection.replace('_vcard', '')}
              onSuccess={fetchInventoryAndCustomers}
              isVcard={true}
            />
          )}

          {/* 7. Dynamic CRM Modules: View List */}
          {currentSection.endsWith('_view') && (
            <CRMListView 
              module={currentSection.replace('_view', '')}
            />
          )}

          {/* 8. Dynamic CRM Modules: Import */}
          {currentSection.endsWith('_import') && (
            <CRMImportView 
              module={currentSection.replace('_import', '')}
              onSuccess={fetchInventoryAndCustomers}
            />
          )}

          {/* 9. PDF Catalog Import */}
          {currentSection === 'pdf_import' && (
            <PDFImportSection />
          )}

          {/* 10. Exhibitions Banner Customizer */}
          {currentSection === 'exhibitions_banner' && (
            <ExhibitionsBannerSection />
          )}

          {/* 11. Website Display Controls */}
          {currentSection === 'website_settings' && (
            <WebsiteSettingsSection />
          )}

          {/* About Us Page Editor */}
          {currentSection === 'about_settings' && (
            <AboutSettingsSection />
          )}

          {/* Guest Access Manager */}
          {currentSection === 'guest_access' && (
            <GuestAccessSection theme={theme} />
          )}

          {/* Newsletter Subscribers Manager */}
          {currentSection === 'subscribers' && (
            <SubscribersSection />
          )}

          {/* Security / Change Password */}
          {currentSection === 'security' && (
            <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} color="var(--accent-gold)" /> Security Settings
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Update your dashboard access password.
                </p>
              </div>

              {changeError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--accent-red)', padding: '0.75rem 1.25rem', borderRadius: '8px' }}>
                  <AlertCircle size={16} color="var(--accent-red)" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{changeError}</span>
                </div>
              )}

              {changeSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid var(--accent-green)', padding: '0.75rem 1.25rem', borderRadius: '8px' }}>
                  <Check size={16} color="var(--accent-green)" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{changeSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Old Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Old Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter current password" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="login-input"
                  />
                </div>

                {/* New Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>New Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter new password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="login-input"
                  />
                </div>

                {/* Confirm New Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Confirm New Password</label>
                  <input 
                    type="password" 
                    placeholder="Repeat new password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="login-input"
                  />
                </div>

                <button 
                  type="submit" 
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-gold)',
                    transition: 'var(--transition-smooth)',
                    marginTop: '0.5rem'
                  }}
                  className="login-btn"
                >
                  Update Password
                </button>

              </form>
            </div>
          )}
        </div>

      </main>
      
      {/* Styles */}
      <style>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .submenu-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          text-align: left;
          padding: 0.4rem 0.75rem;
          font-size: 0.85rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: block;
          width: 100%;
        }
        .submenu-btn:hover {
          color: var(--accent-gold);
          background-color: rgba(255,255,255,0.02);
        }
        .submenu-btn.active {
          color: var(--accent-gold);
          font-weight: 600;
          background-color: rgba(212,175,55,0.05);
        }
        .profile-btn-nav:hover {
          background-color: rgba(255,255,255,0.05) !important;
          border-color: var(--accent-gold) !important;
        }
        .dropdown-item-btn:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
          color: var(--accent-gold) !important;
        }
        .dropdown-item-btn.logout-red:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
          color: #ff5f5f !important;
          border-color: rgba(239, 68, 68, 0.2) !important;
        }
      `}</style>
    </div>
  );
}
