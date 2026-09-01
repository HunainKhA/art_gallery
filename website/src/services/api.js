const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.DEV ? 'http://localhost:8000' : '');

export const getApiUrl = (path) => {
  return `${API_BASE}${path}`;
};

export const fetchCategories = async () => {
  const res = await fetch(`${API_BASE}/api/artworks/categories`);
  if (!res.ok) throw new Error("Could not load categories database records.");
  return res.json();
};

export const fetchArtists = async () => {
  const res = await fetch(`${API_BASE}/api/artists`);
  if (!res.ok) throw new Error("Could not load artists profiles.");
  return res.json();
};

export const fetchArtworks = async (params = {}) => {
  let url = `${API_BASE}/api/artworks?limit=10000`;
  if (params.search) {
    url += `&search=${encodeURIComponent(params.search)}`;
  } else if (params.category) {
    url += `&category=${encodeURIComponent(params.category)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch artworks inventory list.");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const fetchArtistDetail = async (artistId) => {
  const res = await fetch(`${API_BASE}/api/artists/${artistId}`);
  if (!res.ok) throw new Error("Could not fetch artist portfolio detail.");
  return res.json();
};

export const getArtworkImageUrl = (id) => {
  return `${API_BASE}/api/artworks/image/${id}`;
};

export const getArtistInitials = (name = '') => {
  return '';
};

export const getArtistAvatarSvg = (name = '') => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100%25' height='100%25'%3E%3Crect width='100' height='100' fill='%23141416'/%3E%3Ccircle cx='50' cy='50' r='30' fill='none' stroke='%23d4af37' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E`;
};

export const getArtistImageUrl = (filename, artistIdOrLatestArt) => {
  if (!filename || filename === 'NULL' || filename === 'null' || filename === '' || filename === 'undefined') {
    if (artistIdOrLatestArt) {
      return getArtworkImageUrl(artistIdOrLatestArt);
    }
    return getArtistAvatarSvg();
  }
  if (filename.startsWith('http') || filename.startsWith('data:')) return filename;
  return `${API_BASE}/api/artists/image/${filename}`;
};

export const getLogoUrl = () => {
  return `${API_BASE}/api/artworks/logo`;
};

export const fetchFlashImages = async () => {
  const res = await fetch(`${API_BASE}/api/crm/flashimages`);
  if (!res.ok) throw new Error("Could not load homepage flash images.");
  return res.json();
};

export const fetchCollectionTypes = async () => {
  const res = await fetch(`${API_BASE}/api/collection-types`);
  if (!res.ok) throw new Error("Could not load categories list.");
  return res.json();
};

export const fetchMediums = async () => {
  const res = await fetch(`${API_BASE}/api/mediums`);
  if (!res.ok) throw new Error("Could not load mediums list.");
  return res.json();
};

export const fetchBannerConfig = async () => {
  const res = await fetch(`${API_BASE}/api/crm/exhibitions/banner`);
  if (!res.ok) throw new Error("Could not load exhibitions banner configuration.");
  return res.json();
};

export const saveBannerConfig = async (config) => {
  const res = await fetch(`${API_BASE}/api/crm/exhibitions/banner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error("Could not save exhibitions banner configuration.");
  return res.json();
};

export const uploadBannerImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/crm/exhibitions/banner/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error("Could not upload banner image asset.");
  return res.json();
};

export const getBannerImageUrl = (filename) => {
  if (!filename) return '';
  return `${API_BASE}/api/crm/exhibitions/banner/image/${filename}`;
};
export const fetchWebsiteSettings = async () => {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error("Could not fetch website display settings.");
  return res.json();
};

export const registerGuest = async (email, phone) => {
  const res = await fetch(`${API_BASE}/api/guest/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to register guest.");
  }
  return res.json();
};

export const checkGuestStatus = async (code) => {
  const res = await fetch(`${API_BASE}/api/guest/status/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("Failed to check verification status.");
  return res.json();
};

export const loginGuest = async (code, username, password) => {
  const res = await fetch(`${API_BASE}/api/guest/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, username, password })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Invalid guest credentials.");
  }
  return res.json();
};

export const validateGuestToken = async (token) => {
  const res = await fetch(`${API_BASE}/api/guest/validate-token/${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Failed to validate guest session token.");
  return res.json();
};

export const simulateWhatsAppVerify = async (code) => {
  const res = await fetch(`${API_BASE}/api/guest/verify-simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error("Failed to simulate webhook verification.");
  return res.json();
};

export const verifyGuestOtp = async (otp) => {
  const res = await fetch(`${API_BASE}/api/guest/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Invalid OTP code.");
  }
  return res.json();
};


