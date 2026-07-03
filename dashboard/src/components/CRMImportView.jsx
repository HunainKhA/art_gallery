import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { CONFIGS } from './crmConfigs';

const getModulePath = (moduleName) => {
  if (moduleName === 'collection_types') return 'collection-types';
  if (moduleName === 'collections') return 'artworks';
  return moduleName;
};

export default function CRMImportView({ module, onSuccess }) {
  const config = CONFIGS[module];
  const importFields = config?.importFields || [];
  
  const [csvData, setCsvData] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("Empty or invalid CSV file.");
        setParsing(false);
        return;
      }

      // Simple CSV split (handling commas)
      const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
        const rowData = {};
        headers.forEach((header, idx) => {
          if (importFields.includes(header)) {
            rowData[header] = row[idx] || '';
          }
        });
        parsedRows.push(rowData);
      }

      setCsvData(parsedRows);
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (csvData.length === 0) return;
    setImporting(true);

    let endpoint = `http://localhost:8000/api/${getModulePath(module)}/import`;
    if (['exhibitions', 'framerheaven', 'catalogues', 'flashimages', 'videos'].includes(module)) {
      endpoint = `http://localhost:8000/api/crm/${module}/import`;
    }

    const payloadKey = module === 'collection_types' ? 'types' : (module === 'collections' ? 'artworks' : module);
    const payload = {
      [payloadKey]: csvData
    };

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("CSV database sync failed.");
        return res.json();
      })
      .then(result => {
        setImporting(false);
        alert(result.message || "CSV data successfully imported!");
        setCsvData([]);
        if (onSuccess) onSuccess();
      })
      .catch(err => {
        alert("Import failed: " + err.message);
        setImporting(false);
      });
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Upload size={20} /> Import {config?.title} Data from CSV
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Please upload a CSV file where the columns match the module fields. Standard fields: <strong style={{ color: 'var(--accent-gold)' }}>{importFields.join(', ')}</strong>.
      </p>

      <div style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: '8px', marginBottom: '2rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
        <input type="file" accept=".csv" onChange={handleFileUpload} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 auto' }} />
        {parsing && <p style={{ color: 'var(--accent-gold)', marginTop: '1rem' }}>Parsing CSV file...</p>}
      </div>

      {csvData.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '1rem', color: '#fff' }}>CSV Preview ({csvData.length} rows parsed)</h4>
          <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {importFields.map(f => <th key={f} style={{ padding: '0.5rem' }}>{f}</th>)}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    {importFields.map(f => <td key={f} style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{row[f] || 'N/A'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 10 && <p style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Showing first 10 rows only...</p>}
          </div>

          <button onClick={handleConfirmImport} className="btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={importing}>
            {importing ? "Importing records..." : "Confirm & Import to Database"}
          </button>
        </div>
      )}
    </div>
  );
}
