import { useState, useEffect } from 'react';
import { 
  fetchCategories, 
  fetchArtists, 
  fetchArtworks, 
  fetchArtistDetail,
  fetchFlashImages,
  fetchWebsiteSettings,
  validateGuestToken
} from '../services/api';
import { fetchExchangeRates, FALLBACK_RATES } from '../services/currency';

export default function useGalleryState() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    return sessionStorage.getItem('activeTab') || 'home';
  }); // home, about, collections, artists, exhibitions, catalogues, framer_heaven, videos, contact, shop, detail
  const [exhibitionFilter, setExhibitionFilter] = useState('previous');
  const [framerHeavenTab, setFramerHeavenTab] = useState('Product');
  const [artworks, setArtworks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState(() => {
    const saved = sessionStorage.getItem('selectedArtworkId');
    if (!saved) return null;
    return isNaN(saved) ? saved : parseInt(saved, 10);
  });
  const [selectedArtist, setSelectedArtist] = useState(() => {
    try {
      const saved = sessionStorage.getItem('selectedArtist');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return sessionStorage.getItem('selectedCategory') || null;
  });
  const [detailViewArtworksScope, setDetailViewArtworksScope] = useState(() => {
    try {
      const saved = sessionStorage.getItem('detailViewArtworksScope');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [previousTab, setPreviousTab] = useState(() => {
    return sessionStorage.getItem('previousTab') || 'collections';
  });
  const [selectedExhibition, setSelectedExhibition] = useState(() => {
    try {
      const saved = sessionStorage.getItem('selectedExhibition');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [preSearchTab, setPreSearchTab] = useState(null);
  const [flashImages, setFlashImages] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'PKR';
  });
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
  const [websiteSettings, setWebsiteSettings] = useState({
    hide_prices: false,
    hide_add_to_cart: false
  });
  
  const [guestSession, setGuestSession] = useState(() => {
    try {
      const saved = localStorage.getItem('mainframe_guest_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [loadingArtistDetail, setLoadingArtistDetail] = useState(false);
  const [error, setError] = useState(null);

  // 1. Initial mount: Fetch dynamic categories list, artists list, flash images, and exchange rates
  useEffect(() => {
    Promise.all([
      fetchCategories().catch(err => { console.error("Categories fetch failed:", err); return []; }),
      fetchArtists().catch(err => { console.error("Artists fetch failed:", err); return []; }),
      fetchFlashImages().catch(err => { console.error("Flash images fetch failed:", err); return []; }),
      fetchExchangeRates(),
      fetchWebsiteSettings().catch(err => {
        console.error("Failed to load settings:", err);
        return { hide_prices: false, hide_add_to_cart: false };
      })
    ])
      .then(([catData, artistData, flashData, ratesData, settingsData]) => {
        setCategories(catData || []);
        setArtists(artistData || []);
        setFlashImages(flashData || []);
        setExchangeRates(ratesData);
        setWebsiteSettings(settingsData);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Fetch Error on mount:", err);
        // Fallback gracefully on mount if some elements fail
        setLoading(false);
      });
  }, []);

  // Refresh artists when navigating to Artists tab
  useEffect(() => {
    if (activeTab === 'artists') {
      fetchArtists()
        .then(data => setArtists(data || []))
        .catch(err => console.error("Failed to refresh artists:", err));
    }
  }, [activeTab]);

  // Keep guest session persisted across page refreshes (only expire if time has passed)
  useEffect(() => {
    if (guestSession) {
      if (guestSession.expiry) {
        const isExpired = new Date(guestSession.expiry) <= new Date();
        if (isExpired) {
          handleGuestLogout();
        }
      }
    }
  }, []);

  const handleGuestLoginSuccess = (session) => {
    setGuestSession(session);
    localStorage.setItem('mainframe_guest_session', JSON.stringify(session));
  };

  const handleGuestLogout = () => {
    setGuestSession(null);
    localStorage.removeItem('mainframe_guest_session');
  };

  // Refresh settings and flash images periodically in background (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Refresh settings
      fetchWebsiteSettings()
        .then(data => {
          if (data) {
            setWebsiteSettings(prev => {
              if (prev.hide_prices !== data.hide_prices || prev.hide_add_to_cart !== data.hide_add_to_cart) {
                return data;
              }
              return prev;
            });
          }
        })
        .catch(err => console.error("Error refreshing settings:", err));

      // 2. Refresh flash images
      fetchFlashImages()
        .then(data => {
          if (data) {
            setFlashImages(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(data)) {
                return data;
              }
              return prev;
            });
          }
        })
        .catch(err => console.error("Error refreshing flash images:", err));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch artworks dynamically based on selectedCategory or searchQuery
  useEffect(() => {
    setLoadingArtworks(true);
    fetchArtworks({ search: searchQuery, category: selectedCategory })
      .then(data => {
        setArtworks(data || []);
        setLoadingArtworks(false);
      })
      .catch(err => {
        console.error("Error fetching artworks:", err);
        setError("Could not load artworks. Please check database connection.");
        setLoadingArtworks(false);
      });
  }, [selectedCategory, searchQuery]);

  // 3. Hash router listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 4. Hash state and sub-view persistence sync
  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedArtist) {
      sessionStorage.setItem('selectedArtist', JSON.stringify(selectedArtist));
    } else {
      sessionStorage.removeItem('selectedArtist');
    }
  }, [selectedArtist]);

  useEffect(() => {
    if (selectedCategory) {
      sessionStorage.setItem('selectedCategory', selectedCategory);
    } else {
      sessionStorage.removeItem('selectedCategory');
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedExhibition) {
      sessionStorage.setItem('selectedExhibition', JSON.stringify(selectedExhibition));
    } else {
      sessionStorage.removeItem('selectedExhibition');
    }
  }, [selectedExhibition]);

  // Clear preSearchTab if the user manually switches tabs away from collections/detail/shop
  useEffect(() => {
    if (activeTab !== 'collections' && activeTab !== 'detail' && activeTab !== 'shop') {
      setPreSearchTab(null);
    }
  }, [activeTab]);

  const handleAddToCart = (artwork) => {
    if (!cartItems.some(item => item.id === artwork.id)) {
      setCartItems([...cartItems, artwork]);
    }
  };

  const handleRemoveFromCart = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const viewArtworkDetail = (id, customArtworksList = null) => {
    setPreviousTab(activeTab);
    sessionStorage.setItem('previousTab', activeTab);
    setSelectedArtworkId(id);
    sessionStorage.setItem('selectedArtworkId', id);
    setDetailViewArtworksScope(customArtworksList);
    if (customArtworksList && Array.isArray(customArtworksList)) {
      try {
        sessionStorage.setItem('detailViewArtworksScope', JSON.stringify(customArtworksList));
      } catch (e) {
        console.warn("Storage quota exceeded:", e);
      }
    } else {
      sessionStorage.removeItem('detailViewArtworksScope');
    }
    setActiveTab('detail');
  };

  const handleViewArtistDetail = (artistId) => {
    setLoadingArtistDetail(true);
    fetchArtistDetail(artistId)
      .then(data => {
        if (data && Array.isArray(data.artworks)) {
          // Sort: Available ('Available' or 'not_sold') first, Sold out last
          data.artworks.sort((a, b) => {
            const aAvailable = a.status === 'Available' || a.status === 'not_sold';
            const bAvailable = b.status === 'Available' || b.status === 'not_sold';
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;
            return 0;
          });
        }
        setSelectedArtist(data);
        setLoadingArtistDetail(false);
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
        setLoadingArtistDetail(false);
      });
  };

  const handleSidebarSearch = (val) => {
    setSearchQuery(val);
    
    // If the user clears the search query, and we had a preSearchTab, go back to it
    if (!val.trim() && preSearchTab) {
      setActiveTab(preSearchTab);
      setPreSearchTab(null);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      // Save current tab before searching if we are not already on collections/detail/shop
      if (activeTab !== 'collections' && activeTab !== 'detail' && activeTab !== 'shop') {
        if (!preSearchTab) {
          setPreSearchTab(activeTab);
        }
      }
      if (activeTab !== 'collections' && activeTab !== 'detail') {
        setActiveTab('collections');
      }
    }
  };

  // 5. Theme Sync and Toggle
  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 6. Currency Sync
  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // 7. Artwork ID persistence on refresh
  useEffect(() => {
    if (selectedArtworkId !== null) {
      sessionStorage.setItem('selectedArtworkId', selectedArtworkId);
    } else {
      sessionStorage.removeItem('selectedArtworkId');
    }
  }, [selectedArtworkId]);

  // 8. Previous Tab and Selected Exhibition persistence on refresh
  useEffect(() => {
    sessionStorage.setItem('previousTab', previousTab);
  }, [previousTab]);

  useEffect(() => {
    if (selectedExhibition) {
      sessionStorage.setItem('selectedExhibition', JSON.stringify(selectedExhibition));
    } else {
      sessionStorage.removeItem('selectedExhibition');
    }
  }, [selectedExhibition]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return {
    activeTab,
    flashImages,
    setActiveTab,
    exhibitionFilter,
    setExhibitionFilter,
    framerHeavenTab,
    setFramerHeavenTab,
    artworks,
    setArtworks,
    artists,
    setArtists,
    categories,
    setCategories,
    cartItems,
    setCartItems,
    selectedArtworkId,
    setSelectedArtworkId,
    selectedArtist,
    setSelectedArtist,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    loading,
    setLoading,
    loadingArtworks,
    setLoadingArtworks,
    loadingArtistDetail,
    setLoadingArtistDetail,
    error,
    setError,
    handleAddToCart,
    handleRemoveFromCart,
    handleClearCart,
    viewArtworkDetail,
    handleViewArtistDetail,
    handleSidebarSearch,
    handleSearchSubmit,
    theme,
    toggleTheme,
    currency,
    setCurrency,
    exchangeRates,
    websiteSettings,
    guestSession,
    setGuestSession,
    isGuestModalOpen,
    setIsGuestModalOpen,
    handleGuestLoginSuccess,
    handleGuestLogout,
    previousTab,
    setPreviousTab,
    selectedExhibition,
    setSelectedExhibition,
    detailViewArtworksScope
  };
}
