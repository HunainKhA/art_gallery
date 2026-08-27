import React, { useState, useEffect, useRef } from 'react';

/**
 * Utility to parse HTML or plain text biography into structured table fields
 */
export const parseBiography = (htmlOrText) => {
  if (!htmlOrText || typeof htmlOrText !== 'string' || htmlOrText.trim() === '') {
    return { dob: '', qualification: '', career: '', exhibitions: '', overview: '' };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlOrText, 'text/html');
  const tables = doc.querySelectorAll('table');

  let dob = '';
  let qualification = '';
  let career = '';
  let exhibitions = '';
  let overview = '';

  const cleanCellContent = (cell) => {
    if (!cell) return '';
    let text = cell.innerHTML
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    return text.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  };

  if (tables.length > 0) {
    const rows = doc.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const label = cells[0].textContent.trim().toLowerCase();
        const content = cleanCellContent(cells[1]);

        if (label.includes('birth') || label.includes('born') || label.includes('dob')) {
          dob = content;
        } else if (label.includes('qualif') || label.includes('educat')) {
          qualification = content;
        } else if (label.includes('career') || label.includes('work') || label.includes('experience')) {
          career = content;
        } else if (label.includes('exhib') || label.includes('show')) {
          exhibitions = content;
        }
      }
    });

    tables.forEach(t => t.remove());
    const remaining = doc.body.innerHTML
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();

    if (remaining) {
      overview = remaining.split('\n').map(l => l.trim()).filter(Boolean).join('\n\n');
    }
  } else {
    const dobMatch = htmlOrText.match(/(?:date of birth|born|dob)\s*:\s*([^\n\r]+)/i);
    const qualMatch = htmlOrText.match(/(?:qualification|education)\s*:\s*([\s\S]*?)(?=(?:career|experience|awards|exhibitions?|shows?|date of birth|born|dob)\s*:|$)/i);
    const careerMatch = htmlOrText.match(/(?:career|experience|awards)\s*:\s*([\s\S]*?)(?=(?:qualification|education|exhibitions?|shows?|date of birth|born|dob)\s*:|$)/i);
    const exhibMatch = htmlOrText.match(/(?:exhibitions?|shows?)\s*:\s*([\s\S]*?)(?=(?:qualification|education|career|experience|awards|date of birth|born|dob)\s*:|$)/i);

    if (dobMatch || qualMatch || careerMatch || exhibMatch) {
      if (dobMatch) dob = dobMatch[1].trim();
      if (qualMatch) qualification = qualMatch[1].trim();
      if (careerMatch) career = careerMatch[1].trim();
      if (exhibMatch) exhibitions = exhibMatch[1].trim();
    } else {
      overview = htmlOrText.replace(/<[^>]+>/g, '').trim();
    }
  }

  return { dob, qualification, career, exhibitions, overview };
};

/**
 * Utility to compile structured fields into standardized table HTML
 */
export const compileBiographyHtml = ({ dob = '', qualification = '', career = '', exhibitions = '', overview = '' }) => {
  const hasStructured = dob.trim() || qualification.trim() || career.trim() || exhibitions.trim();

  if (!hasStructured && !overview.trim()) {
    return '';
  }

  const formatParagraphs = (text) => {
    if (!text) return '';
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const yearMatch = line.match(/^(\d{4}(?:\s*-\s*\d{2,4})?)\s*(.*)/);
        if (yearMatch) {
          return `<p style="box-sizing: border-box; margin: 0px 0px 8px;"><span style="color: #ff9900; font-weight: bold;">${yearMatch[1]}</span>&nbsp;&nbsp;${yearMatch[2]}</p>`;
        }
        return `<p style="box-sizing: border-box; margin: 0px 0px 8px;">${line}</p>`;
      })
      .join('');
  };

  let rowsHtml = '';
  if (dob.trim()) {
    rowsHtml += `<tr><td style="font-weight: bold; width: 140px; vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">Date of Birth</td><td style="vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">${dob.trim()}</td></tr>`;
  }
  if (qualification.trim()) {
    rowsHtml += `<tr><td style="font-weight: bold; width: 140px; vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">Qualification</td><td style="vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">${formatParagraphs(qualification)}</td></tr>`;
  }
  if (career.trim()) {
    rowsHtml += `<tr><td style="font-weight: bold; width: 140px; vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">Career</td><td style="vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">${formatParagraphs(career)}</td></tr>`;
  }
  if (exhibitions.trim()) {
    rowsHtml += `<tr><td style="font-weight: bold; width: 140px; vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">Exhibitions</td><td style="vertical-align: top; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.1);">${formatParagraphs(exhibitions)}</td></tr>`;
  }

  let fullHtml = '';
  if (rowsHtml) {
    fullHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;" border="1" cellspacing="0" cellpadding="6"><tbody>${rowsHtml}</tbody></table>`;
  }

  if (overview.trim()) {
    const overviewParas = overview
      .split('\n\n')
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean).join('<br/>');
        return `<p style="margin-bottom: 10px; line-height: 1.6;">${lines}</p>`;
      })
      .join('');

    if (fullHtml) {
      fullHtml += `<div>${overviewParas}</div>`;
    } else {
      fullHtml = overviewParas;
    }
  }

  return fullHtml;
};

