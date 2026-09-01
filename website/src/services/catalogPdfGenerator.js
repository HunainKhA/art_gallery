import { jsPDF } from 'jspdf';
import { getApiUrl } from './api';
import { renderDimensions } from './currency';

/**
 * Strips HTML tags and decodes common HTML entities
 */
export const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
};

/**
 * Extracts ONLY the Artist Career / Qualification / Profile narrative
 * and strictly EXCLUDES all "Art Shows", "Solo Shows", "Group Shows", "Exhibitions" lists.
 */
export const extractCareerBio = (bioHtml) => {
  if (!bioHtml) return '';

  const tmp = document.createElement('div');
  tmp.innerHTML = bioHtml;

  // 1. If structured as HTML table (standard CRM artist bio format)
  const rows = tmp.querySelectorAll('tr');
  if (rows && rows.length > 0) {
    const careerParts = [];
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 2) {
        const label = (tds[0].textContent || '').trim();
        const lowerLabel = label.toLowerCase();
        // Strictly exclude art shows, exhibitions, solo/group shows, participations
        if (/exhibition|show|solo|group|participat|art\s*show/i.test(lowerLabel)) {
          return;
        }
        const text = (tds[1].textContent || '').trim().replace(/\s+/g, ' ');
        if (text) {
          careerParts.push(`${label}: ${text}`);
        }
      } else if (tds.length === 1) {
        const text = (tds[0].textContent || '').trim().replace(/\s+/g, ' ');
        if (text && !/^(solo|group|exhibition|shows|art\s*shows|selected\s*shows)/i.test(text)) {
          careerParts.push(text);
        }
      }
    });

    if (careerParts.length > 0) {
      return careerParts.join('\n\n');
    }
  }

  // 2. If free text / HTML paragraphs, filter line by line
  const rawText = (tmp.textContent || tmp.innerText || '').trim();
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const filteredLines = [];
  let skipMode = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (/solo\s*exhibition|solo\s*show|group\s*exhibition|group\s*show|selected\s*exhibition|exhibitions\s*:|art\s*shows\s*:/i.test(lowerLine)) {
      skipMode = true;
      continue;
    }
    if (skipMode) {
      if (/education|awards|career|qualification|about\s*the\s*artist|artist\s*statement|profile/i.test(lowerLine)) {
        skipMode = false;
      } else {
        continue;
      }
    }
    filteredLines.push(line);
  }

  return filteredLines.join('\n\n');
};

/**
 * Loads an image from URL, draws to an offscreen canvas to guarantee CORS/Base64,
 * and returns the DataURL along with its natural width & height.
 */
export const loadImageData = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({
          dataUrl,
          width: canvas.width,
          height: canvas.height
        });
      } catch (e) {
        console.warn('Canvas toDataURL failed for image:', url, e);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
};

/**
 * Formats artwork dimensions nicely (e.g. 7" x 36" | 18x91 cm)
 */
export const formatDimensionsString = (art) => {
  const dims = renderDimensions(art.width, art.length);
  let inchPart = '';
  let cmPart = '';

  if (art.width && art.length) {
    const w = parseFloat(art.width);
    const l = parseFloat(art.length);
    if (!isNaN(w) && !isNaN(l)) {
      inchPart = `${w}" x ${l}"`;
      cmPart = `${Math.round(w * 2.54)}x${Math.round(l * 2.54)} cm`;
    }
  }

  if (!inchPart && dims.inStr) {
    inchPart = dims.inStr.replace(/\s*in$/i, '"').trim();
  }
  if (!cmPart && dims.cmStr) {
    cmPart = dims.cmStr.trim();
  }

  return { inchPart, cmPart };
};

/**
 * Generates and downloads the EXACT square luxury Exhibition Catalogue PDF (Ditto design):
 * - Square Format: 210mm x 210mm
 * - Page 1: Full-Bleed Artwork Cover with Title overlay
 * - Page 2: Fine-Bordered Exhibition Title & Date Card with Mainframe Logo
 * - Page 3..: Artist Biography & Statement (only when bio exists; skipped if empty so NO blank pages)
 * - Artworks Pages: Fine-Bordered square page, centered artwork, caption, and bottom-right badge (01, 02...)
 * - Back Cover: Mainframe Logo, Location / Contact Info and gray footer bar
 */
