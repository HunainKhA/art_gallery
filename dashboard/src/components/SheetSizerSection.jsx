import React, { useState, useEffect } from 'react';
import { Calculator, Check, AlertCircle, Trash2, Plus, Printer } from 'lucide-react';
import { getApiUrl } from '../services/api';

// Guillotine 2D Bin Packing Layout Algorithm for mixed-size rectangles
class GuillotinePacker {
  constructor(width, height) {
    this.width = width; // X-axis (width of sheet)
    this.height = height; // Y-axis (height/length of sheet)
    this.usedRectangles = []; // packed rectangles: { x, y, w, h, origW, origH, label, color, rotated }
    this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
  }

  pack(rects) {
    // Sort rectangles by max dimension first, then area descending
    const sortedRects = [...rects].sort((a, b) => {
      const maxDimA = Math.max(a.w, a.h);
      const maxDimB = Math.max(b.w, b.h);
      if (maxDimB !== maxDimA) return maxDimB - maxDimA;
      return (b.w * b.h) - (a.w * a.h);
    });

    const colors = [
      'rgba(212, 175, 55, 0.4)', // Gold
      'rgba(16, 185, 129, 0.4)', // Green
      'rgba(59, 130, 246, 0.4)', // Blue
      'rgba(239, 68, 68, 0.4)',  // Red
      'rgba(139, 92, 246, 0.4)', // Purple
      'rgba(236, 72, 153, 0.4)', // Pink
      'rgba(245, 158, 11, 0.4)', // Orange
      'rgba(20, 184, 166, 0.4)'  // Teal
    ];

    const unpacked = [];

    for (let i = 0; i < sortedRects.length; i++) {
      const rect = sortedRects[i];
      const color = colors[i % colors.length];
      let packed = false;

      // Find first free rectangle that fits the item
      for (let j = 0; j < this.freeRectangles.length; j++) {
        const free = this.freeRectangles[j];

        const fitsNormal = rect.w <= free.w && rect.h <= free.h;
        const fitsRotated = rect.h <= free.w && rect.w <= free.h;

        if (fitsNormal || fitsRotated) {
          let useW = rect.w;
          let useH = rect.h;
          let rotated = false;

          // If it fits both orientations, choose the one with less remaining aspect ratio distortion
          if (fitsNormal && fitsRotated) {
            const normalWaste = (free.w - rect.w) + (free.h - rect.h);
            const rotatedWaste = (free.w - rect.h) + (free.h - rect.w);
            if (rotatedWaste < normalWaste) {
              useW = rect.h;
              useH = rect.w;
              rotated = true;
            }
          } else if (fitsRotated) {
            useW = rect.h;
            useH = rect.w;
            rotated = true;
          }

          // Place rectangle at the origin of this free rectangle space
          const newRect = {
            x: free.x,
            y: free.y,
            w: useW,
            h: useH,
            origW: rect.origW,
            origH: rect.origH,
            label: rect.label,
            color: color,
            rotated: rotated
          };

          this.usedRectangles.push(newRect);

          // Split remaining free rectangle space using Guillotine Split heuristics
          const remainingW = free.w - useW;
          const remainingH = free.h - useH;

          // Remove the selected free block
          this.freeRectangles.splice(j, 1);

          // Add split sub-rectangles back to free space pool
          if (remainingW > remainingH) {
            // Split vertically
            if (remainingW > 0) {
              this.freeRectangles.push({
                x: free.x + useW,
                y: free.y,
                w: remainingW,
                h: free.h
              });
            }
            if (remainingH > 0) {
              this.freeRectangles.push({
                x: free.x,
                y: free.y + useH,
                w: useW,
                h: remainingH
              });
            }
          } else {
            // Split horizontally
            if (remainingH > 0) {
              this.freeRectangles.push({
                x: free.x,
                y: free.y + useH,
                w: free.w,
                h: remainingH
              });
            }
            if (remainingW > 0) {
              this.freeRectangles.push({
                x: free.x + useW,
                y: free.y,
                w: remainingW,
                h: useH
              });
            }
          }

          // Sort free rectangles by area (smallest first) to prioritize packing smaller slots first
          this.freeRectangles.sort((a, b) => (a.w * a.h) - (b.w * b.h));

          packed = true;
          break;
        }
      }

      if (!packed) {
        unpacked.push(rect);
      }
    }

    return {
      packed: this.usedRectangles,
      unpacked: unpacked,
      free: this.freeRectangles
    };
  }
}

