import React, { useState } from 'react';
import { LayoutGrid, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { getArtworkImageUrl } from '../services/api';

const WALL_STYLES = [
  { id: 1, name: "Modern Living Room", color: "#1e222b", accent: "#2d333f", grid: true },
  { id: 2, name: "Minimalist Studio", color: "#e5e7eb", accent: "#d1d5db", grid: false },
  { id: 3, name: "Cozy Bedroom", color: "#2d2424", accent: "#3d3030", grid: false },
  { id: 4, name: "Executive Office", color: "#1f2937", accent: "#374151", grid: false },
  { id: 5, name: "Rustic Brick Wall", color: "#7c2d12", accent: "#9a3412", grid: true },
  { id: 6, name: "Charcoal Accent Wall", color: "#111827", accent: "#1f2937", grid: false },
  { id: 7, name: "Luxury Hallway", color: "#f3f4f6", accent: "#e5e7eb", grid: true },
  { id: 8, name: "Classic Gallery White", color: "#ffffff", accent: "#f9fafb", grid: false },
  { id: 9, name: "Industrial Concrete", color: "#4b5563", accent: "#374151", grid: true },
  { id: 10, name: "Chic Dining Room", color: "#064e3b", accent: "#065f46", grid: false },
  { id: 11, name: "Creative Design Studio", color: "#1e3a8a", accent: "#1e40af", grid: false },
  { id: 12, name: "Elegant Reception Lobby", color: "#78350f", accent: "#92400e", grid: true }
];

const FRAME_STYLES = [
  { id: 'none', name: 'No Frame (Canvas Only)', class: 'frame-none' },
  { id: 'black', name: 'Modern Black', class: 'frame-black' },
  { id: 'white', name: 'Sleek White', class: 'frame-white' },
  { id: 'gold', name: 'Luxury Gold Leaf', class: 'frame-gold' },
  { id: 'wooden', name: 'Mahogany Wooden', class: 'frame-wooden' },
  { id: 'silver', name: 'Polished Silver', class: 'frame-silver' },
  { id: 'bronze', name: 'Antique Bronze', class: 'frame-bronze' },
  { id: 'oak', name: 'Natural Oak wood', class: 'frame-oak' },
  { id: 'walnut', name: 'Dark Walnut wood', class: 'frame-walnut' },
  { id: 'baroque', name: 'Ornate Baroque Gold', class: 'frame-baroque' },
  { id: 'floating-black', name: 'Floating Frame (Black)', class: 'frame-floating-black' },
  { id: 'floating-gold', name: 'Floating Frame (Gold)', class: 'frame-floating-gold' }
];

export default function WallVisualizer({ artwork }) {
  const [selectedWall, setSelectedWall] = useState(WALL_STYLES[0]);
  const [selectedFrame, setSelectedFrame] = useState(FRAME_STYLES[0]);
  const [scale, setScale] = useState(1); // Zoom scale for inspection

  // Default dimensions if missing (e.g. 24" x 36")
  const length = artwork.length || 24; // height in inches
  const width = artwork.width || 36;   // width in inches

  // Base wall size: 10ft (120 inches) Height x 12ft (144 inches) Width
  const WALL_HEIGHT_INCHES = 120;
  const WALL_WIDTH_INCHES = 144;

  // Percentage dimensions of artwork relative to wall
  const artWidthPercent = (width / WALL_WIDTH_INCHES) * 100;
  const artHeightPercent = (length / WALL_HEIGHT_INCHES) * 100;

  // Scale references (Couch/Sofa silhouette details)
  // Standard 3-seater sofa is approx 84" wide (7ft) and 32" high
  const sofaWidthPercent = (84 / WALL_WIDTH_INCHES) * 100;
  const sofaHeightPercent = (32 / WALL_HEIGHT_INCHES) * 100;

  return (
    <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
        <LayoutGrid size={24} /> Interactive Wall Visualizer (Scale: 10ft x 12ft Wall)
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Preview how <strong>"{artwork.title}"</strong> ({width}" x {length}") fits in a room compared to a standard 7ft sofa.
      </p>

      <div className="visualizer-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        
        {/* Visualizer Wall Sandbox */}
        <div 
          className="room-wall"
          style={{
            height: '420px',
            position: 'relative',
            backgroundColor: selectedWall.color,
            backgroundImage: selectedWall.grid ? `radial-gradient(${selectedWall.accent} 1px, transparent 1px)` : 'none',
            backgroundSize: selectedWall.grid ? '20px 20px' : 'auto',
            border: '8px solid #222',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.5s ease',
            boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8)'
          }}
        >
          {/* Ceiling shadow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)', zIndex: 2 }} />
          
          {/* Baseboard/Floor */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '24px', backgroundColor: '#3e2723', borderTop: '2px solid #5d4037', zIndex: 2 }} />

          {/* Scale Sofa Silhouette */}
          <div 
            className="sofa-silhouette"
            style={{
              position: 'absolute',
              bottom: '24px', // resting on baseboard
              width: `${sofaWidthPercent}%`,
              height: `${sofaHeightPercent}%`,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(2px)',
              border: '2px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              borderRadius: '16px 16px 4px 4px',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 -4px 10px rgba(0,0,0,0.3)'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>Standard 7ft Sofa</span>
          </div>

          {/* Scaled Painting Container */}
          <div
            className={`visualizer-artwork-wrapper ${selectedFrame.class}`}
            style={{
              position: 'absolute',
              bottom: `${sofaHeightPercent + 15}%`, // hanging above the sofa
              width: `${artWidthPercent * scale}%`,
              height: `${artHeightPercent * scale}%`,
              maxHeight: '70%',
              maxWidth: '80%',
              backgroundImage: `url(${artwork.id ? getArtworkImageUrl(artwork.id) : (artwork.image || '')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'all 0.3s ease',
              zIndex: 4,
              boxShadow: '0 12px 30px rgba(0,0,0,0.8)'
            }}
          >
            {/* Spotlight reflection */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.15), transparent 70%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Visualizer Customizers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Wall Styles List */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Select Wall Backdrop</h3>
            <div className="wall-presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
              {WALL_STYLES.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWall(w)}
                  style={{
                    backgroundColor: w.color,
                    border: selectedWall.id === w.id ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    height: '42px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: selectedWall.id === w.id ? '0 0 8px rgba(212,175,55,0.3)' : 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                  title={w.name}
                >
                  {selectedWall.id === w.id && <Check size={16} color={w.color === '#ffffff' ? '#000' : '#fff'} />}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
              Active: <strong>{selectedWall.name}</strong>
            </p>
          </div>

          {/* Frame Style Select */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Select Frame Style</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {FRAME_STYLES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFrame(f)}
                  style={{
                    background: selectedFrame.id === f.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedFrame.id === f.id ? 'var(--accent-gold)' : 'var(--border-color)',
                    color: selectedFrame.id === f.id ? 'var(--accent-gold)' : 'var(--text-primary)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textAlign: 'left',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  {f.name}
                  {selectedFrame.id === f.id && <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-gold)', borderRadius: '50%' }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Sizing Multiplier Controls */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Adjust Scale</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))} 
                className="btn-secondary" 
                style={{ padding: '0.5rem', flex: 1 }}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button 
                onClick={() => setScale(1)} 
                className="btn-secondary" 
                style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 2 }}
              >
                Reset (100%)
              </button>
              <button 
                onClick={() => setScale(prev => Math.min(1.5, prev + 0.1))} 
                className="btn-secondary" 
                style={{ padding: '0.5rem', flex: 1 }}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
