const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/PKR';

// Static fallback rates if the API fails or the client is offline
export const FALLBACK_RATES = {
  PKR: 1,
  USD: 0.0036,
  EUR: 0.0033,
  GBP: 0.0028,
  AED: 0.0132
};

/**
 * Fetches the latest exchange rates relative to PKR
 * @returns {Promise<Object>} Object containing currency rates
 */
export const fetchExchangeRates = async () => {
  try {
    const res = await fetch(EXCHANGE_API_URL);
    if (!res.ok) throw new Error("Exchange API response error");
    const data = await res.json();
    if (data && data.rates) {
      return {
        PKR: 1,
        USD: data.rates.USD || FALLBACK_RATES.USD,
        EUR: data.rates.EUR || FALLBACK_RATES.EUR,
        GBP: data.rates.GBP || FALLBACK_RATES.GBP,
        AED: data.rates.AED || FALLBACK_RATES.AED
      };
    }
    return FALLBACK_RATES;
  } catch (error) {
    console.warn("Could not fetch real-time exchange rates. Using static fallback rates.", error);
    return FALLBACK_RATES;
  }
};

/**
 * Converts a price in PKR to the target currency and formats it beautifully
 * @param {number} pricePKR Price in PKR
 * @param {string} currency Target currency code (PKR, USD, EUR, GBP, AED)
 * @param {Object} rates Exchange rates
 * @returns {string} Formatted price string
 */
export const formatPrice = (pricePKR, currency = 'PKR', rates = FALLBACK_RATES) => {
  if (pricePKR === undefined || pricePKR === null || pricePKR === '') {
    return 'Price on Inquiry';
  }
  const numericPrice = typeof pricePKR === 'string' 
    ? Number(pricePKR.replace(/[^0-9.-]+/g, '')) 
    : Number(pricePKR);

  if (isNaN(numericPrice) || numericPrice <= 0) {
    return 'Price on Inquiry';
  }

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1;
  const convertedPrice = numericPrice * rate;

  // Formatting rules for each currency
  switch (currency.toUpperCase()) {
    case 'USD':
      return `$${convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'EUR':
      return `€${convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'GBP':
      return `£${convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'AED':
      return `AED ${convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'PKR':
    default:
      return `Rs. ${numericPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
};

/**
 * Helper to parse dimensions from database string/number fields
 * handles simple numbers, units, compound strings like "H 70\" x W10\" x D3\""
 */
function parseDimensionField(str) {
  if (!str) return null;
  const s = String(str);
  const hMatch = s.match(/(?:H|Height|L|Length)\s*:?\s*(\d+(?:\.\d+)?)/i);
  const wMatch = s.match(/(?:W|Width)\s*:?\s*(\d+(?:\.\d+)?)/i);
  const dMatch = s.match(/(?:D|Depth)\s*:?\s*(\d+(?:\.\d+)?)/i);
  
  if (hMatch || wMatch || dMatch) {
    return {
      height: hMatch ? parseFloat(hMatch[1]) : null,
      width: wMatch ? parseFloat(wMatch[1]) : null,
      depth: dMatch ? parseFloat(dMatch[1]) : null
    };
  }
  return null;
}

export const renderDimensions = (width, length) => {
  const wStr = String(width || '').trim();
  const lStr = String(length || '').trim();

  // Try parsing compound string in length or width
  let data = parseDimensionField(lStr) || parseDimensionField(wStr);
  
  if (!data) {
    // Try parsing plain numbers or simple x separator
    const combined = `${lStr} x ${wStr}`;
    const parts = combined.split(/\s*x\s*|\s*\*\s*/i).map(p => p.replace(/"/g, '').trim());
    const numbers = parts.map(p => parseFloat(p)).filter(n => !isNaN(n) && n > 0);

    if (numbers.length >= 2) {
      data = {
        height: numbers[0],
        width: numbers[1],
        depth: numbers[2] || null
      };
    } else if (numbers.length === 1) {
      data = {
        height: numbers[0],
        width: null,
        depth: null
      };
    } else {
      data = {
        height: parseFloat(lStr) || null,
        width: parseFloat(wStr) || null,
        depth: null
      };
    }
  }

  // Format inches
  let inStr = '';
  if (data.height !== null && data.width !== null) {
    if (data.depth !== null) {
      inStr = `H ${data.height}" x W ${data.width}" x D ${data.depth}" in`;
    } else {
      inStr = `${data.height} x ${data.width} in`;
    }
  } else if (data.height !== null) {
    inStr = `${data.height} in`;
  } else if (data.width !== null) {
    inStr = `${data.width} in`;
  } else {
    if (length || width) {
      inStr = `${length || 0} x ${width || 0} in`;
    } else {
      inStr = '0 x 0 in';
    }
  }

  // Format cm
  let cmStr = '';
  const toCm = (val) => val ? (val * 2.54).toFixed(2) : null;
  const hCm = toCm(data.height);
  const wCm = toCm(data.width);
  const dCm = toCm(data.depth);

  if (hCm !== null && wCm !== null) {
    if (dCm !== null) {
      cmStr = `H ${hCm} x W ${wCm} x D ${dCm} cm`;
    } else {
      cmStr = `${hCm} x ${wCm} cm`;
    }
  } else if (hCm !== null) {
    cmStr = `${hCm} cm`;
  } else if (wCm !== null) {
    cmStr = `${wCm} cm`;
  } else {
    cmStr = '0.00 x 0.00 cm';
  }

  return { inStr, cmStr };
};