export const generateCatalogPDF = async (exhibition, artworks, onProgress) => {
  if (!artworks || artworks.length === 0) {
    alert("No artworks available to generate catalogue.");
    return;
  }

  if (onProgress) onProgress("Preloading high-resolution artworks and assets...");

  // 1. Preload Cover Image
  let coverData = null;
  const coverUrl = getApiUrl(`/api/crm/exhibitions/image/${exhibition.id}`);
  try {
    coverData = await loadImageData(coverUrl);
  } catch {
    coverData = null;
  }

  // 2. Preload Logo Image
  let logoData = null;
  try {
    logoData = await loadImageData(getApiUrl('/api/artworks/logo'));
    if (!logoData) {
      logoData = await loadImageData('/logo.png');
    }
  } catch {
    logoData = null;
  }

  // 3. Preload all artwork images in parallel
  const artworksWithData = await Promise.all(
    artworks.map(async (art) => {
      const artImgUrl = getApiUrl(`/api/artworks/image/${art.id}`);
      const imgData = await loadImageData(artImgUrl);
      return {
        ...art,
        imgData
      };
    })
  );

  // 4. Group artworks by Artist (for Solo / Group exhibitions)
  const artistMap = new Map();
  for (const art of artworksWithData) {
    const artistId = art.artist_id || exhibition.artist_id || 'unknown';
    const artistName = (art.artist_name || exhibition.artist_name || '').trim() || 'Featured Artist';
    const rawBio = art.artist_bio || art.bio || '';
    const cleanBio = stripHtml(rawBio);

    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        id: artistId,
        name: artistName,
        bio: cleanBio,
        profileImage: art.artist_profile_image || null,
        artworks: []
      });
    }
    artistMap.get(artistId).artworks.push(art);
  }

  // Proactively fetch artist biography & profile picture from API if missing
  for (const [artistId, artistInfo] of artistMap.entries()) {
    const fetchId = (artistId && artistId !== 'unknown') ? artistId : exhibition.artist_id;
    if (fetchId) {
      try {
        const res = await fetch(getApiUrl(`/api/artists/${fetchId}`));
        if (res.ok) {
          const aData = await res.json();
          if (aData) {
            if (aData.bio || aData.artist_biography) {
              artistInfo.bio = aData.bio || aData.artist_biography;
            }
            if (!artistInfo.name || artistInfo.name === 'Featured Artist') {
              artistInfo.name = `${aData.first_name || ''} ${aData.last_name || ''}`.trim() || artistInfo.name;
            }
            if (!artistInfo.profileImageData) {
              const artistImgUrl = getApiUrl(`/api/artists/image/${fetchId}`);
              const pData = await loadImageData(artistImgUrl);
              if (pData) artistInfo.profileImageData = pData;
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch artist bio from API for", fetchId, e);
      }
    }
  }

  if (onProgress) onProgress("Rendering luxury square catalogue...");

  // Square Page Size: 210mm x 210mm
  const pageSize = 210;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageSize, pageSize],
    compress: true
  });

  const exhibitionTitle = (exhibition.document_name || 'EXHIBITION').toUpperCase();
  const firstArtistName = Array.from(artistMap.values())[0]?.name || '';
  const isGroupShow = artistMap.size > 1;
  const showTypeLabel = isGroupShow ? 'Group exhibition' : (firstArtistName ? `Solo show by ${firstArtistName}` : 'Exhibition');

  // Helper to draw standard outer framing line (12mm inset)
  const drawPageBorder = () => {
    doc.setDrawColor(45, 45, 45);
    doc.setLineWidth(0.35);
    doc.rect(12, 12, pageSize - 24, pageSize - 24);
  };

  // Helper to draw Mainframe Logo Square
  const drawMainframeLogo = (x, y, size = 26) => {
    if (logoData) {
      doc.addImage(logoData.dataUrl, 'PNG', x, y, size, size);
    } else {
      doc.setFillColor(50, 45, 42); // Dark brown box
      doc.rect(x, y, size, size, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('MAINFRAME', x + size / 2, y + size / 2, { align: 'center' });
      doc.setFontSize(5);
      doc.setTextColor(207, 161, 92);
      doc.text('THE GALLERY', x + size / 2, y + size / 2 + 5, { align: 'center' });
    }
  };

  // Clean Exhibition Title
  const cleanTitle = (exhibition.document_name || 'EXHIBITION').replace(/["']/g, '').trim().toUpperCase();

  // =========================================================================
  // PAGE 1: FULL-BLEED ARTWORK FRONT COVER
  // =========================================================================
  const coverBg = coverData || artworksWithData[0]?.imgData;
  if (coverBg) {
    // Render cover full bleed 210x210
    const scale = Math.max(pageSize / coverBg.width, pageSize / coverBg.height);
    const renderW = coverBg.width * scale;
    const renderH = coverBg.height * scale;
    const renderX = (pageSize - renderW) / 2;
    const renderY = (pageSize - renderH) / 2;

    doc.addImage(coverBg.dataUrl, 'JPEG', renderX, renderY, renderW, renderH);

    // Only add text overlay if using fallback artwork (if dedicated cover poster was uploaded, it already has design)
    if (!coverData) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text(cleanTitle, 18, 30);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(showTypeLabel, 18, 42);
    }
  } else {
    drawPageBorder();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(34, 51, 102);
    doc.text(cleanTitle, pageSize / 2, 80, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(showTypeLabel, pageSize / 2, 95, { align: 'center' });
  }

  // =========================================================================
  // PAGE 2: INVITATION & EXHIBITION DETAILS PAGE
  // =========================================================================
  doc.addPage([pageSize, pageSize], 'portrait');
  drawPageBorder();

  // Title in Deep Navy
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(34, 51, 102); // #223366
  doc.text(cleanTitle, pageSize - 18, 42, { align: 'right' });

  // Subtitle
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(showTypeLabel, pageSize - 18, 52, { align: 'right' });

  // Dates & Timings in center
  const startDateStr = exhibition.active_date 
    ? new Date(exhibition.active_date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Saturday, 29th August, 2026';

  const endDateStr = exhibition.exp_date 
    ? new Date(exhibition.exp_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '5th Sep, 2026';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(70, 70, 70);
  doc.text(startDateStr, pageSize - 18, 95, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text('5 - 8 pm', pageSize - 18, 108, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`The show will continue till ${endDateStr}`, pageSize - 18, 155, { align: 'right' });

  // Mainframe Logo at bottom left
  drawMainframeLogo(18, pageSize - 44, 26);

  // =========================================================================
  // ARTIST BIOGRAPHIES & ARTWORKS PAGES
  // =========================================================================
  let artworkCounter = 0;

  for (const [_, artistInfo] of artistMap.entries()) {
    // 1. RENDER ARTIST CAREER & SHOW DESCRIPTION (ONLY IF CAREER / DESC EXISTS, EXCLUDING ART SHOWS LISTS)
    const cleanCareer = extractCareerBio(artistInfo.bio);
    const cleanDesc = stripHtml(exhibition.description || '');

    if (cleanCareer || cleanDesc) {
      doc.addPage([pageSize, pageSize], 'portrait');
      drawPageBorder();

      let cursorY = 22;

      // Profile Image
      if (artistInfo.profileImageData) {
        const pImg = artistInfo.profileImageData;
        const pSize = 42;
        doc.addImage(pImg.dataUrl, 'JPEG', 20, cursorY, pSize, pSize);

        // Artist Name beside photo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(20, 20, 20);
        doc.text(artistInfo.name, 68, cursorY + 25);

        cursorY += pSize + 10;
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(20, 20, 20);
        doc.text(artistInfo.name, 20, cursorY + 8);
        cursorY += 16;
      }

      // "Career" Header & Text
      if (cleanCareer && cleanCareer.trim().length > 10) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        doc.text('Career', 20, cursorY);
        cursorY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);

        const splitBio = doc.splitTextToSize(cleanCareer, 170);
        for (const line of splitBio) {
          if (cursorY > pageSize - 22) {
            doc.addPage([pageSize, pageSize], 'portrait');
            drawPageBorder();
            cursorY = 22;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(50, 50, 50);
          }
          doc.text(line, 20, cursorY);
          cursorY += 4.3;
        }
        cursorY += 6;
      }

      // Exhibition Statement / Show Description
      if (cleanDesc && cleanDesc.trim().length > 10) {
        if (cursorY > pageSize - 36) {
          doc.addPage([pageSize, pageSize], 'portrait');
          drawPageBorder();
          cursorY = 22;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        doc.text(`On ${exhibition.document_name || 'Exhibition'}`, 20, cursorY);
        cursorY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        const splitStmt = doc.splitTextToSize(cleanDesc, 170);
        for (const line of splitStmt) {
          if (cursorY > pageSize - 22) {
            doc.addPage([pageSize, pageSize], 'portrait');
            drawPageBorder();
            cursorY = 22;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(50, 50, 50);
          }
          doc.text(line, 20, cursorY);
          cursorY += 4.3;
        }
      }
    }

    // 2. RENDER ARTWORKS (1 ARTWORK PER PAGE)
    for (const art of artistInfo.artworks) {
      artworkCounter += 1;
      doc.addPage([pageSize, pageSize], 'portrait');
      drawPageBorder();

      // Artwork Image Box (centered inside 186x186 framing)
      const maxArtW = 168;
      const maxArtH = 155;
      const boxX = 21;
      const boxY = 21;

      if (art.imgData) {
        const ratio = Math.min(maxArtW / art.imgData.width, maxArtH / art.imgData.height);
        const renderW = art.imgData.width * ratio;
        const renderH = art.imgData.height * ratio;
        const renderX = (pageSize - renderW) / 2;
        const renderY = boxY + (maxArtH - renderH) / 2;

        doc.addImage(art.imgData.dataUrl, 'JPEG', renderX, renderY, renderW, renderH);
      }

      // Artwork Caption at Bottom (Y ≈ 190mm)
      const { inchPart, cmPart } = formatDimensionsString(art);
      const titleStr = art.title || 'Untitled';
      const mediumStr = (art.medium_name || '').trim();

      const parts = [];
      if (isGroupShow && art.artist_name) {
        parts.push(art.artist_name.trim());
      }
      if (mediumStr) parts.push(mediumStr);
      if (inchPart) parts.push(inchPart);
      if (cmPart) parts.push(cmPart);

      const subCaption = parts.join(' | ');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(20, 20, 20);

      // Measure title width to place separator and subcaption seamlessly
      const titleW = doc.getTextWidth(titleStr);
      doc.text(titleStr, 22, 191);

      if (subCaption) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        doc.text(` | ${subCaption}`, 22 + titleW, 191);
      }

      // Page Number Badge (Bottom Right Corner: 01, 02...)
      const pageNumText = String(artworkCounter).padStart(2, '0');
      const badgeW = 10;
      const badgeH = 7.5;
      const badgeX = pageSize - 12 - badgeW;
      const badgeY = pageSize - 12 - badgeH;

      doc.setFillColor(125, 133, 140); // #7d858c
      doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(pageNumText, badgeX + badgeW / 2, badgeY + 5.2, { align: 'center' });
    }
  }

  // =========================================================================
  // FINAL PAGE: BACK COVER & LOCATION / CONTACT BANNER
  // =========================================================================
  doc.addPage([pageSize, pageSize], 'portrait');

  // Mainframe Logo at top center
  drawMainframeLogo((pageSize - 36) / 2, 22, 36);

  // Gallery Location Map Card (Rounded outline map container)
  const mapBoxX = 22;
  const mapBoxY = 66;
  const mapBoxW = 166;
  const mapBoxH = 92;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.35);
  doc.roundedRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH, 3, 3);

  // Clean vector road map illustration
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);

  // Roads
  doc.line(mapBoxX + 38, mapBoxY, mapBoxX + 38, mapBoxY + mapBoxH); // Street 1
  doc.line(mapBoxX + 58, mapBoxY + 18, mapBoxX + 58, mapBoxY + mapBoxH);
  doc.line(mapBoxX + 78, mapBoxY + 18, mapBoxX + 78, mapBoxY + mapBoxH);
  doc.line(mapBoxX + 98, mapBoxY + 18, mapBoxX + 98, mapBoxY + mapBoxH);
  doc.line(mapBoxX, mapBoxY + mapBoxH - 24, mapBoxX + mapBoxW, mapBoxY + mapBoxH - 24); // 26th street

  // Mainframe pinpoint box on map
  doc.setFillColor(34, 140, 160); // Teal Mainframe location
  doc.rect(mapBoxX + 58, mapBoxY + 30, 20, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('MAINFRAME', mapBoxX + 68, mapBoxY + 43, { align: 'center' });

  // Map Road Names
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(90, 90, 90);
  doc.text('26th Street', mapBoxX + 80, mapBoxY + mapBoxH - 26, { align: 'center' });
  doc.text('Shahrah-e-Attar', mapBoxX + 112, mapBoxY + 50);

  // Bottom Gray Banner (#7d858c)
  const bannerH = 22;
  const bannerY = pageSize - bannerH;

  doc.setFillColor(125, 133, 140); // #7d858c
  doc.rect(0, bannerY, pageSize, bannerH, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('F-73/9, Block 4, Clifton Karachi Pakistan. +92 21 3582 4455 . +92 300 828 5600', pageSize / 2, bannerY + 8, { align: 'center' });
  doc.text('mainframethegallery@gmail.com | www.mainframethegallery.com', pageSize / 2, bannerY + 15, { align: 'center' });

  // Save PDF file
  const cleanFilename = `Catalog - ${(exhibition.document_name || 'Exhibition').replace(/[^a-zA-Z0-9_-]/g, ' ')}.pdf`;
  doc.save(cleanFilename);
};