export default function ArtistBioBuilder({ value = '', onChange }) {
  const [sections, setSections] = useState({
    dob: '',
    qualification: '',
    career: '',
    exhibitions: '',
    overview: ''
  });
  const lastEmittedValueRef = useRef(value);

  // Sync with incoming value
  useEffect(() => {
    if (value !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = value;
      const parsed = parseBiography(value || '');
      setSections(parsed);
    }
  }, [value]);

  const handleFieldChange = (field, newVal) => {
    const updated = { ...sections, [field]: newVal };
    setSections(updated);
    const compiled = compileBiographyHtml(updated);
    lastEmittedValueRef.current = compiled;
    if (onChange) {
      onChange(compiled);
    }
  };

  return (
    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Artist Biography (Structured Table)
      </label>

      <div style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <tbody>
            {/* 1. Date of Birth */}
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{
                width: '140px',
                padding: '0.85rem 1rem',
                fontWeight: 600,
                color: 'var(--accent-gold)',
                verticalAlign: 'top',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRight: '1px solid var(--border-color)'
              }}>
                Date of Birth
              </td>
              <td style={{ padding: '0.6rem 0.75rem' }}>
                <input
                  type="text"
                  value={sections.dob}
                  onChange={(e) => handleFieldChange('dob', e.target.value)}
                  placeholder="e.g. 1975 in Karachi, Pakistan or 6th Aug-1968"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </td>
            </tr>

            {/* 2. Qualification */}
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{
                width: '140px',
                padding: '0.85rem 1rem',
                fontWeight: 600,
                color: 'var(--accent-gold)',
                verticalAlign: 'top',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRight: '1px solid var(--border-color)'
              }}>
                Qualification
              </td>
              <td style={{ padding: '0.6rem 0.75rem' }}>
                <textarea
                  rows={3}
                  value={sections.qualification}
                  onChange={(e) => handleFieldChange('qualification', e.target.value)}
                  placeholder="e.g.&#10;1996 Four-Year Professional Diploma in Fine Arts, Karachi School of Arts&#10;2000 BFA National College of Arts"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>

            {/* 3. Career */}
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{
                width: '140px',
                padding: '0.85rem 1rem',
                fontWeight: 600,
                color: 'var(--accent-gold)',
                verticalAlign: 'top',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRight: '1px solid var(--border-color)'
              }}>
                Career
              </td>
              <td style={{ padding: '0.6rem 0.75rem' }}>
                <textarea
                  rows={3}
                  value={sections.career}
                  onChange={(e) => handleFieldChange('career', e.target.value)}
                  placeholder="e.g.&#10;Workshops Conducted in Karachi & Islamabad&#10;Civil Award Tamgha-i-Imtiaz&#10;Senior Faculty Member MUET Jamshoro"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>

            {/* 4. Exhibitions */}
            <tr style={{ borderBottom: sections.overview ? '1px solid var(--border-color)' : 'none' }}>
              <td style={{
                width: '140px',
                padding: '0.85rem 1rem',
                fontWeight: 600,
                color: 'var(--accent-gold)',
                verticalAlign: 'top',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRight: '1px solid var(--border-color)'
              }}>
                Exhibitions
              </td>
              <td style={{ padding: '0.6rem 0.75rem' }}>
                <textarea
                  rows={4}
                  value={sections.exhibitions}
                  onChange={(e) => handleFieldChange('exhibitions', e.target.value)}
                  placeholder="e.g.&#10;2007 Solo Show at Native Art Gallery Lahore&#10;2008 Solo Show at Tanzara Art Gallery Islamabad&#10;2009 Solo Show at Nomad Art Islamabad&#10;2011 Group Show in London, UK"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    resize: 'vertical'
                  }}
                />
              </td>
            </tr>

            {/* 5. Additional Notes / Overview (if any) */}
            {sections.overview && (
              <tr>
                <td style={{
                  width: '140px',
                  padding: '0.85rem 1rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  verticalAlign: 'top',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRight: '1px solid var(--border-color)'
                }}>
                  Other Notes
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <textarea
                    rows={2}
                    value={sections.overview}
                    onChange={(e) => handleFieldChange('overview', e.target.value)}
                    placeholder="Additional biography details..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                      resize: 'vertical'
                    }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
