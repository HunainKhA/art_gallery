import { jsPDF } from 'jspdf';
import { getApiUrl } from './api';
import catalogBackCoverImg from '../assets/catalog_back_cover.png';

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
  let inchPart = '';
  let cmPart = '';

  if (art.length && art.width) {
    const l = parseFloat(art.length);
    const w = parseFloat(art.width);
    if (!isNaN(w) && !isNaN(l) && (w > 0 || l > 0)) {
      inchPart = `${l}" x ${w}"`;
      cmPart = `${Math.round(l * 2.54)} x ${Math.round(w * 2.54)} cm`;
    }
  }

  return [inchPart, cmPart].filter(Boolean).join(' | ');
};

/**
 * Generates and downloads the EXACT square luxury Exhibition Catalogue PDF:
 */
export const generateCatalogPDF = async (exhibition, artworks, onProgress) => {
  if (!artworks || artworks.length === 0) {
    alert("No artworks available to generate catalogue.");
    return;
  }

  if (onProgress) onProgress("Preparing catalogue assets...");

  // Group artworks by Artist to build artist profiles and portfolios
  const artistMap = new Map();
  for (const art of artworks) {
    const aId = art.artist_id || art.artist || 'unknown';
    const aName = art.artist_name || art.artist || 'Featured Artist';
    if (!artistMap.has(aId)) {
      artistMap.set(aId, {
        id: aId,
        name: aName,
        bio: art.artist_bio || art.bio || '',
        profileImage: art.artist_profile_image || art.profile_image || null,
        profileImageData: null,
        artworks: []
      });
    }
    artistMap.get(aId).artworks.push(art);
  }

  // Preload artist bios if missing
  for (const [aId, artistInfo] of artistMap.entries()) {
    const fetchId = (aId !== 'unknown' && aId) ? aId : (artistInfo.name || '');
    if (fetchId && !artistInfo.bio) {
      try {
        const res = await fetch(getApiUrl(`/api/artists/${fetchId}`));
        if (res.ok) {
          const aData = await res.json();
          if (aData) {
            artistInfo.bio = aData.artist_biography || aData.bio || '';
            if (aData.name) artistInfo.name = aData.name;
          }
        }
      } catch (e) {
        console.warn("Could not fetch artist bio from API for", fetchId, e);
      }
    }
  }

  if (onProgress) onProgress("Rendering luxury square catalogue...");

  // Preload back cover image
  const backCoverData = await loadImageData(catalogBackCoverImg || '/assets/catalog_back_cover.png');

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
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.35);
    doc.rect(12, 12, pageSize - 24, pageSize - 24);
  };

  // Helper to draw standard luxury MAINFRAME Monogram/Logo
  const drawMainframeLogo = (x, y, size = 32) => {
    doc.setFillColor(35, 31, 32);
    doc.rect(x, y, size, size, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.25);
    doc.rect(x + 2, y + 2, size - 4, size - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size * 0.22);
    doc.setTextColor(255, 255, 255);
    doc.text('MAINFRAME', x + size / 2, y + size * 0.72, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size * 0.11);
    doc.setTextColor(200, 200, 200);
    doc.text('T H E   G A L L E R Y', x + size / 2, y + size * 0.88, { align: 'center' });
  };

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  drawPageBorder();

  let coverArtwork = null;
  if (exhibition.filename) {
    coverArtwork = { image: exhibition.filename, id: null };
  } else if (artworks.length > 0) {
    coverArtwork = artworks[0];
  }

  if (coverArtwork) {
    const coverImgUrl = coverArtwork.id 
      ? getApiUrl(`/api/artworks/image/${coverArtwork.id}`)
      : getApiUrl(`/api/artworks/image/${coverArtwork.image}`);

    const imgData = await loadImageData(coverImgUrl);
    if (imgData) {
      const boxX = 22;
      const boxY = 22;
      const boxW = 166;
      const boxH = 120;
      doc.addImage(imgData.dataUrl, 'JPEG', boxX, boxY, boxW, boxH, undefined, 'FAST');
    }
  }

  // Cover Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(exhibitionTitle, 22, 154);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(showTypeLabel, 22, 161);

  if (exhibition.active_date || exhibition.exp_date) {
    const datesStr = [exhibition.active_date, exhibition.exp_date].filter(Boolean).join(' - ');
    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 110);
    doc.text(datesStr, 22, 168);
  }

  // =========================================================================
  // PAGE 2: EXHIBITION / CURATORIAL INTRODUCTION
  // =========================================================================
  doc.addPage([pageSize, pageSize], 'portrait');
  drawPageBorder();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(exhibitionTitle, 22, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(showTypeLabel, 22, 34);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(22, 38, pageSize - 22, 38);

  const curatorialNote = stripHtml(exhibition.description) || 
    `${exhibitionTitle} represents a curated collection of contemporary masterworks hosted at Mainframe The Gallery. Each piece embodies aesthetic rigor, cultural depth, and the highest standard of fine art practice.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  const introLines = doc.splitTextToSize(curatorialNote, 166);
  doc.text(introLines.slice(0, 38), 22, 45, { lineHeightFactor: 1.45 });

  // =========================================================================
  // ARTIST PROFILES & ARTWORK PORTFOLIO PAGES
  // =========================================================================
  let artworkCounter = 0;

  for (const [artistId, artistInfo] of artistMap.entries()) {
    const artistCleanName = (artistInfo.name || 'Featured Artist').trim();
    const careerText = extractCareerBio(artistInfo.bio);

    // Profile Page for Artist
    if (careerText || artistInfo.bio) {
      doc.addPage([pageSize, pageSize], 'portrait');
      drawPageBorder();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      doc.text(artistCleanName.toUpperCase(), 22, 28);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(22, 33, pageSize - 22, 33);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const bioLines = doc.splitTextToSize(careerText || stripHtml(artistInfo.bio), 166);
      doc.text(bioLines.slice(0, 42), 22, 40, { lineHeightFactor: 1.45 });
    }

    // Individual Artwork Pages
    for (const art of artistInfo.artworks) {
      artworkCounter++;
      doc.addPage([pageSize, pageSize], 'portrait');
      drawPageBorder();

      // Top Header: Artist Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(40, 40, 40);
      doc.text(artistCleanName.toUpperCase(), 22, 22);

      // Artwork Box: 166mm x 155mm
      const boxX = 22;
      const boxY = 28;
      const boxW = 166;
      const boxH = 155;

      const artImgUrl = art.id
        ? getApiUrl(`/api/artworks/image/${art.id}`)
        : getApiUrl(`/api/artworks/image/${art.image}`);

      if (onProgress) onProgress(`Loading artwork ${artworkCounter}/${artworks.length}...`);

      const imgData = await loadImageData(artImgUrl);
      if (imgData) {
        const imgAspect = imgData.width / imgData.height;
        const boxAspect = boxW / boxH;

        let renderW, renderH, renderX, renderY;
        if (imgAspect > boxAspect) {
          renderW = boxW;
          renderH = boxW / imgAspect;
          renderX = boxX;
          renderY = boxY + (boxH - renderH) / 2;
        } else {
          renderH = boxH;
          renderW = boxH * imgAspect;
          renderX = boxX + (boxW - renderW) / 2;
          renderY = boxY;
        }

        doc.addImage(imgData.dataUrl, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');
      }

      // Bottom Caption Row (No Prices)
      const titleStr = art.title || art.code || 'Untitled';
      const mediumStr = art.medium_name || 'Oil on Canvas';
      const dimStr = formatDimensionsString(art);

      const parts = [];
      if (mediumStr) parts.push(mediumStr);
      if (dimStr) parts.push(dimStr);

      const subCaption = parts.join(' | ');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);

      const titleW = doc.getTextWidth(titleStr);
      doc.text(titleStr, 22, 191);

      if (subCaption) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(70, 70, 70);
        doc.text(` | ${subCaption}`, 22 + titleW, 191);
      }

      // Page Number Badge (Bottom Right Corner: 01, 02...)
      const pageNumText = String(artworkCounter).padStart(2, '0');
      const badgeW = 10;
      const badgeH = 7.5;
      const badgeX = pageSize - 12 - badgeW;
      const badgeY = pageSize - 12 - badgeH;

      doc.setFillColor(125, 133, 140);
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

  if (backCoverData && backCoverData.dataUrl) {
    doc.addImage(backCoverData.dataUrl, 'PNG', 0, 0, pageSize, pageSize);
  } else {
    // Fallback: Mainframe Logo at top center
    drawMainframeLogo((pageSize - 36) / 2, 22, 36);

    const mapBoxX = 22;
    const mapBoxY = 66;
    const mapBoxW = 166;
    const mapBoxH = 92;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.35);
    doc.roundedRect(mapBoxX, mapBoxY, mapBoxW, mapBoxH, 3, 3);

    const bannerH = 22;
    const bannerY = pageSize - bannerH;

    doc.setFillColor(125, 133, 140);
    doc.rect(0, bannerY, pageSize, bannerH, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('F-73/9, Block 4, Clifton Karachi Pakistan. +92 21 3582 4455 . +92 300 828 5600', pageSize / 2, bannerY + 8, { align: 'center' });
    doc.text('mainframethegallery@gmail.com | www.mainframethegallery.com', pageSize / 2, bannerY + 15, { align: 'center' });
  }

  // Save PDF file
  const cleanFilename = `Catalogue - ${(exhibition.document_name || 'Art Gallery').replace(/[^a-zA-Z0-9_-]/g, ' ')}.pdf`;
  doc.save(cleanFilename);
};
