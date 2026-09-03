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
 * Formats artwork dimensions nicely (e.g. 7" x 36" | 18x91 cm)
 */
export const formatDimensionsString = (art) => {
  const dims = renderDimensions(art);
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

  if (!inchPart && dims.inchStr) {
    inchPart = dims.inchStr.trim();
  }
  if (!cmPart && dims.cmStr) {
    cmPart = dims.cmStr.trim();
  }

  return { inchPart, cmPart };
};

/**
 * Formats price cleanly (e.g. PKR 150,000)
 */
export const formatArtworkPrice = (art, currency = 'PKR') => {
  const rawPrice = art.price ?? art.price_pkr ?? art.retail_price ?? art.sale_price;
  const numPrice = Number(rawPrice);
  if (isNaN(numPrice) || numPrice <= 0) {
    return 'Price on Inquiry';
  }
  return `PKR ${Math.round(numPrice).toLocaleString()}`;
};

/**
 * Generates and downloads the luxury square Exhibition Catalogue PDF:
 * - If Exhibition: Includes Banner, Exhibition Statement, and Artist Career/Bio page.
 * - If Custom: Direct clean flow without empty covers.
 * - Artwork Pages: 1 per page with centered caption (Title | Medium | Size | Price).
 * - No extra trailing logo pages.
 */
export const generateCatalogPDF = async (exhibition, artworks, onProgress, options = {}) => {
  if (!artworks || artworks.length === 0) {
    alert("No artworks available to generate catalogue.");
    return;
  }

  const includePrice = options.includePrice === true;
  const currency = options.currency || 'PKR';

  // 1. Group artworks by Artist
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

  // 2. Parallel preload cover and ALL artworks in fast pool
  let coverUrl = null;
  if (exhibition.filename) {
    coverUrl = getApiUrl(`/api/artworks/image/${exhibition.filename}`);
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

  const cleanDesc = stripHtml(exhibition.description || '').trim();
  const hasDescription = cleanDesc.length > 10;

  let isFirstPageUsed = false;

  // =========================================================================
  // PAGE 1: EXHIBITION COVER / BANNER (ONLY IF BANNER IS ATTACHED)
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

    // 2. Render Artworks (1 artwork per page)
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
      const titleStr = art.title || art.code || 'Untitled';
      const mediumStr = (art.medium_name || '').trim();
      const priceStr = includePrice ? formatArtworkPrice(art, currency) : '';

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

  // Save PDF file (No trailing back cover page)
  const priceSuffix = includePrice ? ' (With Prices)' : '';
  const cleanFilename = `Catalogue - ${(exhibition.document_name || 'Art Gallery').replace(/[^a-zA-Z0-9_-]/g, ' ')}${priceSuffix}.pdf`;
  doc.save(cleanFilename);
};
