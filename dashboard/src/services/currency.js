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
  const numericPrice = Number(pricePKR);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return 'Price on Inquiry';
  }

  const rate = rates[currency] || FALLBACK_RATES[currency] || 1;
  const convertedPrice = numericPrice * rate;

  // Formatting rules for each currency
  switch (currency.toUpperCase()) {
    case 'USD':
      return `$${Math.round(convertedPrice).toLocaleString()}`;
    case 'EUR':
      return `€${Math.round(convertedPrice).toLocaleString()}`;
    case 'GBP':
      return `£${Math.round(convertedPrice).toLocaleString()}`;
    case 'AED':
      return `AED ${Math.round(convertedPrice).toLocaleString()}`;
    case 'PKR':
    default:
      return `Rs. ${Math.round(numericPrice).toLocaleString()}`;
  }
};
