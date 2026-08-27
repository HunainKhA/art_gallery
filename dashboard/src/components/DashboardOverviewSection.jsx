import React, { useState } from 'react';
import { 
  RefreshCw, Globe, FileText, ShoppingCart, Check, AlertCircle, Users, Plus, TrendingUp, Edit, Shield
} from 'lucide-react';

export default function DashboardOverviewSection({ stats, frames, loading, onRefresh, onNavigate }) {
  const [hoveredVisIdx, setHoveredVisIdx] = useState(null);
  const [hoveredSalesIdx, setHoveredSalesIdx] = useState(null);
  const [refillEditingId, setRefillEditingId] = useState(null);
  const [refillQty, setRefillQty] = useState('');
  const [refillSubmitting, setRefillSubmitting] = useState(false);

  const lowStockItems = (frames || []).filter(f => f.quantity <= f.min_inventory);

  const handleSaveRefill = (f) => {
    setRefillSubmitting(true);
    const payload = {
      item_id: f.item_id,
      description: f.description || '',
      quantity: parseFloat(refillQty) || 0.0,
      buying_cost: f.buying_cost || 0.0,
      selling_price: f.selling_price || 0.0,
      min_inventory: f.min_inventory || 0.0,
      thickness: f.thickness || 0.0,
      branch_id: f.branch_id || 1,
      is_local: f.is_local || 1,
      color: f.color || null,
      style: f.style || null,
      fsize: f.fsize || null
    };

    fetch(`http://localhost:8000/api/frames/${f.frame_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        setRefillSubmitting(false);
        if (result.success) {
          alert("Inventory quantity replenished successfully!");
          onRefresh();
          setRefillEditingId(null);
        } else {
          alert("Error: " + (result.message || "Failed to update quantity."));
        }
      })
      .catch(err => {
        alert("Error updating quantity: " + err.message);
        setRefillSubmitting(false);
      });
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw size={36} className="spin-animation" style={{ color: 'var(--accent-gold)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Fetching live database analytics...</span>
      </div>
    );
  }

  // Fallback default values
  const totalVisitors = stats?.total_visitors || 0;
  const totalInquiries = stats?.total_inquiries || 0;
  const totalInvoices = stats?.total_invoices || 0;
  const totalDelivered = stats?.total_delivered || 0;
  const totalPending = stats?.total_pending || 0;
  const totalArtists = stats?.total_artists || 0;
  const newArtists = stats?.new_artists_30d || 0;
  const activeGuests = stats?.active_guests || 0;

  const visitorsChart = stats?.visitors_chart || [];
  const inquiriesChart = stats?.inquiries_chart || [];
  const salesChart = stats?.sales_chart || [];
  const countries = stats?.countries || [];

  // 1. Calculate Area Chart coordinates
  const maxTrafficVal = Math.max(
    ...visitorsChart.map(d => d.value),
    ...inquiriesChart.map(d => d.value),
    10
  ) * 1.15;

  const getTrafficXY = (index, value) => {
    const x = 50 + (index / 6) * 500;
    const y = 200 - (value / maxTrafficVal) * 150;
    return { x, y };
  };

  // Generate paths
  let visitorsPath = '';
  let inquiriesPath = '';
  let visitorsAreaPath = '';
  let inquiriesAreaPath = '';

  if (visitorsChart.length > 0) {
    visitorsChart.forEach((d, i) => {
      const { x, y } = getTrafficXY(i, d.value);
      if (i === 0) {
        visitorsPath = `M ${x} ${y}`;
        visitorsAreaPath = `M ${x} 200 L ${x} ${y}`;
      } else {
        visitorsPath += ` L ${x} ${y}`;
        visitorsAreaPath += ` L ${x} ${y}`;
      }
      if (i === visitorsChart.length - 1) {
        visitorsAreaPath += ` L ${x} 200 Z`;
      }
    });
  }

  if (inquiriesChart.length > 0) {
    inquiriesChart.forEach((d, i) => {
      const { x, y } = getTrafficXY(i, d.value);
      if (i === 0) {
        inquiriesPath = `M ${x} ${y}`;
        inquiriesAreaPath = `M ${x} 200 L ${x} ${y}`;
      } else {
        inquiriesPath += ` L ${x} ${y}`;
        inquiriesAreaPath += ` L ${x} ${y}`;
      }
      if (i === inquiriesChart.length - 1) {
        inquiriesAreaPath += ` L ${x} 200 Z`;
      }
    });
  }

  // 2. Calculate Bar Chart coordinates
  const maxSalesVal = Math.max(...salesChart.map(d => d.amount), 10) * 1.15;
  const barWidth = 32;
  const getBarCoords = (index, amount) => {
    const x = 60 + index * 74;
    const height = (amount / maxSalesVal) * 150;
    const y = 200 - height;
    return { x, y, height };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Visitors */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #8b5cf6',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Web Traffic</span>
            <Globe size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{totalVisitors.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.2rem' }}>+12.4% vs last week</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 2: Inquiries */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #14b8a6',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inquiries</span>
            <FileText size={18} style={{ color: '#14b8a6' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{totalInquiries.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.2rem' }}>+8.2% new leads</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(20, 184, 166, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 3: Sales Invoice Count */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid var(--accent-gold)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purchasing (Sales)</span>
            <ShoppingCart size={18} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{totalInvoices.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '0.2rem' }}>Active Transactions</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 4: Delivered Orders */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid var(--accent-green)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivered Orders</span>
            <Check size={18} style={{ color: 'var(--accent-green)' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{totalDelivered.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Fulfillment rate: {totalInvoices > 0 ? Math.round((totalDelivered / totalInvoices) * 100) : 0}%</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 4b: Pending Orders */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #f59e0b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Orders</span>
            <AlertCircle size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{totalPending.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Needs fulfillment</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 5: Total Artists */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #3b82f6',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Artists</span>
            <Users size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{totalArtists.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Registered Profiles</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 6: New Artists */}
        <div className="glass-card metric-card" style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #f97316',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '110px',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Artists</span>
            <Plus size={18} style={{ color: '#f97316' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{newArtists.toLocaleString()}</strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Joined last 30 days</span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* Card 7: Guest Access */}
        <div 
          className="glass-card metric-card" 
          onClick={() => onNavigate && onNavigate('guest_access')}
          style={{
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            borderLeft: '4px solid #ef4444',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '110px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guest Access</span>
            <Shield size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              {activeGuests.toLocaleString()}
            </strong>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Active Credentials &rsaquo;
            </span>
          </div>
          <div className="card-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.1), transparent 50%)', pointerEvents: 'none' }} />
        </div>

      </div>

      {/* Main Charts & Side Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: SVG Graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Graph 1: Web Visitors vs Inquiries Area Chart */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} color="var(--accent-gold)" /> Web Traffic & Customer Inquiries
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily trends over the last 7 days</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'inline-block' }} /> Visitors
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#14b8a6', display: 'inline-block' }} /> Inquiries
                </span>
              </div>
            </div>

            {/* SVG Plot */}
            <div style={{ position: 'relative', height: '230px', width: '100%' }}>
              <svg viewBox="0 0 600 230" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="visAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="inqAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="50" y1="50" x2="550" y2="50" stroke="rgba(255,255,255,0.03)" />
                <line x1="50" y1="100" x2="550" y2="100" stroke="rgba(255,255,255,0.03)" />
                <line x1="50" y1="150" x2="550" y2="150" stroke="rgba(255,255,255,0.03)" />
                <line x1="50" y1="200" x2="550" y2="200" stroke="rgba(255,255,255,0.08)" />

                {/* Area paths */}
                {visitorsAreaPath && <path d={visitorsAreaPath} fill="url(#visAreaGrad)" />}
                {inquiriesAreaPath && <path d={inquiriesAreaPath} fill="url(#inqAreaGrad)" />}

                {/* Line paths */}
                {visitorsPath && <path d={visitorsPath} fill="none" stroke="#8b5cf6" strokeWidth="3" style={{ filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.4))' }} />}
                {inquiriesPath && <path d={inquiriesPath} fill="none" stroke="#14b8a6" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 4px 6px rgba(20, 184, 166, 0.4))' }} />}

                {/* Interaction points */}
                {visitorsChart.map((d, i) => {
                  const pt = getTrafficXY(i, d.value);
                  const inqPt = getTrafficXY(i, inquiriesChart[i]?.value || 0);

                  const isHovered = hoveredVisIdx === i;

                  return (
                    <g key={i}>
                      {/* Visitors Point */}
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r={isHovered ? 6 : 4} 
                        fill="#8b5cf6" 
                        stroke="#fff" 
                        strokeWidth="1.5"
                        style={{ cursor: 'pointer', transition: 'all 0.1s ease' }}
                        onMouseEnter={() => setHoveredVisIdx(i)}
                        onMouseLeave={() => setHoveredVisIdx(null)}
                      />
                      {/* Inquiries Point */}
                      <circle 
                        cx={inqPt.x} 
                        cy={inqPt.y} 
                        r={isHovered ? 5 : 3.5} 
                        fill="#14b8a6" 
                        stroke="#fff" 
                        strokeWidth="1"
                        style={{ cursor: 'pointer', transition: 'all 0.1s ease' }}
                        onMouseEnter={() => setHoveredVisIdx(i)}
                        onMouseLeave={() => setHoveredVisIdx(null)}
                      />

                      {/* X Axis Date labels */}
                      <text 
                        x={pt.x} 
                        y="220" 
                        fill="var(--text-muted)" 
                        fontSize="9" 
                        textAnchor="middle"
                      >
                        {d.date.substring(5)} {/* MM-DD */}
                      </text>
                    </g>
                  );
                })}

                {/* SVG Y-Axis Labels */}
                <text x="35" y="55" fill="var(--text-muted)" fontSize="9" textAnchor="end">{Math.round(maxTrafficVal * 0.75)}</text>
                <text x="35" y="105" fill="var(--text-muted)" fontSize="9" textAnchor="end">{Math.round(maxTrafficVal * 0.5)}</text>
                <text x="35" y="155" fill="var(--text-muted)" fontSize="9" textAnchor="end">{Math.round(maxTrafficVal * 0.25)}</text>
                <text x="35" y="205" fill="var(--text-muted)" fontSize="9" textAnchor="end">0</text>

                {/* SVG Tooltip */}
                {hoveredVisIdx !== null && visitorsChart[hoveredVisIdx] && (
                  <g>
                    {/* Tooltip background card */}
                    <rect 
                      x={Math.min(460, Math.max(10, getTrafficXY(hoveredVisIdx, visitorsChart[hoveredVisIdx].value).x - 65))} 
                      y="10" 
                      width="130" 
                      height="54" 
                      rx="6" 
                      fill="rgba(12, 13, 16, 0.95)" 
                      stroke="var(--accent-gold)" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={Math.min(460, Math.max(10, getTrafficXY(hoveredVisIdx, visitorsChart[hoveredVisIdx].value).x - 65)) + 65} 
                      y="24" 
                      fill="#fff" 
                      fontSize="9.5" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {visitorsChart[hoveredVisIdx].date}
                    </text>
                    <text 
                      x={Math.min(460, Math.max(10, getTrafficXY(hoveredVisIdx, visitorsChart[hoveredVisIdx].value).x - 65)) + 12} 
                      y="38" 
                      fill="#c084fc" 
                      fontSize="9" 
                      fontWeight="500"
                    >
                      Visitors: {visitorsChart[hoveredVisIdx].value}
                    </text>
                    <text 
                      x={Math.min(460, Math.max(10, getTrafficXY(hoveredVisIdx, visitorsChart[hoveredVisIdx].value).x - 65)) + 12} 
                      y="50" 
                      fill="#2dd4bf" 
                      fontSize="9" 
                      fontWeight="500"
                    >
                      Inquiries: {inquiriesChart[hoveredVisIdx]?.value || 0}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Graph 2: Sales Revenue Bar Chart */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontStyle: 'normal', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} color="var(--accent-gold)" /> Sales Revenue (Daily Billing)
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily retail sales totals in PKR over last 7 days</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Last 7 Days Sum</span>
              </div>
            </div>

            {/* SVG Plot */}
            <div style={{ position: 'relative', height: '230px', width: '100%' }}>
              <svg viewBox="0 0 600 230" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-gold)" />
                    <stop offset="100%" stopColor="#b8952b" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="50" y1="50" x2="550" y2="50" stroke="rgba(255,255,255,0.03)" />
                <line x1="50" y1="100" x2="550" y2="100" stroke="rgba(255,255,255,0.03)" />
                <line x1="50" y1="150" x2="550" y2="150" stroke="rgba(255,255,255,0.03)" />
                <line x1="50" y1="200" x2="550" y2="200" stroke="rgba(255,255,255,0.08)" />

                {/* Render Bars */}
                {salesChart.map((d, i) => {
                  const { x, y, height } = getBarCoords(i, d.amount);
                  const isHovered = hoveredSalesIdx === i;

                  return (
                    <g key={i}>
                      {/* Bar shadow/glow on hover */}
                      {isHovered && (
                        <rect 
                          x={x - 4} 
                          y={y - 4} 
                          width={barWidth + 8} 
                          height={height + 4} 
                          rx="8" 
                          fill="rgba(212, 175, 55, 0.08)" 
                        />
                      )}
                      
                      {/* Main Bar */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={height} 
                        rx="5" 
                        fill="url(#salesBarGrad)" 
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onMouseEnter={() => setHoveredSalesIdx(i)}
                        onMouseLeave={() => setHoveredSalesIdx(null)}
                      />

                      {/* X Axis Date labels */}
                      <text 
                        x={x + barWidth/2} 
                        y="220" 
                        fill="var(--text-muted)" 
                        fontSize="9" 
                        textAnchor="middle"
                      >
                        {d.date.substring(5)}
                      </text>
                    </g>
                  );
                })}

                {/* SVG Y-Axis Labels */}
                <text x="35" y="55" fill="var(--text-muted)" fontSize="9" textAnchor="end">{(maxSalesVal * 0.75 / 1000).toFixed(0)}k</text>
                <text x="35" y="105" fill="var(--text-muted)" fontSize="9" textAnchor="end">{(maxSalesVal * 0.5 / 1000).toFixed(0)}k</text>
                <text x="35" y="155" fill="var(--text-muted)" fontSize="9" textAnchor="end">{(maxSalesVal * 0.25 / 1000).toFixed(0)}k</text>
                <text x="35" y="205" fill="var(--text-muted)" fontSize="9" textAnchor="end">0</text>

                {/* SVG Tooltip */}
                {hoveredSalesIdx !== null && salesChart[hoveredSalesIdx] && (
                  <g>
                    {/* Tooltip card */}
                    <rect 
                      x={Math.min(460, Math.max(10, getBarCoords(hoveredSalesIdx, salesChart[hoveredSalesIdx].amount).x - 65 + barWidth/2))} 
                      y="15" 
                      width="140" 
                      height="46" 
                      rx="6" 
                      fill="rgba(12, 13, 16, 0.95)" 
                      stroke="var(--accent-gold)" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={Math.min(460, Math.max(10, getBarCoords(hoveredSalesIdx, salesChart[hoveredSalesIdx].amount).x - 65 + barWidth/2)) + 70} 
                      y="29" 
                      fill="#fff" 
                      fontSize="9.5" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {salesChart[hoveredSalesIdx].date}
                    </text>
                    <text 
                      x={Math.min(460, Math.max(10, getBarCoords(hoveredSalesIdx, salesChart[hoveredSalesIdx].amount).x - 65 + barWidth/2)) + 70} 
                      y="42" 
                      fill="var(--accent-gold)" 
                      fontSize="9" 
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Revenue: {salesChart[hoveredSalesIdx].amount.toLocaleString()} PKR
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

        </div>

        {/* Right Side: Visitor Geographics */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={16} color="var(--accent-gold)" /> Geographic Traffic
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '1.5rem' }}>Visitor counts by geographic source</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {countries.map((c) => (
              <div key={c.code} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{c.flag}</span>
                    {c.country}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>{c.visitors.toLocaleString()}</strong> ({c.percentage}%)
                  </span>
                </div>
                {/* Custom Progress Bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${c.percentage}%`,
                    background: c.code === 'PK' ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, var(--accent-gold), #b8952b)',
                    borderRadius: '3px',
                    boxShadow: c.code === 'PK' ? '0 0 8px rgba(16,185,129,0.3)' : '0 0 8px rgba(212,175,55,0.3)'
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.005)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Primary Language Source</span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Urdu / English (PK/US/UK)</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>English accounts for 92% of target user interactions, Urdu content accounts for remaining 8% localized inquiries.</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <AlertCircle size={20} color="var(--accent-red)" /> Low Stock Procurement Alerts
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              The following framing materials (frames, backing sheets, glass layers, matt boards) are running below their configured safety stock thresholds.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => {
                if (lowStockItems.length === 0) {
                  alert("No low stock items to export.");
                  return;
                }
                const headers = ["Item Code", "Description", "Thickness", "Current Stock (ft)", "Min Alert Level (ft)", "Buying Cost (PKR)", "Retail Price (PKR)"];
                const rows = lowStockItems.map(f => [
                  f.item_id,
                  f.description || "N/A",
                  f.thickness,
                  f.quantity,
                  f.min_inventory,
                  f.buying_cost,
                  f.selling_price
                ]);
                const csvContent = [headers, ...rows]
                  .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
                  .join("\n");
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Low_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn-secondary" 
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}
            >
              Download Excel (CSV)
            </button>
            <button 
              onClick={() => {
                if (lowStockItems.length === 0) {
                  alert("No low stock items to print.");
                  return;
                }
                const printWindow = window.open("", "_blank");
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Low Stock Inventory Report</title>
                      <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
                        h1 { color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px; margin-bottom: 5px; }
                        p { color: #666; font-size: 14px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #ddd; font-size: 13px; }
                        th { background-color: #f5f5f5; color: #333; font-weight: bold; }
                        tr:nth-child(even) { background-color: #fafafa; }
                        .alert { color: #d32f2f; font-weight: bold; }
                      </style>
                    </head>
                    <body>
                      <h1>LOW STOCK INVENTORY REPORT</h1>
                      <p>Report Generated on: ${new Date().toLocaleString()}</p>
                      <table>
                        <thead>
                          <tr>
                            <th>Item Code</th>
                            <th>Description</th>
                            <th>Thickness</th>
                            <th>Current Stock</th>
                            <th>Min Alert Level</th>
                            <th>Buying Cost</th>
                            <th>Retail Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${lowStockItems.map(f => `
                            <tr>
                              <td style="font-weight: bold;">${f.item_id}</td>
                              <td>${f.description || "N/A"}</td>
                              <td>${f.thickness}"</td>
                              <td class="alert">${f.quantity} ft</td>
                              <td>${f.min_inventory} ft</td>
                              <td>${f.buying_cost} PKR</td>
                              <td>${f.selling_price} PKR</td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
                      <script>
                        window.onload = function() {
                          window.print();
                          window.close();
                        }
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="btn-primary" 
              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}
            >
              Export PDF Report
            </button>
          </div>
        </div>

        {lowStockItems.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Item Code</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Description</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Thickness</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', width: '150px' }}>Current Stock</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Min Threshold</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Required Refill</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Buying Cost (ft)</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((f) => {
                const isEditing = refillEditingId === f.frame_id;
                const refillNeeded = Math.max(0, f.min_inventory - f.quantity);
                return (
                  <tr 
                    key={f.frame_id} 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      backgroundColor: isEditing ? 'rgba(212, 175, 55, 0.04)' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-red)', verticalAlign: 'middle' }}>{f.item_id}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', verticalAlign: 'middle' }}>{f.description || 'N/A'}</td>
                    <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}>{f.thickness}″</td>
                    
                    {isEditing ? (
                      <td style={{ padding: '0.5rem', textAlign: 'right', verticalAlign: 'middle' }}>
                        <input 
                          type="number" 
                          value={refillQty}
                          onChange={(e) => setRefillQty(e.target.value)}
                          style={{
                            width: '100px',
                            padding: '0.35rem 0.55rem',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--accent-gold)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                            fontSize: '0.8rem'
                          }}
                        />
                      </td>
                    ) : (
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent-red)', verticalAlign: 'middle' }}>{f.quantity} ft</td>
                    )}
                    
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', verticalAlign: 'middle' }}>{f.min_inventory} ft</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent-gold)', verticalAlign: 'middle' }}>+{refillNeeded} ft</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', verticalAlign: 'middle' }}>{f.buying_cost.toLocaleString()} PKR</td>
                    
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSaveRefill(f)} 
                            className="btn-primary" 
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', margin: 0 }}
                            disabled={refillSubmitting}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setRefillEditingId(null)} 
                            className="btn-secondary" 
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', margin: 0 }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setRefillEditingId(f.frame_id);
                            setRefillQty(f.quantity.toString());
                          }}
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.2' }}
                        >
                          <Edit size={12} /> Refill
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--accent-green)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={28} style={{ color: 'var(--accent-green)' }} />
            <strong style={{ fontSize: '0.95rem' }}>All Stock Levels Healthy!</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No items are currently below their minimum safety thresholds.</span>
          </div>
        )}
      </div>

    </div>
  );
}
