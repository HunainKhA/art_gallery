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
  return res.json();
};

export const fetchArtistDetail = async (artistId) => {
  const res = await fetch(`${API_BASE}/api/artists/${artistId}`);
  if (!res.ok) throw new Error("Could not fetch artist portfolio detail.");
  return res.json();
};

export const getArtworkImageUrl = (id) => {
  return `${API_BASE}/api/artworks/image/${id}`;
};

export const getArtistImageUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;
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

export const saveWebsiteSettings = async (settings) => {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error("Could not save website display settings.");
  return res.json();
};

export const fetchGuestUsers = async () => {
  const res = await fetch(`${API_BASE}/api/guest/users`);
  if (!res.ok) throw new Error("Failed to load guest users list.");
  return res.json();
};

export const fetchGuestCredentials = async () => {
  const res = await fetch(`${API_BASE}/api/guest/credentials`);
  if (!res.ok) throw new Error("Failed to load guest credentials list.");
  return res.json();
};

export const createGuestCredential = async (username, password) => {
  const res = await fetch(`${API_BASE}/api/guest/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to create guest credential.");
  }
  return res.json();
};

export const deleteGuestCredential = async (id) => {
  const res = await fetch(`${API_BASE}/api/guest/credentials/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Failed to delete guest credential.");
  return res.json();
};

export const fetchWhatsAppNumber = async () => {
  const res = await fetch(`${API_BASE}/api/guest/whatsapp-number`);
  if (!res.ok) throw new Error("Failed to fetch WhatsApp business number.");
  return res.json();
};

export const saveWhatsAppNumber = async (whatsapp_number) => {
  const res = await fetch(`${API_BASE}/api/guest/whatsapp-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp_number })
  });
  if (!res.ok) throw new Error("Failed to save WhatsApp business number.");
  return res.json();
};


