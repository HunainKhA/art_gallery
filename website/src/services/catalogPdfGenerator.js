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
 * Fast fail-safe image loader: 1.5s max timeout per image so compiling NEVER hangs.
 * Converts to optimized lightweight canvas JPEG (max 1000px, 0.80 quality).
 */
export const loadImageData = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1500);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try {
        let origW = img.naturalWidth || img.width || 800;
        let origH = img.naturalHeight || img.height || 600;
        
        const maxDim = 1000;
        let targetW = origW;
        let targetH = origH;

        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
        resolve({
          dataUrl,
          width: targetW,
          height: targetH
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
};

/**
 * Batch image loader with concurrency pool (max 6 parallel downloads)
 */
const loadImagesInPool = async (artworks, poolSize = 6) => {
  const results = new Array(artworks.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < artworks.length) {
      const idx = currentIndex++;
      const art = artworks[idx];
      const artImgUrl = art.id
        ? getApiUrl(`/api/artworks/image/${art.id}`)
        : (art.filename ? getApiUrl(`/api/artworks/image/${art.filename}`) : getApiUrl(`/api/artworks/image/${art.image}`));
      const imgData = await loadImageData(artImgUrl);
      results[idx] = { ...art, imgData };
    }
  };

  const pool = [];
  for (let i = 0; i < Math.min(poolSize, artworks.length); i++) {
    pool.push(worker());
  }
  await Promise.all(pool);
  return results;
};

/**
 * Formats artwork dimensions nicely (e.g. 7" x 36" | 18x91 cm).
 * Strictly guards against 0 or 0x0 display.
 */
export const formatDimensionsString = (art) => {
  let inchPart = '';
  let cmPart = '';

  const rawLength = art.length ?? art.collection_size_length_c ?? art.height;
  const rawWidth = art.width ?? art.collection_size_width_c ?? art.width_inch;

  if (rawLength !== undefined && rawLength !== null && rawWidth !== undefined && rawWidth !== null) {
    const l = parseFloat(String(rawLength).replace(/[^\d.]/g, ''));
    const w = parseFloat(String(rawWidth).replace(/[^\d.]/g, ''));
    if (!isNaN(w) && !isNaN(l) && w > 0 && l > 0) {
      const lStr = Number.isInteger(l) ? String(int(l)) : String(l);
      const wStr = Number.isInteger(w) ? String(int(w)) : String(w);
      inchPart = `${lStr}" x ${wStr}"`;
      cmPart = `${Math.round(l * 2.54)} x ${Math.round(w * 2.54)} cm`;
    }
  }

  if (!inchPart) {
    const dims = renderDimensions(art);
    if (dims && dims.inchStr && !dims.inchStr.includes('0"') && !dims.inchStr.includes('0 x 0')) {
      inchPart = dims.inchStr.trim();
    }
    if (dims && dims.cmStr && !dims.cmStr.includes('0 x 0 cm') && !dims.cmStr.includes('0x0')) {
      cmPart = dims.cmStr.trim();
    }
  }

  return { inchPart, cmPart };
};

/**
 * Formats price cleanly.
 * NOTE: If artwork is Sold, NEVER show numerical price, ONLY show 'Sold'.
 */
export const formatArtworkPrice = (art, currency = 'PKR') => {
  const isSold = (
    String(art.status || '').toLowerCase() === 'sold' ||
    String(art.collection_status || '').toLowerCase() === 'sold'
  );

  if (isSold) {
    return 'Sold';
  }

  const rawPrice = art.price ?? art.price_pkr ?? art.retail_price ?? art.sale_price;
  const numPrice = Number(rawPrice);

  if (isNaN(numPrice) || numPrice <= 0) {
    return 'Price on Inquiry';
  }
  return `PKR ${Math.round(numPrice).toLocaleString()}`;
};

/**
 * Formats artwork display title (e.g. "Title (Code)" or "Code" if title is identical/empty)
 */
export const formatArtworkTitle = (art) => {
  const rawTitle = (art.title || '').trim();
  const rawCode = (art.code || '').trim();

  if (rawTitle && rawCode && rawTitle !== rawCode && !rawTitle.includes(rawCode)) {
    return `${rawTitle} (${rawCode})`;
  }
  return rawTitle || rawCode || 'Untitled';
};

/**
 * Generates and downloads the luxury square Exhibition Catalogue PDF:
 */
export const generateCatalogPDF = async (exhibition, artworks, onProgress, options = {}) => {
  if (!artworks || artworks.length === 0) {
    alert("No artworks available to generate catalogue.");
    return;
  }

  const includePrice = options.includePrice === true;
  const currency = options.currency || 'PKR';

  // 1. Group artworks by Artist (Include ALL artworks: Available, Reserved, and Sold)
  const artistMap = new Map();
  for (const art of artworks) {
    const aId = art.artist_id || exhibition.artist_id || 'unknown';
    const aName = (art.artist_name || exhibition.artist_name || '').trim() || 'Featured Artist';
    const rawBio = art.artist_bio || art.bio || '';
    const cleanBio = stripHtml(rawBio);

    if (!artistMap.has(aId)) {
      artistMap.set(aId, {
        id: aId,
        name: aName,
        bio: cleanBio,
        profileImage: art.artist_profile_image || null,
        artworks: []
      });
    }
    artistMap.get(aId).artworks.push(art);
  }

  // Preload missing artist bios in parallel if not present
  const hasBanner = !!(exhibition.filename || exhibition.banner_image || exhibition.id);
  if (hasBanner) {
    const bioPromises = [];
    for (const [artistId, artistInfo] of artistMap.entries()) {
      const fetchId = (artistId && artistId !== 'unknown') ? artistId : exhibition.artist_id;
      if (fetchId && !artistInfo.bio) {
        bioPromises.push(
          fetch(getApiUrl(`/api/artists/${fetchId}`))
            .then(res => res.ok ? res.json() : null)
            .then(aData => {
              if (aData) {
                artistInfo.bio = stripHtml(aData.artist_biography || aData.bio || '');
                if (aData.name) artistInfo.name = aData.name;
              }
            })
            .catch(() => null)
        );
      }
    }
    if (bioPromises.length > 0) {
      await Promise.all(bioPromises);
    }
  }

  // 2. Parallel preload custom cover and ALL artworks in fast pool
  let coverUrl = null;
  if (exhibition.filename && exhibition.filename.trim()) {
    coverUrl = getApiUrl(`/api/artworks/image/${exhibition.filename}`);
  } else if (exhibition.banner_image && exhibition.banner_image.trim()) {
    coverUrl = getApiUrl(`/api/artworks/image/${exhibition.banner_image}`);
  } else if (exhibition.id) {
    coverUrl = getApiUrl(`/api/crm/exhibitions/image/${exhibition.id}`);
  }

  const [coverData, loadedArtworks] = await Promise.all([
    coverUrl ? loadImageData(coverUrl) : Promise.resolve(null),
    loadImagesInPool(artworks, 6)
  ]);

  // Re-map loaded artworks
  const loadedArtMap = new Map(loadedArtworks.map(a => [a.id || a.code, a]));
  for (const [_, artistInfo] of artistMap.entries()) {
    artistInfo.artworks = artistInfo.artworks.map(art => loadedArtMap.get(art.id || art.code) || art);
  }

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

  const cleanDesc = stripHtml(exhibition.description || '').trim();
  const hasDescription = cleanDesc.length > 10;

  let isFirstPageUsed = false;

  // =========================================================================
  // PAGE 1: EXHIBITION COVER / BANNER (ONLY IF REAL BANNER IMAGE IS ATTACHED)
  // =========================================================================
  if (coverData && coverData.dataUrl) {
    isFirstPageUsed = true;
    const scale = Math.max(pageSize / coverData.width, pageSize / coverData.height);
    const renderW = coverData.width * scale;
    const renderH = coverData.height * scale;
    const renderX = (pageSize - renderW) / 2;
    const renderY = (pageSize - renderH) / 2;

    doc.addImage(coverData.dataUrl, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');

    // =========================================================================
    // PAGE 2: EXHIBITION INTRODUCTION & CURATORIAL NOTE (ONLY IF DESC EXISTS)
    // =========================================================================
    if (hasDescription) {
      doc.addPage([pageSize, pageSize], 'portrait');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(20, 20, 20);
      doc.text(exhibitionTitle, 22, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      doc.text(showTypeLabel, 22, 34);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(22, 38, pageSize - 22, 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const splitStmt = doc.splitTextToSize(cleanDesc, 166);
      doc.text(splitStmt.slice(0, 38), 22, 45, { lineHeightFactor: 1.45 });
    }
  }

  // =========================================================================
  // ARTIST CAREER / BIOGRAPHY & ARTWORK PAGES
  // =========================================================================
  let artworkCounter = 0;

  for (const [_, artistInfo] of artistMap.entries()) {
    // 1. Artist Career / Biography Page (Included for exhibitions with bio)
    if (coverData && artistInfo.bio && artistInfo.bio.trim().length > 15) {
      if (!isFirstPageUsed) {
        isFirstPageUsed = true;
      } else {
        doc.addPage([pageSize, pageSize], 'portrait');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(20, 20, 20);
      doc.text(artistInfo.name, 22, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Artist Biography & Career', 22, 35);

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(22, 40, pageSize - 22, 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const bioLines = doc.splitTextToSize(artistInfo.bio, 166);
      doc.text(bioLines.slice(0, 36), 22, 48, { lineHeightFactor: 1.45 });
    }

    // 2. Render Artworks (1 artwork per page - All artworks included)
    for (const art of artistInfo.artworks) {
      artworkCounter += 1;

      if (!isFirstPageUsed) {
        isFirstPageUsed = true;
      } else {
        doc.addPage([pageSize, pageSize], 'portrait');
      }

      // Artwork Image Box (Centered inside page)
      const maxArtW = 170;
      const maxArtH = 158;
      const boxY = 22;

      if (art.imgData) {
        const ratio = Math.min(maxArtW / art.imgData.width, maxArtH / art.imgData.height);
        const renderW = art.imgData.width * ratio;
        const renderH = art.imgData.height * ratio;
        const renderX = (pageSize - renderW) / 2;
        const renderY = boxY + (maxArtH - renderH) / 2;

        doc.addImage(art.imgData.dataUrl, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');
      }

      // Artwork Caption at Bottom (Centered horizontally below the painting)
      const { inchPart, cmPart } = formatDimensionsString(art);
      const titleStr = formatArtworkTitle(art);
      const mediumStr = (art.medium_name || '').trim();
      const isSold = (
        String(art.status || '').toLowerCase() === 'sold' ||
        String(art.collection_status || '').toLowerCase() === 'sold'
      );

      // Rule: If Sold -> Show 'Sold' (no price). If Available and includePrice -> Show PKR Price.
      let priceStr = '';
      if (isSold) {
        priceStr = 'Sold';
      } else if (includePrice) {
        priceStr = formatArtworkPrice(art, currency);
      }

      const parts = [];
      if (mediumStr) parts.push(mediumStr);
      if (inchPart) parts.push(inchPart);
      if (cmPart) parts.push(cmPart);
      if (priceStr) parts.push(priceStr);

      const subCaption = parts.join(' | ');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const titleW = doc.getTextWidth(titleStr);

      let subW = 0;
      if (subCaption) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        subW = doc.getTextWidth(` | ${subCaption}`);
      }

      const totalW = titleW + subW;
      const startX = (pageSize - totalW) / 2;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(titleStr, startX, 192);

      if (subCaption) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(70, 70, 70);
        doc.text(` | ${subCaption}`, startX + titleW, 192);
      }

      // Page Number Badge (Bottom Right Corner: 01, 02...)
      const pageNumText = String(artworkCounter).padStart(2, '0');
      const badgeW = 10;
      const badgeH = 7.5;
      const badgeX = pageSize - 14 - badgeW;
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
  // FINAL PAGE: GALLERY LOCATION MAP & CONTACT BANNER
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
  doc.line(mapBoxX + 38, mapBoxY, mapBoxX + 38, mapBoxY + mapBoxH);
  doc.line(mapBoxX + 58, mapBoxY + 18, mapBoxX + 58, mapBoxY + mapBoxH);
  doc.line(mapBoxX + 78, mapBoxY + 18, mapBoxX + 78, mapBoxY + mapBoxH);
  doc.line(mapBoxX + 98, mapBoxY + 18, mapBoxX + 98, mapBoxY + mapBoxH);
  doc.line(mapBoxX, mapBoxY + mapBoxH - 24, mapBoxX + mapBoxW, mapBoxY + mapBoxH - 24);

  // Mainframe pinpoint box on map
  doc.setFillColor(34, 140, 160);
  doc.rect(mapBoxX + 58, mapBoxY + 30, 20, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text('MAINFRAME', mapBoxX + 68, mapBoxY + 43, { align: 'center' });

  // Location Details Text on Map
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Clifton, Block 4, Karachi', mapBoxX + 12, mapBoxY + 12);

  // Bottom Gray Banner (#7d858c)
  const bannerH = 22;
  const bannerY = pageSize - bannerH;

  doc.setFillColor(125, 133, 140);
  doc.rect(0, bannerY, pageSize, bannerH, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('F-73/9, Block 4, Clifton Karachi Pakistan. +92 21 3582 4455 . +92 300 828 5600', pageSize / 2, bannerY + 8, { align: 'center' });
  doc.text('mainframethegallery@gmail.com | www.mainframethegallery.com', pageSize / 2, bannerY + 15, { align: 'center' });

  // Save PDF file
  const priceSuffix = includePrice ? ' (With Prices)' : '';
  const cleanFilename = `Catalogue - ${(exhibition.document_name || 'Art Gallery').replace(/[^a-zA-Z0-9_-]/g, ' ')}${priceSuffix}.pdf`;
  doc.save(cleanFilename);
};
