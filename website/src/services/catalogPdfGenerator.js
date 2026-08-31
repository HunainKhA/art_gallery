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
 * Generates and downloads a luxury Art Gallery Exhibition Catalogue PDF.
 * - Cover page (Title, Dates, Overview)
 * - Artist Biography page (ONLY if artist has bio text; skipped if empty so no blank pages)
 * - Single Artwork per page (Centered, caption below, bottom-right page badge)
 */
export const generateCatalogPDF = async (exhibition, artworks, onProgress) => {
  if (!artworks || artworks.length === 0) {
    alert("No artworks available to generate catalogue.");
    return;
  }

  if (onProgress) onProgress("Preloading artwork and artist data...");

  // 1. Preload cover image if available
  let coverData = null;
  const coverUrl = getApiUrl(`/api/crm/exhibitions/image/${exhibition.id}`);
  try {
    coverData = await loadImageData(coverUrl);
  } catch {
    coverData = null;
  }

  // 2. Preload all artwork images in parallel
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

  // 3. Group artworks by Artist (to support both Solo and Group exhibitions seamlessly)
  const artistMap = new Map();
  for (const art of artworksWithData) {
    const artistId = art.artist_id || 'unknown';
    const artistName = (art.artist_name || '').trim() || 'Featured Artist';
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

  // Preload artist profile images if available
  for (const [_, artistInfo] of artistMap.entries()) {
    if (artistInfo.bio && artistInfo.id !== 'unknown') {
      try {
        const artistImgUrl = getApiUrl(`/api/artists/image/${artistInfo.id}`);
        const pData = await loadImageData(artistImgUrl);
        if (pData) artistInfo.profileImageData = pData;
      } catch {
        artistInfo.profileImageData = null;
      }
    }
  }

  if (onProgress) onProgress("Compiling luxury PDF pages...");

  // Create jsPDF instance (A4 Portrait: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  let pageCounter = 0;

  // Helper to draw bottom right page number box
  const drawPageNumber = () => {
    pageCounter += 1;
    const pageNumText = String(pageCounter).padStart(2, '0');
    const badgeW = 11;
    const badgeH = 8;
    const badgeX = pageWidth - badgeW - 14;
    const badgeY = pageHeight - badgeH - 12;

    doc.setFillColor(125, 133, 140); // #7d858c
    doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(pageNumText, badgeX + badgeW / 2, badgeY + 5.5, { align: 'center' });
  };

  // ==========================================
  // PAGE 1: COVER TITLE PAGE
  // ==========================================
  // Header Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('MAINFRAME', pageWidth / 2 - 18, 30, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(207, 161, 92); // Gold #cfa15c
  doc.text('THE GALLERY', pageWidth / 2 - 14, 30, { align: 'left' });

  // Cover Image
  let nextY = 42;
  const fallbackCover = coverData || (artworksWithData[0] && artworksWithData[0].imgData);
  if (fallbackCover) {
    const maxCoverW = 140;
    const maxCoverH = 100;
    const ratio = Math.min(maxCoverW / fallbackCover.width, maxCoverH / fallbackCover.height);
    const renderW = fallbackCover.width * ratio;
    const renderH = fallbackCover.height * ratio;
    const renderX = (pageWidth - renderW) / 2;
    const renderY = nextY + (maxCoverH - renderH) / 2;

    doc.addImage(fallbackCover.dataUrl, 'JPEG', renderX, renderY, renderW, renderH);
    nextY += maxCoverH + 12;
  } else {
    nextY += 30;
  }

  // Exhibition Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  const titleText = (exhibition.document_name || 'EXHIBITION CATALOG').toUpperCase();
  const splitTitle = doc.splitTextToSize(titleText, 170);
  doc.text(splitTitle, pageWidth / 2, nextY, { align: 'center' });
  nextY += (splitTitle.length * 8) + 2;

  // Exhibition Dates
  const startDate = exhibition.active_date ? new Date(exhibition.active_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const endDate = exhibition.exp_date ? new Date(exhibition.exp_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing';
  const dateStr = startDate ? `${startDate} - ${endDate}` : 'Exhibition Collection';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text(dateStr, pageWidth / 2, nextY, { align: 'center' });
  nextY += 10;

  // Exhibition Description
  if (exhibition.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    const splitDesc = doc.splitTextToSize(exhibition.description, 150);
    doc.text(splitDesc, pageWidth / 2, nextY, { align: 'center' });
  }

  // Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text('© 2026 Mainframe The Gallery. All Rights Reserved.', pageWidth / 2, pageHeight - 14, { align: 'center' });

  // ==========================================
  // ARTIST BIOGRAPHIES & ARTWORK PAGES
  // ==========================================
  for (const [_, artistInfo] of artistMap.entries()) {
    // 1. RENDER ARTIST BIOGRAPHY PAGE (ONLY IF BIO EXISTS AND IS NOT EMPTY)
    if (artistInfo.bio && artistInfo.bio.trim().length > 15) {
      doc.addPage('a4', 'portrait');

      // Top branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('MAINFRAME', pageWidth / 2 - 14, 25, { align: 'right' });
      doc.setTextColor(207, 161, 92);
      doc.text('THE GALLERY', pageWidth / 2 - 10, 25, { align: 'left' });

      // Subheader
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(207, 161, 92); // Gold
      doc.text('ABOUT THE ARTIST', pageWidth / 2, 36, { align: 'center' });

      let bioY = 46;

      // Artist Profile Image (if available)
      if (artistInfo.profileImageData) {
        const pImg = artistInfo.profileImageData;
        const maxPW = 45;
        const maxPH = 45;
        const pRatio = Math.min(maxPW / pImg.width, maxPH / pImg.height);
        const pW = pImg.width * pRatio;
        const pH = pImg.height * pRatio;
        const pX = (pageWidth - pW) / 2;

        doc.addImage(pImg.dataUrl, 'JPEG', pX, bioY, pW, pH);
        bioY += pH + 10;
      }

      // Artist Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(artistInfo.name.toUpperCase(), pageWidth / 2, bioY, { align: 'center' });
      bioY += 10;

      // Thin divider line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(pageWidth / 2 - 25, bioY, pageWidth / 2 + 25, bioY);
      bioY += 10;

      // Biography Text (Cleanly wrapped and formatted)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);

      const splitBio = doc.splitTextToSize(artistInfo.bio, 160);
      doc.text(splitBio, 25, bioY, { align: 'left', lineHeightFactor: 1.5 });

      drawPageNumber();
    }

    // 2. RENDER ARTWORKS FOR THIS ARTIST (1 PER PAGE)
    for (const art of artistInfo.artworks) {
      doc.addPage('a4', 'portrait');

      // Available canvas area for centered painting
      const maxArtW = 165;
      const maxArtH = 215;
      const topMargin = 20;

      if (art.imgData) {
        const ratio = Math.min(maxArtW / art.imgData.width, maxArtH / art.imgData.height);
        const renderW = art.imgData.width * ratio;
        const renderH = art.imgData.height * ratio;
        const renderX = (pageWidth - renderW) / 2;
        const renderY = topMargin + (maxArtH - renderH) / 2;

        doc.addImage(art.imgData.dataUrl, 'JPEG', renderX, renderY, renderW, renderH);
      }

      // Single-line caption under painting
      const { inchPart, cmPart } = formatDimensionsString(art);
      const parts = [];

      const titleStr = art.title || 'Untitled';
      const artistStr = (art.artist_name || '').trim();
      const mediumStr = (art.medium_name || '').trim();

      if (artistStr && artistStr !== 'Unknown Artist') {
        parts.push(artistStr);
      }
      parts.push(titleStr);
      if (mediumStr) parts.push(mediumStr);
      if (inchPart) parts.push(inchPart);
      if (cmPart) parts.push(cmPart);

      const captionFullText = parts.join(' | ');

      // Render Caption text centered
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);

      const captionY = topMargin + maxArtH + 12;
      doc.text(captionFullText, pageWidth / 2, captionY, { align: 'center' });

      drawPageNumber();
    }
  }

  // Save the generated PDF file directly to browser
  const cleanFilename = `Catalog - ${(exhibition.document_name || 'Exhibition').replace(/[^a-zA-Z0-9_-]/g, ' ')}.pdf`;
  doc.save(cleanFilename);
};
