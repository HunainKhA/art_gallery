import React from 'react';
import { Video } from 'lucide-react';

export default function VideosSection() {
  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => alert("Video player launching soon...")}>
          <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <Video size={40} color="var(--accent-gold)" />
            <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', background: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>4:15</div>
          </div>
          <h3 style={{ fontSize: '1.15rem', marginTop: '1rem', color: '#fff' }}>Artist Interview: Calligrapher Master Class</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>An exclusive interview discussing the inspiration behind the Sacred Arts exhibition.</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => alert("Video player launching soon...")}>
          <div style={{ width: '100%', height: '220px', backgroundColor: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <Video size={40} color="var(--accent-gold)" />
            <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', background: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>8:40</div>
          </div>
          <h3 style={{ fontSize: '1.15rem', marginTop: '1rem', color: '#fff' }}>Framer's Heaven: Behind the Craftsmanship</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>A detailed look at how canvases are stretched and nested frames are aligned.</p>
        </div>
      </div>
    </div>
  );
}
