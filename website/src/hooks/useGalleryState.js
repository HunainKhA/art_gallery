import { useState, useEffect } from 'react';
import { 
  fetchCategories, 
  fetchArtists, 
  fetchArtworks, 
  fetchArtistDetail,
  fetchFlashImages
} from '../services/api';
import { fetchExchangeRates, FALLBACK_RATES } from '../services/currency';

export default function useGalleryState() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'home';
  }); // home, about, collections, artists, exhibitions, catalogues, framer_heaven, videos, contact, shop, detail
  const [exhibitionFilter, setExhibitionFilter] = useState('current');
  const [framerHeavenTab, setFramerHeavenTab] = useState('Product');
  const [artworks, setArtworks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flashImages, setFlashImages] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'PKR';
  });
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
  
  const [loading, setLoading] = useState(true);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [loadingArtistDetail, setLoadingArtistDetail] = useState(false);
  const [error, setError] = useState(null);

  // 1. Initial mount: Fetch dynamic categories list, artists list, flash images, and exchange rates
  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchArtists(),
      fetchFlashImages(),
      fetchExchangeRates()
    ])
      .then(([catData, artistData, flashData, ratesData]) => {
        setCategories(catData || []);
        setArtists(artistData || []);
        setFlashImages(flashData || []);
        setExchangeRates(ratesData);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Fetch Error on mount:", err);
        // Fallback gracefully on mount if some elements fail
        setLoading(false);
      });
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

  // 4. Hash state sync
  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
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

  const viewArtworkDetail = (id) => {
    setSelectedArtworkId(id);
    setActiveTab('detail');
  };

  const handleViewArtistDetail = (artistId) => {
    setLoadingArtistDetail(true);
    fetchArtistDetail(artistId)
      .then(data => {
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
    if (activeTab !== 'collections' && activeTab !== 'detail') {
      setActiveTab('collections');
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return {
    activeTab,
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
    theme,
    toggleTheme,
    currency,
    setCurrency,
    exchangeRates
  };
}
