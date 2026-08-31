import React, { useState } from 'react';
import { CreditCard, Trash2, CheckCircle, ArrowLeft, Loader } from 'lucide-react';
import { formatPrice } from '../services/currency';
import { getApiUrl, getArtworkImageUrl } from '../services/api';

export default function Cart({ cartItems, onRemoveFromCart, onClearCart, onBack, currency, exchangeRates }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, paying, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [successOrderDetails, setSuccessOrderDetails] = useState(null);

  const totalAmount = cartItems.reduce((total, item) => total + (item.price || 0), 0);

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setPaymentStatus('paying');
    setErrorMessage('');

    // Simulate payment intent creation & verification
    // 1. We create the payment intent (Stripe simulation on Backend)
    const artworkIds = cartItems.map(item => item.id);
    
    fetch(getApiUrl("/api/payments/create-payment-intent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artwork_ids: artworkIds,
        currency: currency
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.detail || "Checkout Failed."); });
        }
        return res.json();
      })
      .then(intentData => {
        // 2. Confirm the payment and sync back to SugarCRM database
        return fetch(getApiUrl("/api/payments/confirm-order"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            artwork_ids: artworkIds,
            total_amount: intentData.totalAmount,
            currency: intentData.currency,
            stripe_charge_id: `ch_stripe_mock_${Math.random().toString(36).substr(2, 9)}`
          })
        });
      })
      .then(res => {
        if (!res.ok) throw new Error("Order confirmation database sync failed.");
        return res.json();
      })
      .then(orderResult => {
        setSuccessOrderDetails(orderResult);
        setPaymentStatus('success');
        onClearCart(); // Empty the cart
      })
      .catch(err => {
        setErrorMessage(err.message || "An error occurred during checkout.");
        setPaymentStatus('error');
      });
  };

  if (paymentStatus === 'success' && successOrderDetails) {
    return (
      <div className="page-content" style={{ maxWidth: '600px', textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="glass-card" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <CheckCircle size={64} color="var(--accent-green)" />
          <h1 style={{ color: '#fff' }}>Order Placed Successfully!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Thank you for purchasing from <strong>Mainframe The Gallery</strong>. Your transaction was processed securely.
          </p>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem 2rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <span>Order Reference ID:</span>
              <strong style={{ color: 'var(--accent-gold)' }}>#{successOrderDetails.order_id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Status:</span>
              <strong style={{ color: 'var(--accent-green)' }}>Synced with SugarCRM</strong>
            </div>
          </div>
          <button onClick={onBack} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: '1000px' }}>
      <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '2rem', display: 'inline-flex', alignItems: 'center' }}>
        <ArrowLeft size={16} /> Back to Gallery
      </button>

      <h1 style={{ fontSize: '2.25rem', marginBottom: '2rem', color: 'var(--accent-gold)' }}>Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your shopping cart is currently empty.</p>
          <button onClick={onBack} className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
            Browse Artworks
          </button>
        </div>
      ) : (
        <div className="cart-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* Cart Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cartItems.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <img 
                  src={item.id ? getArtworkImageUrl(item.id) : (item.image || '')} 
                  alt={item.title} 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>By {item.artist_name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.width}" x {item.length}"</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>{formatPrice(item.price, currency, exchangeRates)}</h4>
                  <button 
                    onClick={() => onRemoveFromCart(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid var(--border-color)', marginTop: '1rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>Total Value:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{formatPrice(totalAmount, currency, exchangeRates)}</span>
            </div>
          </div>

          {/* Secure Checkout Form & Card Mockup */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              <CreditCard size={20} color="var(--accent-gold)" /> Secure Checkout
            </h2>

            {errorMessage && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Customer Information */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Full Name</label>
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                  placeholder="Ali Ahmed"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email Address</label>
                <input 
                  type="email" 
                  value={customerEmail} 
                  onChange={(e) => setCustomerEmail(e.target.value)} 
                  style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                  placeholder="ali.ahmed@example.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                  placeholder="+92 300 1234567"
                  required
                />
              </div>

              {/* Card Inputs Mock */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>Credit/Debit Card Details</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Card Number</label>
                    <input 
                      type="text" 
                      maxLength="19"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', letterSpacing: '0.15em' }}
                      placeholder="4000 1234 5678 9010"
                      required
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Expiry Date</label>
                      <input 
                        type="text" 
                        maxLength="5"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', textAlign: 'center' }}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>CVC / CVV</label>
                      <input 
                        type="password" 
                        maxLength="3"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', textAlign: 'center' }}
                        placeholder="***"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '1rem' }}
                disabled={paymentStatus === 'paying'}
              >
                {paymentStatus === 'paying' ? (
                  <>
                    <Loader size={18} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} /> Processing Payment...
                  </>
                ) : (
                  `Pay ${formatPrice(totalAmount, currency, exchangeRates)} Now`
                )}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
