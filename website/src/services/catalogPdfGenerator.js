import { jsPDF } from 'jspdf';
import { getApiUrl } from './api';
import { renderDimensions } from './currency';

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
      console.warn('Failed to load image for PDF:', url);
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
 * Exactly 1 artwork per page, centered, standard caption under image,
 * bottom-right numbered badge, and no blank pages.
 */
export const generateCatalogPDF = async (exhibition, artworks, onProgress) => {
  if (!artworks || artworks.length === 0) {
    alert("No artworks available to generate catalogue.");
    return;
  }

  if (onProgress) onProgress("Preloading artwork images...");

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

  if (onProgress) onProgress("Compiling PDF pages...");

  // Create jsPDF instance (A4 Portrait: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  let isFirstPage = true;

  // ==========================================
  // PAGE 1: COVER TITLE PAGE
  // ==========================================
  // Header Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('MAINFRAME', pageWidth / 2 - 18, 30, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(207, 161, 92); // Gold
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
  // PAGES 2..N: SINGLE ARTWORK PER PAGE
  // ==========================================
  artworksWithData.forEach((art, index) => {
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

    // 1. Title (or Title with Artist Name)
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

    // Page Number Box (Bottom Right Corner)
    const pageNumText = String(index + 1).padStart(2, '0');
    const badgeW = 11;
    const badgeH = 8;
    const badgeX = pageWidth - badgeW - 14;
    const badgeY = pageHeight - badgeH - 12;

    // Gray background rectangle
    doc.setFillColor(125, 133, 140); // #7d858c
    doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');

    // White bold page number text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(pageNumText, badgeX + badgeW / 2, badgeY + 5.5, { align: 'center' });
  });

  // Save the generated PDF file directly to browser
  const cleanFilename = `Catalog - ${(exhibition.document_name || 'Exhibition').replace(/[^a-zA-Z0-9_-]/g, ' ')}.pdf`;
  doc.save(cleanFilename);
};
