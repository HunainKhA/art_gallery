import React from 'react';
import useGalleryState from './hooks/useGalleryState';
import MainLayout from './components/MainLayout';

// Page imports
import HomeSection from './components/HomeSection';
import AboutSection from './components/AboutSection';
import CollectionsSection from './components/CollectionsSection';
import ArtistsSection from './components/ArtistsSection';
import ExhibitionsSection from './components/ExhibitionsSection';
import CataloguesSection from './components/CataloguesSection';
import FramerHeavenSection from './components/FramerHeavenSection';
import VideosSection from './components/VideosSection';
import ContactSection from './components/ContactSection';
import ArtworkDetail from './components/ArtworkDetail';
import Cart from './components/Cart';

export default function App() {
  const state = useGalleryState();

  if (state.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--accent-gold)', fontSize: '1.25rem', fontWeight: 600 }}>
        Loading Mainframe Art Gallery...
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ maxWidth: '600px', margin: '10rem auto', padding: '2rem', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }} className="glass-card">
        <h2 style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>Connection Failure</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{state.error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ display: 'inline-flex', margin: '1.5rem auto 0 auto' }}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <MainLayout state={state}>
      {/* 1. HOME TAB */}
      {state.activeTab === 'home' && (
        <HomeSection setActiveTab={state.setActiveTab} flashImages={state.flashImages} />
      )}

      {/* 2. ABOUT US TAB */}
      {state.activeTab === 'about' && (
        <AboutSection />
      )}

      {/* 3. COLLECTIONS (GALLERY) TAB */}
      {state.activeTab === 'collections' && (
        <CollectionsSection 
          categories={state.categories}
          selectedCategory={state.selectedCategory}
          setSelectedCategory={state.setSelectedCategory}
          artworks={state.artworks}
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          loadingArtworks={state.loadingArtworks}
          cartItems={state.cartItems}
          handleAddToCart={state.handleAddToCart}
          viewArtworkDetail={state.viewArtworkDetail}
          currency={state.currency}
          exchangeRates={state.exchangeRates}
        />
      )}

      {/* 4. ARTISTS TAB */}
      {state.activeTab === 'artists' && (
        <ArtistsSection 
          artists={state.artists}
          selectedArtist={state.selectedArtist}
          setSelectedArtist={state.setSelectedArtist}
          loadingArtistDetail={state.loadingArtistDetail}
          handleViewArtistDetail={state.handleViewArtistDetail}
          viewArtworkDetail={state.viewArtworkDetail}
          currency={state.currency}
          exchangeRates={state.exchangeRates}
        />
      )}

      {/* 5. EXHIBITIONS TAB */}
      {state.activeTab === 'exhibitions' && (
        <ExhibitionsSection 
          activeTab={state.exhibitionFilter} 
          setActiveTab={state.setExhibitionFilter} 
          viewArtworkDetail={state.viewArtworkDetail}
          handleAddToCart={state.handleAddToCart}
          cartItems={state.cartItems}
          currency={state.currency}
          exchangeRates={state.exchangeRates}
        />
      )}

      {/* 6. CATALOGUES TAB */}
      {state.activeTab === 'catalogues' && (
        <CataloguesSection 
          currency={state.currency}
          exchangeRates={state.exchangeRates}
        />
      )}

      {/* 7. FRAMER'S HEAVEN TAB */}
      {state.activeTab === 'framer_heaven' && (
        <FramerHeavenSection activeTab={state.framerHeavenTab} setActiveTab={state.setFramerHeavenTab} />
      )}

      {/* 8. VIDEOS TAB */}
      {state.activeTab === 'videos' && (
        <VideosSection />
      )}

      {/* 9. CONTACT US TAB */}
      {state.activeTab === 'contact' && (
        <ContactSection />
      )}

      {/* 10. ARTWORK DETAIL VIEW (Subtab) */}
      {state.activeTab === 'detail' && state.selectedArtworkId && (
        <ArtworkDetail 
          artworkId={state.selectedArtworkId} 
          onBack={() => { state.setActiveTab('collections'); state.setSelectedArtworkId(null); }} 
          onAddToCart={state.handleAddToCart}
          cartItems={state.cartItems}
          currency={state.currency}
          setCurrency={state.setCurrency}
          exchangeRates={state.exchangeRates}
        />
      )}

      {/* 11. SHOP ONLINE / CART TAB */}
      {state.activeTab === 'shop' && (
        <Cart 
          cartItems={state.cartItems} 
          onRemoveFromCart={state.handleRemoveFromCart}
          onClearCart={state.handleClearCart}
          onBack={() => { state.setActiveTab('collections'); state.setSelectedArtworkId(null); }} 
          currency={state.currency}
          exchangeRates={state.exchangeRates}
        />
      )}
    </MainLayout>
  );
}
