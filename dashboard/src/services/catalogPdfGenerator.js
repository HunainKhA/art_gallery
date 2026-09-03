import { jsPDF } from 'jspdf';
import { getApiUrl } from './api';

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
 * Formats price cleanly (e.g. PKR 150,000 or PKR 150,000 (Sold) or Sold)
 */
export const formatArtworkPrice = (art, currency = 'PKR') => {
  const isSold = (art.status === 'Sold' || art.collection_status === 'Sold');
  const rawPrice = art.price ?? art.price_pkr ?? art.retail_price ?? art.sale_price;
  const numPrice = Number(rawPrice);

  if (isSold) {
    if (!isNaN(numPrice) && numPrice > 0) {
      return `PKR ${Math.round(numPrice).toLocaleString()} (Sold)`;
    }
    return 'Sold';
  }

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
    const aName = art.artist_name || art.artist || 'Featured Artist';
    if (!artistMap.has(aId)) {
      artistMap.set(aId, {
        id: aId,
        name: aName,
        bio: art.artist_bio || art.bio || '',
        profileImage: art.artist_profile_image || art.profile_image || null,
        artworks: []
      });
    }
    artistMap.get(aId).artworks.push(art);
  }

  // Preload missing artist bios in parallel if not present
  const hasBanner = !!(exhibition.filename && exhibition.filename.trim());
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

  // 2. Parallel preload custom cover (if any) and ALL artworks in fast pool
  const coverUrl = hasBanner ? getApiUrl(`/api/artworks/image/${exhibition.filename}`) : null;

  const [coverImgData, loadedArtworks] = await Promise.all([
    coverUrl ? loadImageData(coverUrl) : Promise.resolve(null),
    loadImagesInPool(artworks, 6)
  ]);

  // Re-map loaded artwork image data back to artistMap
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

  const cleanDescription = stripHtml(exhibition.description || '').trim();
  const hasDescription = cleanDescription.length > 10;

  let isFirstPageUsed = false;

  // =========================================================================
  // PAGE 1: COVER / BANNER (ONLY IF BANNER IS ATTACHED)
  // =========================================================================
  if (hasBanner && coverImgData) {
    isFirstPageUsed = true;
    const scale = Math.max(pageSize / coverImgData.width, pageSize / coverImgData.height);
    const renderW = coverImgData.width * scale;
    const renderH = coverImgData.height * scale;
    const renderX = (pageSize - renderW) / 2;
    const renderY = (pageSize - renderH) / 2;
    doc.addImage(coverImgData.dataUrl, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');

    // =========================================================================
    // PAGE 2: EXHIBITION INTRODUCTION (ONLY IF BANNER & DESCRIPTION EXIST)
    // =========================================================================
    if (hasDescription) {
      doc.addPage([pageSize, pageSize], 'portrait');

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

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const introLines = doc.splitTextToSize(cleanDescription, 166);
      doc.text(introLines.slice(0, 38), 22, 45, { lineHeightFactor: 1.45 });
    }
  }

  // =========================================================================
  // ARTIST CAREER / BIOGRAPHY & ARTWORK PAGES
  // =========================================================================
  let artworkCounter = 0;

  for (const [artistId, artistInfo] of artistMap.entries()) {
    // 1. Artist Career / Biography Page (Included for exhibitions with bio)
    if (hasBanner && artistInfo.bio && artistInfo.bio.trim().length > 15) {
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

    // 2. Individual Artwork Pages (All artworks included)
    for (const art of artistInfo.artworks) {
      artworkCounter++;

      if (!isFirstPageUsed) {
        isFirstPageUsed = true;
      } else {
        doc.addPage([pageSize, pageSize], 'portrait');
      }

      // Artwork Box: 170mm x 156mm (centered on 210mm page)
      const boxX = 20;
      const boxY = 22;
      const boxW = 170;
      const boxH = 158;

      const imgData = art.imgData;
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

      // Bottom Caption Row (Centered horizontally below the painting)
      const titleStr = formatArtworkTitle(art);
      const mediumStr = art.medium_name || '';
      const dimStr = formatDimensionsString(art);
      const priceStr = includePrice ? formatArtworkPrice(art, currency) : (art.status === 'Sold' ? 'Sold' : '');

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

  // Save PDF file
  const priceSuffix = includePrice ? ' (With Prices)' : '';
  const cleanFilename = `Catalogue - ${(exhibition.document_name || 'Art Gallery').replace(/[^a-zA-Z0-9_-]/g, ' ')}${priceSuffix}.pdf`;
  doc.save(cleanFilename);
};