const getFontSizeForBox = (text, w, h) => {
  const clean = text.replace(/\s+#\d+$/, '');
  const baseSize = Math.max(1.3, Math.min(3.2, (w / clean.length) * 1.8));
  return Math.min(baseSize, h * 0.5);
};

const fitTextToBox = (text, w, h) => {
  const clean = text.replace(/\s+#\d+$/, '');
  const fontSize = getFontSizeForBox(clean, w, h);
  const maxChars = Math.floor(w / (fontSize * 0.44));
  if (clean.length > maxChars && maxChars > 3) {
    return clean.substring(0, maxChars - 3) + '...';
  }
  return clean;
};

export default function SheetSizerSection() {
  // Tab State
  const [activeTab, setActiveTab] = useState('suggester'); // 'suggester' or 'mixed'

  // Tab 1: Sizing Suggester State
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [isBulk, setIsBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const [calculating, setCalculating] = useState(false);

  // Shared sheet preset dropdown state
  const [sheets, setSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [customSheetLength, setCustomSheetLength] = useState('');
  const [customSheetWidth, setCustomSheetWidth] = useState('');

  // Tab 3: Mixed Sizes Layout Sizer State (Visual Diagram)
  const [mixedCuts, setMixedCuts] = useState([{ id: 1, label: '', length: '', width: '', qty: 1 }]);
  const [mixedResult, setMixedResult] = useState(null);

  // Fetch standard sheets on load
  useEffect(() => {
    fetch(getApiUrl("/api/calculator/sheets"))
      .then(res => res.json())
      .then(data => {
        setSheets(data);
        setSelectedSheetId('auto');
      })
      .catch(err => console.error("Error fetching sheets:", err));
  }, []);

  const handleSuggest = (e) => {
    e.preventDefault();
    setCalculating(true);
    setResult(null);
    setBulkResults([]);

    if (isBulk) {
      const lines = bulkText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        alert("Please enter at least one artwork dimensions entry.");
        setCalculating(false);
        return;
      }

      const requests = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        let label = `Artwork ${i + 1}`;
        let l, w;

        if (parts.length === 3) {
          label = parts[0];
          w = parseFloat(parts[1]);
          l = parseFloat(parts[2]);
        } else if (parts.length === 2) {
          w = parseFloat(parts[0]);
          l = parseFloat(parts[1]);
        } else {
          alert(`Invalid format on line ${i + 1}: "${lines[i]}"\nUse: Width, Height OR Label, Width, Height`);
          setCalculating(false);
          return;
        }

        if (isNaN(l) || isNaN(w)) {
          alert(`Invalid numbers on line ${i + 1}: "${lines[i]}"`);
          setCalculating(false);
          return;
        }

        requests.push({ label, l, w });
      }

      const promises = requests.map(req => {
        return fetch(getApiUrl("/api/calculator/suggest-sheet"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artwork_length: req.l, artwork_width: req.w })
        })
          .then(res => res.json())
          .then(data => ({
            label: req.label,
            length: req.l,
            width: req.w,
            ...data
          }));
      });

      Promise.all(promises)
        .then(results => {
          setBulkResults(results);
          setCalculating(false);
        })
        .catch(err => {
          alert("Error doing bulk sizer check: " + err.message);
          setCalculating(false);
        });

      return;
    }

    if (!length || !width) {
      setCalculating(false);
      return;
    }
    
    fetch(getApiUrl("/api/calculator/suggest-sheet"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artwork_length: parseFloat(length),
        artwork_width: parseFloat(width)
      })
    })
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setCalculating(false);
      })
      .catch(err => {
        alert("Calculation error: " + err.message);
        setCalculating(false);
      });
  };

  // Dynamic Cuts List live calculation helper
  const calculatePlan = (cuts, sheetId, customL, customW, sheetsList = sheets) => {
    const margin = 0.0;
    const rectsToPack = [];

    for (let i = 0; i < cuts.length; i++) {
      const row = cuts[i];
      const l = parseFloat(row.length);
      const w = parseFloat(row.width);
      const qty = parseInt(row.qty, 10);

      if (isNaN(l) || isNaN(w) || isNaN(qty) || l <= 0 || w <= 0 || qty <= 0) {
        return null; // incomplete or invalid input
      }

      for (let q = 0; q < qty; q++) {
        rectsToPack.push({
          w: w + 2 * margin,
          h: l + 2 * margin,
          origW: w,
          origH: l,
          baseLabel: row.label && row.label.trim() ? row.label.trim() : `Art ${String.fromCharCode(65 + i)}`
        });
      }
    }

    if (rectsToPack.length === 0) return null;

    const labelCounts = {};
    rectsToPack.forEach(r => {
      labelCounts[r.baseLabel] = (labelCounts[r.baseLabel] || 0) + 1;
    });

    const labelIndices = {};
    rectsToPack.forEach(r => {
      const count = labelCounts[r.baseLabel];
      if (count > 1) {
        labelIndices[r.baseLabel] = (labelIndices[r.baseLabel] || 0) + 1;
        r.label = `${r.baseLabel} #${labelIndices[r.baseLabel]}`;
      } else {
        r.label = r.baseLabel;
      }
    });

    let sheetL = 0;
    let sheetW = 0;
    let sheetName = "";
    let bestPreset = null;

    if (sheetId === 'auto') {
      if (sheetsList.length === 0) return null;

      const candidates = [];
      for (const s of sheetsList) {
        const tempL = parseFloat(s.length);
        const tempW = parseFloat(s.width);
        if (isNaN(tempL) || isNaN(tempW) || tempL <= 0 || tempW <= 0) continue;

        const packer = new GuillotinePacker(tempW, tempL);
        const packingResult = packer.pack(rectsToPack);
        
        candidates.push({
          preset: s,
          packedCount: packingResult.packed.length,
          unpackedCount: packingResult.unpacked.length,
          price: parseFloat(s.price) || 0.0,
          area: tempL * tempW,
          utilization: (packingResult.packed.reduce((sum, r) => sum + (r.w * r.h), 0) / (tempL * tempW)) * 100
        });
      }

      const perfectFits = candidates.filter(c => c.unpackedCount === 0);
      if (perfectFits.length > 0) {
        perfectFits.sort((a, b) => {
          if (a.price !== b.price) return a.price - b.price;
          return a.area - b.area;
        });
        bestPreset = perfectFits[0].preset;
      } else if (candidates.length > 0) {
        candidates.sort((a, b) => {
          if (a.packedCount !== b.packedCount) return b.packedCount - a.packedCount;
          return b.utilization - a.utilization;
        });
        bestPreset = candidates[0].preset;
      }

      if (!bestPreset) return null;
      sheetL = parseFloat(bestPreset.length);
      sheetW = parseFloat(bestPreset.width);
      sheetName = `${bestPreset.name} (Auto-Selected)`;
    } else if (sheetId === 'custom') {
      sheetL = parseFloat(customL);
      sheetW = parseFloat(customW);
      sheetName = "Custom Sheet";
    } else {
      const selected = sheetsList.find(s => s.id.toString() === sheetId);
      if (!selected) return null;
      sheetL = parseFloat(selected.length);
      sheetW = parseFloat(selected.width);
      sheetName = selected.name;
    }

    if (isNaN(sheetL) || isNaN(sheetW) || sheetL <= 0 || sheetW <= 0) return null;

    const packer = new GuillotinePacker(sheetW, sheetL);
    const packingResult = packer.pack(rectsToPack);

    const sheetArea = sheetW * sheetL;
    const utilizedArea = packingResult.packed.reduce((sum, r) => sum + (r.w * r.h), 0);
    const wastageArea = sheetArea - utilizedArea;
    const utilizationPercent = (utilizedArea / sheetArea) * 100;
    const wastagePercent = 100 - utilizationPercent;

    return {
      sheetName,
      sheetLength: sheetL,
      sheetWidth: sheetW,
      packed: packingResult.packed,
      unpacked: packingResult.unpacked,
      free: packingResult.free,
      sheetArea: Math.round(sheetArea * 10) / 10,
      utilizedArea: Math.round(utilizedArea * 10) / 10,
      wastageArea: Math.round(wastageArea * 10) / 10,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      wastagePercent: Math.round(wastagePercent * 100) / 100
    };
  };

  // Tab 3: Dynamic Cuts List row operations
  const handleAddMixedRow = () => {
    const updated = [...mixedCuts, { id: Date.now(), label: '', length: '', width: '', qty: 1 }];
    setMixedCuts(updated);
    if (mixedResult) {
      const liveResult = calculatePlan(updated, selectedSheetId, customSheetLength, customSheetWidth);
      if (liveResult) setMixedResult(liveResult);
    }
  };

  const handleRemoveMixedRow = (id) => {
    if (mixedCuts.length === 1) return;
    const updated = mixedCuts.filter(row => row.id !== id);
    setMixedCuts(updated);
    if (mixedResult) {
      const liveResult = calculatePlan(updated, selectedSheetId, customSheetLength, customSheetWidth);
      if (liveResult) setMixedResult(liveResult);
    }
  };

  const handleMixedRowChange = (id, field, val) => {
    const updated = mixedCuts.map(row => {
      if (row.id === id) {
        return { ...row, [field]: val };
      }
      return row;
    });
    setMixedCuts(updated);
    
    // Live update cutting plan if already generated
    if (mixedResult) {
      const liveResult = calculatePlan(updated, selectedSheetId, customSheetLength, customSheetWidth);
      if (liveResult) {
        setMixedResult(liveResult);
      }
    }
  };

  const handleCalculateMixedYield = (e) => {
    if (e) e.preventDefault();
    const result = calculatePlan(mixedCuts, selectedSheetId, customSheetLength, customSheetWidth);
    if (!result) {
      alert("Please ensure all rows have valid positive numbers for Width, Height, and Qty.");
      return;
    }
    setMixedResult(result);
  };

  // Open a print window with the visual layout and preset selection
  const handlePrintMixedPlan = () => {
    if (!mixedResult) return;

    const svgElement = document.getElementById('cutting-plan-svg');
    const svgHtml = svgElement ? svgElement.outerHTML : '';

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Please allow popups to print the glass cutting layout plan.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Glass Cutting Plan - ${mixedResult.sheetName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              padding: 30px;
              margin: 0;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              letter-spacing: -0.025em;
              color: #111827;
              margin: 0;
            }
            .sheet-banner {
              background: #f3f4f6;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 14px;
              margin-top: 12px;
              font-size: 17px;
              font-weight: 700;
              text-align: center;
              color: #b4af37; /* Match gallery branding gold tone in print */
            }
            .section-title {
              font-size: 15px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 25px;
              margin-bottom: 12px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 6px;
              color: #374151;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              font-size: 14px;
              margin-bottom: 20px;
              background: #fafafa;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #f3f4f6;
            }
            .stats-grid div {
              color: #4b5563;
            }
            .stats-grid strong {
              color: #111827;
            }
            .diagram-container {
              display: flex;
              justify-content: center;
              margin: 20px 0;
            }
            svg {
              max-width: 100%;
              max-height: 480px;
              border: 0.5px solid #000000;
              background: #ffffff;
            }
            /* Style SVG items to look solid black/gray on print */
            svg rect {
              stroke: #000000 !important;
              stroke-width: 0.05px !important;
            }
            svg text {
              fill: #333333 !important;
              text-anchor: middle !important;
              dominant-baseline: middle !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 13px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 10px;
              text-align: left;
            }
            th {
              background: #f9fafb;
              font-weight: 700;
              color: #374151;
            }
            td {
              color: #4b5563;
            }
            .no-print-btn {
              text-align: center;
              margin-top: 35px;
            }
            button {
              padding: 12px 24px;
              font-size: 14px;
              font-weight: 700;
              background: #111827;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            @media print {
              .no-print-btn {
                display: none;
              }
              body {
                padding: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Framing Glass Cutting Plan</div>
            <div class="sheet-banner">
              Glass Sheet Size: ${mixedResult.sheetWidth}" x ${mixedResult.sheetLength}"
            </div>
          </div>

          <div class="stats-grid">
            <div>Fitted Cuts: <strong>${mixedResult.packed.length} / ${mixedResult.packed.length + mixedResult.unpacked.length} cuts</strong></div>
            <div>Total Sheet Area: <strong>${mixedResult.sheetArea} sq. in.</strong></div>
            <div>Material Utilization: <strong>${mixedResult.utilizationPercent}%</strong> (${mixedResult.utilizedArea} sq. in.)</div>
            <div>Remaining / Offcut Area: <strong>${mixedResult.wastagePercent}%</strong> (${mixedResult.wastageArea} sq. in.)</div>
          </div>

          <div class="section-title">Visual Cutting Layout Map</div>
          <div class="diagram-container">
            ${svgHtml}
          </div>

          <div class="section-title">Cut Specifications</div>
          <table>
            <thead>
              <tr>
                <th>Cut ID</th>
                <th>Target Art Size (W x H)</th>
                <th>Required Cut Dimensions (W x H)</th>
                <th>Glass Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${mixedResult.packed.map(r => `
                <tr>
                  <td><strong>${r.label}</strong></td>
                  <td>${r.origW}" x ${r.origH}"</td>
                  <td>${r.w}" x ${r.h}"</td>
                  <td>Museum clarity Glass</td>
                  <td>Available</td>
                </tr>
              `).join('')}
              ${mixedResult.unpacked.map(r => `
                <tr style="color: #dc2626; background: #fef2f2;">
                  <td><strong>${r.label}</strong></td>
                  <td>${r.origW}" x ${r.origH}"</td>
                  <td>${r.w}" x ${r.h}"</td>
                  <td>Museum clarity Glass</td>
                  <td><strong>Not Available</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="no-print-btn">
            <button onclick="window.print();">Print Plan</button>
          </div>

          <script>
            // Automatically open browser print dialog after loading content
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 200);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: (activeTab === 'suggester' && isBulk && bulkResults.length > 0) || (activeTab === 'mixed' && mixedResult) ? '960px' : '600px', margin: '0 auto', transition: 'max-width 0.3s ease' }}>
      <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calculator size={20} /> Framing Glass Sheet Sizer
      </h2>
      
      {/* Tab Switcher Header */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setActiveTab('suggester'); setMixedResult(null); }}
          type="button"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            border: activeTab === 'suggester' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'suggester' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
            color: activeTab === 'suggester' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Sizing Suggester
        </button>
        <button
          onClick={() => setActiveTab('mixed')}
          type="button"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            border: activeTab === 'mixed' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
            background: activeTab === 'mixed' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
            color: activeTab === 'mixed' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Mixed Layout Sizer
        </button>
      </div>

      {activeTab === 'suggester' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Input the raw artwork measurements (inches) to calculate the best-fitting standard framing glass sheet size preset and minimize raw material wastage.
          </p>

          <form onSubmit={handleSuggest} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Toggle between single and bulk entry modes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="bulkSizingMode"
                checked={isBulk} 
                onChange={(e) => {
                  setIsBulk(e.target.checked);
                  setResult(null);
                  setBulkResults([]);
                }} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
              <label htmlFor="bulkSizingMode" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                Bulk Sizing Mode (Check Multiple Artworks)
              </label>
            </div>

            {isBulk ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Bulk Artwork Dimensions (one per line - enter Width first, then Height/Length) *
                </label>
                <textarea 
                  value={bulkText} 
                  onChange={(e) => setBulkText(e.target.value)} 
                  rows="6" 
                  style={{ 
                    width: '100%', 
                    padding: '0.65rem', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }} 
                  required 
                  placeholder={'Format: Width, Height OR Label, Width, Height\nExample:\n18, 24\nArt 2, 20, 30\n30, 40'}
                />
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Note: Use commas to separate dimensions. Always enter Width first, then Height/Length (inches).
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Artwork Width (inches)</label>
                  <input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} required={!isBulk} placeholder="e.g. 18" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Artwork Length / Height (inches)</label>
                  <input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} required={!isBulk} placeholder="e.g. 24" />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }} disabled={calculating}>
              {calculating ? 'Analyzing Glass Presets...' : 'Calculate Glass Suggestion'}
            </button>
          </form>

          {/* Single Mode Result */}
          {!isBulk && result && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              {result.fit_found ? (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', padding: '1.25rem' }}>
                  <h4 style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem', fontSize: '1rem' }}>
                    <Check size={18} /> Best Standard Glass Sheet Preset Fit Found:
                  </h4>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>{result.best_fit.name}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div>Glass Sheet Dimensions: <strong>{result.best_fit.width}" x {result.best_fit.length}"</strong></div>
                    <div>Suggested Orientation: <strong>{result.best_fit.suggested_orientation}</strong></div>
                    <div>Remaining / Offcut: <strong style={{ color: result.best_fit.wastage_percent > 30 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{result.best_fit.wastage_percent}%</strong></div>
                    <div>Glass Sheet Cost: <strong>{result.best_fit.price} PKR</strong></div>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
                  <AlertCircle size={18} />
                  <p style={{ fontSize: '0.9rem' }}>{result.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Bulk Sizing Mode Results Table */}
          {isBulk && bulkResults.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem' }}>Bulk Glass Sizing Suggestions</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>Artwork Label</th>
                    <th style={{ padding: '0.5rem' }}>Artwork Size (W x H)</th>
                    <th style={{ padding: '0.5rem' }}>Glass Preset Recommendation</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost (PKR)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Remaining (%)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Orientation</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{row.label}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{row.width}" x {row.length}"</td>
                      {row.fit_found ? (
                        <>
                          <td style={{ padding: '0.75rem 0.5rem', color: '#fff' }}>{row.best_fit.name} ({row.best_fit.width}" x {row.best_fit.length}")</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{row.best_fit.price} PKR</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: row.best_fit.wastage_percent > 30 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{row.best_fit.wastage_percent}%</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.best_fit.suggested_orientation}</td>
                        </>
                      ) : (
                        <>
                          <td colSpan="4" style={{ padding: '0.75rem 0.5rem', color: 'var(--accent-red)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <AlertCircle size={14} /> Custom Cut Glass Required (Min size: {row.suggested_custom_size})
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mixed' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Enter multiple artwork sizes and quantities to calculate the optimal 2D guillotine cutting layout plan and visualize the cuts on the selected sheet.
          </p>

          <form onSubmit={handleCalculateMixedYield} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Sheet Preset Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Glass Sheet Preset *</label>
              <select 
                value={selectedSheetId} 
                onChange={(e) => setSelectedSheetId(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '0.65rem', 
                  background: 'var(--bg-input)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="auto">Auto-Select Best Sheet Preset</option>
                {sheets.map(s => (
                  <option key={s.id} value={s.id.toString()}>{s.name} ({s.width}" x {s.length}")</option>
                ))}
                <option value="custom">Custom Sheet Size...</option>
              </select>
            </div>

            {/* Custom Sheet Size Input fields */}
            {selectedSheetId === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Sheet Height / Length (inches) *</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={customSheetLength} 
                    onChange={(e) => setCustomSheetLength(e.target.value)} 
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                    required={selectedSheetId === 'custom'} 
                    placeholder="e.g. 96" 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Sheet Width (inches) *</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={customSheetWidth} 
                    onChange={(e) => setCustomSheetWidth(e.target.value)} 
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                    required={selectedSheetId === 'custom'} 
                    placeholder="e.g. 60" 
                  />
                </div>
              </div>
            )}

            {/* Dynamic Mixed Cuts Input List */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Cuts List (Specify Target Dimensions & Quantities)</label>
              
              {/* Table Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '2rem 2.2fr 1fr 1fr 1fr 2.5rem', gap: '0.75rem', alignItems: 'center', marginBottom: '0.35rem', paddingLeft: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Painting Name / Label</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Width (in)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Height (in)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Qty</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Delete</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {mixedCuts.map((cut, idx) => (
                  <div key={cut.id} style={{ display: 'grid', gridTemplateColumns: '2rem 2.2fr 1fr 1fr 1fr 2.5rem', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Index Label */}
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    
                    {/* Label Input */}
                    <div>
                      <input 
                        type="text" 
                        value={cut.label || ''} 
                        onChange={(e) => handleMixedRowChange(cut.id, 'label', e.target.value)} 
                        placeholder="Artwork Name (e.g. Flower)" 
                        style={{ width: '100%', padding: '0.5rem 0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                      />
                    </div>
                    
                    {/* Width Input */}
                    <div>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={cut.width} 
                        onChange={(e) => handleMixedRowChange(cut.id, 'width', e.target.value)} 
                        placeholder="Width (in)" 
                        style={{ width: '100%', padding: '0.5rem 0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                        required 
                      />
                    </div>

                    {/* Length/Height Input */}
                    <div>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={cut.length} 
                        onChange={(e) => handleMixedRowChange(cut.id, 'length', e.target.value)} 
                        placeholder="Height (in)" 
                        style={{ width: '100%', padding: '0.5rem 0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                        required 
                      />
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <input 
                        type="number" 
                        min="1" 
                        value={cut.qty} 
                        onChange={(e) => handleMixedRowChange(cut.id, 'qty', e.target.value)} 
                        placeholder="Qty" 
                        style={{ width: '100%', padding: '0.5rem 0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }} 
                        required 
                      />
                    </div>

                    {/* Delete button */}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveMixedRow(cut.id)} 
                      disabled={mixedCuts.length === 1}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid rgba(239, 68, 68, 0.15)', 
                        borderRadius: '6px', 
                        color: 'var(--accent-red)', 
                        padding: '0.5rem',
                        cursor: mixedCuts.length === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: mixedCuts.length === 1 ? 0.4 : 1
                      }}
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add row button */}
              <button 
                type="button" 
                onClick={handleAddMixedRow}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  fontSize: '0.8rem', 
                  color: 'var(--accent-gold)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  marginTop: '0.5rem'
                }}
              >
                <Plus size={16} /> Add Artwork Size Row
              </button>
            </div>



            <button type="submit" className="btn-primary" style={{ padding: '0.8rem' }}>
              Generate Visual Cutting Plan
            </button>
          </form>

          {/* Mixed Sizes Yield Results Display */}
          {mixedResult && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              
              {/* Detailed stats card */}
              <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.15)', borderRadius: '8px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                    <Check size={18} /> Mixed Cuts Sizer Results:
                  </h4>
                  <button 
                    type="button" 
                    onClick={handlePrintMixedPlan}
                    className="btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Printer size={14} /> Print Cutting Plan
                  </button>
                </div>

                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                  Successfully Packed: <span style={{ color: 'var(--accent-gold)' }}>{mixedResult.packed.length} / {mixedResult.packed.length + mixedResult.unpacked.length} cuts</span>
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div>Glass Sheet Size: <strong>{mixedResult.sheetWidth}" x {mixedResult.sheetLength}" ({mixedResult.sheetName})</strong></div>
                  <div>Total Sheet Area: <strong>{mixedResult.sheetArea} sq. in.</strong></div>
                  <div>Material Utilization: <strong style={{ color: 'var(--accent-green)' }}>{mixedResult.utilizationPercent}%</strong> ({mixedResult.utilizedArea} sq. in.)</div>
                  <div>Remaining / Offcut: <strong style={{ color: mixedResult.wastagePercent > 30 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{mixedResult.wastagePercent}%</strong> ({mixedResult.wastageArea} sq. in.)</div>
                </div>

                {mixedResult.unpacked.length > 0 && (
                  <div style={{ marginTop: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.75rem', display: 'flex', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '0.8rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                      <strong>These items could not fit on this sheet (unpacked):</strong>
                      <ul style={{ margin: '0.35rem 0 0 1rem', padding: 0 }}>
                        {mixedResult.unpacked.map((item, idx) => (
                          <li key={idx}>{item.label} (Required cut size: {item.w}" x {item.h}")</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Interactive SVG Diagram */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ color: '#fff', fontSize: '0.95rem', alignSelf: 'flex-start', marginBottom: '1rem', fontWeight: 600 }}>Visual Cutting layout Diagram</h4>
                
                {/* SVG Wrap */}
                <div style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
                  <svg 
                    id="cutting-plan-svg"
                    viewBox={`0 0 ${mixedResult.sheetWidth} ${mixedResult.sheetLength}`}
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      background: 'rgba(0,0,0,0.2)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      overflow: 'visible'
                    }}
                  >
                    {/* SVG Grid Lines helper */}
                    <defs>
                      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width={mixedResult.sheetWidth} height={mixedResult.sheetLength} fill="url(#grid)" />

                    {/* Render Packed Rectangles */}
                    {mixedResult.packed.map((rect, idx) => (
                      <g key={idx}>
                        <rect
                          x={rect.x}
                          y={rect.y}
                          width={rect.w}
                          height={rect.h}
                          fill={rect.color}
                          stroke="rgba(0, 0, 0, 0.6)"
                          strokeWidth="0.15"
                          style={{ transition: 'all 0.3s ease' }}
                        />
                        {/* Centered HTML ForeignObject for Exact 14px Name & 12px Dimensions */}
                        <foreignObject
                          x={rect.x}
                          y={rect.y}
                          width={rect.w}
                          height={rect.h}
                          style={{ overflow: 'hidden', pointerEvents: 'none' }}
                        >
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '4px',
                            boxSizing: 'border-box',
                            userSelect: 'none'
                          }}>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#ffffff',
                              lineHeight: 1.25,
                              textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.8)',
                              wordBreak: 'break-word',
                              maxWidth: '100%'
                            }}>
                              {rect.label.replace(/\s+#\d+$/, '')}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#ffffff',
                              lineHeight: 1.25,
                              marginTop: '3px',
                              textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.8)'
                            }}>
                              {rect.origW}"x{rect.origH}"{rect.rotated ? ' (R)' : ''}
                            </span>
                          </div>
                        </foreignObject>
                      </g>
                    ))}

                    {/* Render Free Rectangles (Remaining Space) */}
                    {mixedResult.free && mixedResult.free.map((rect, idx) => {
                      const label = `${rect.w}" x ${rect.h}" Left`;
                      const isRotated = rect.h > rect.w && rect.w < 6;
                      
                      return (
                        <g key={`free-${idx}`}>
                          <rect
                            x={rect.x}
                            y={rect.y}
                            width={rect.w}
                            height={rect.h}
                            fill="rgba(220, 220, 225, 0.55)"
                            stroke="rgba(0, 0, 0, 0.4)"
                            strokeWidth="0.15"
                            strokeDasharray="0.8,0.8"
                          />
                          {rect.w >= 1.5 && rect.h >= 1.5 && (
                            <foreignObject
                              x={rect.x}
                              y={rect.y}
                              width={rect.w}
                              height={rect.h}
                              style={{ overflow: 'hidden', pointerEvents: 'none' }}
                            >
                              <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '2px',
                                boxSizing: 'border-box'
                              }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#000000',
                                  transform: isRotated ? 'rotate(-90deg)' : 'none',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {label}
                                </span>
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
                
                {/* Visual Legend / Details */}
                <div style={{ marginTop: '1.25rem', width: '100%', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}></div>
                    <span>Remaining / Offcut Area</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <strong style={{ color: 'var(--accent-gold)' }}>(R)</strong>
                    <span>Rotated Cut to Fit</span>
                  </div>
                  <div style={{ width: '100%', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Note: Cut boundaries show final sizes. Scale is normalized for fitting in the UI.
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
