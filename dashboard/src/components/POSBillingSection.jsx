import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function POSBillingSection({ frames, fittings, customers, onSuccess }) {
  const [selectedCustomerType, setSelectedCustomerType] = useState('existing'); // existing, new
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [posItems, setPosItems] = useState([]);
  
  const [selectedFrameCode, setSelectedFrameCode] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [qty, setQty] = useState(1);
  const [selectedFittingIds, setSelectedFittingIds] = useState([]);

  // Painting selection states
  const [paintingSearchQuery, setPaintingSearchQuery] = useState('');
  const [paintingSearchResults, setPaintingSearchResults] = useState([]);
  const [selectedPainting, setSelectedPainting] = useState(null);
  const [loadingPaintings, setLoadingPaintings] = useState(false);
  
  // Pricing adjustment states
  const [priceAdjustmentType, setPriceAdjustmentType] = useState('none'); // none, override, discount, markup
  const [priceAdjustmentValue, setPriceAdjustmentValue] = useState('');

  const [discount, setDiscount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [advance, setAdvance] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);

  const handleSearchPaintings = () => {
    if (!paintingSearchQuery) return;
    setLoadingPaintings(true);
    fetch(getApiUrl(`/api/artworks?search=${encodeURIComponent(paintingSearchQuery)}&limit=10`))
      .then(res => res.json())
      .then(data => {
        setPaintingSearchResults(data || []);
        setLoadingPaintings(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingPaintings(false);
      });
  };

  const handleSelectPainting = (art) => {
    setSelectedPainting(art);
    setPaintingSearchResults([]);
    if (art.width) setWidth(art.width.toString());
    if (art.length) setHeight(art.length.toString());
  };

  const currentFrame = frames.find(f => f.item_id === selectedFrameCode);
  
  const calculateFramePrice = (frame, w, h) => {
    if (!frame || !w || !h) return 0;
    const thickness = parseFloat(frame.thickness) || 0;
    const netWidth = parseFloat(w) + thickness;
    const netHeight = parseFloat(h) + thickness;
    const perimeter = (netWidth * 2) + (netHeight * 2);
    return (perimeter / 12) * (parseFloat(frame.selling_price) || 0);
  };

  const currentFramePrice = calculateFramePrice(currentFrame, width, height);
  const currentFittingsPrice = selectedFittingIds.reduce((sum, fid) => {
    const fit = fittings.find(f => f.fitting_id === fid);
    return sum + (fit ? parseFloat(fit.price) || 0 : 0);
  }, 0);
  const currentPaintingPrice = selectedPainting ? parseFloat(selectedPainting.price) || 0 : 0;
  const calculatedUnitPrice = currentFramePrice + currentFittingsPrice + currentPaintingPrice;
  
  // Compute final adjusted price
  let adjustedUnitPrice = calculatedUnitPrice;
  const adjVal = parseFloat(priceAdjustmentValue) || 0;
  if (priceAdjustmentType === 'override') {
    adjustedUnitPrice = adjVal;
  } else if (priceAdjustmentType === 'discount') {
    adjustedUnitPrice = Math.max(0, calculatedUnitPrice * (1 - adjVal / 100));
  } else if (priceAdjustmentType === 'markup') {
    adjustedUnitPrice = calculatedUnitPrice * (1 + adjVal / 100);
  }

  const currentItemTotal = adjustedUnitPrice * qty;

  const handleAddFittingToggle = (fid) => {
    if (selectedFittingIds.includes(fid)) {
      setSelectedFittingIds(selectedFittingIds.filter(id => id !== fid));
    } else {
      setSelectedFittingIds([...selectedFittingIds, fid]);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!selectedFrameCode && !selectedPainting) {
      alert("Please select a frame profile or a painting.");
      return;
    }
    if (selectedFrameCode && (!width || !height)) {
      alert("Please enter dimensions for framing.");
      return;
    }
    
    const frame = frames.find(f => f.item_id === selectedFrameCode);
    const addedFittings = selectedFittingIds.map(fid => fittings.find(f => f.fitting_id === fid)).filter(Boolean);
    const framePrice = calculateFramePrice(frame, width, height);
    const fittingsPrice = addedFittings.reduce((sum, f) => sum + (parseFloat(f.price) || 0), 0);
    const paintingPrice = selectedPainting ? parseFloat(selectedPainting.price) || 0 : 0;
    const autoUnitPrice = framePrice + fittingsPrice + paintingPrice;
    
    // Compute item final unit price
    let unitPrice = autoUnitPrice;
    const adjustVal = parseFloat(priceAdjustmentValue) || 0;
    if (priceAdjustmentType === 'override') {
      unitPrice = adjustVal;
    } else if (priceAdjustmentType === 'discount') {
      unitPrice = Math.max(0, autoUnitPrice * (1 - adjustVal / 100));
    } else if (priceAdjustmentType === 'markup') {
      unitPrice = autoUnitPrice * (1 + adjustVal / 100);
    }

    const thickness = frame ? parseFloat(frame.thickness) || 0 : 0;
    const perimeter = ((parseFloat(width || 0) + thickness) * 2) + ((parseFloat(height || 0) + thickness) * 2);
    const feetRequired = frame ? (perimeter / 12) * qty : 0;

    const newItem = {
      id: Date.now(),
      code: frame ? frame.item_id : 'CANVAS_ONLY',
      description: frame ? frame.description : 'Canvas Painting Only',
      width: parseFloat(width || 0),
      height: parseFloat(height || 0),
      thickness: thickness,
      qty: parseInt(qty),
      unitPrice: unitPrice,
      totalPrice: unitPrice * qty,
      feet_size: feetRequired,
      fittings: addedFittings,
      painting: selectedPainting,
      isOverridden: priceAdjustmentType !== 'none',
      adjustmentType: priceAdjustmentType,
      adjustmentValue: priceAdjustmentValue,
      baseUnitPrice: autoUnitPrice
    };

    setPosItems([...posItems, newItem]);
    
    setSelectedFrameCode('');
    setWidth('');
    setHeight('');
    setQty(1);
    setSelectedFittingIds([]);
    setSelectedPainting(null);
    setPaintingSearchQuery('');
    setPaintingSearchResults([]);
    setPriceAdjustmentType('none');
    setPriceAdjustmentValue('');
  };

  const handleRemovePosItem = (itemId) => {
    setPosItems(posItems.filter(item => item.id !== itemId));
  };

  const subTotal = posItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const netTotal = Math.max(0, subTotal - (parseFloat(discount) || 0));
  const balance = Math.max(0, netTotal - advance);

  const handleDiscountPercentChange = (val) => {
    setDiscountPercent(val);
    if (val === '') {
      setDiscount('');
      return;
    }
    const p = parseFloat(val) || 0;
    setDiscount(Math.round(subTotal * p / 100).toString());
  };

  const handleDiscountAmountChange = (val) => {
    setDiscount(val);
    if (val === '') {
      setDiscountPercent('');
      return;
    }
    const amt = parseFloat(val) || 0;
    if (subTotal > 0) {
      setDiscountPercent(((amt / subTotal) * 100).toFixed(1));
    } else {
      setDiscountPercent('');
    }
  };

  useEffect(() => {
    if (discountPercent !== '') {
      const p = parseFloat(discountPercent) || 0;
      setDiscount(Math.round(subTotal * p / 100).toString());
    }
  }, [subTotal]);

  const handlePOSSubmit = (e) => {
    e.preventDefault();
    if (posItems.length === 0) {
      alert("Please add at least one framing item to the invoice.");
      return;
    }

    let customerName = '';
    let customerPhone = '';
    let customerAddress = '';
    let customerEmail = '';

    if (selectedCustomerType === 'existing') {
      const cust = customers.find(c => c.id.toString() === selectedCustomerId);
      if (!cust) {
        alert("Please select a customer.");
        return;
      }
      customerName = cust.name;
      customerPhone = cust.phone;
      customerAddress = cust.address;
      customerEmail = cust.email;
    } else {
      if (!newCustomerName) {
        alert("Please enter a customer name.");
        return;
      }
      customerName = newCustomerName;
      customerPhone = newCustomerPhone;
      customerAddress = newCustomerAddress;
      customerEmail = newCustomerEmail;
    }

    setProcessing(true);

    const payload = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_email: customerEmail,
      total: subTotal,
      discount: parseFloat(discount) || 0.0,
      advance: parseFloat(advance) || 0.0,
      balance: balance,
      delivery_date: deliveryDate || null,
      delivery_time: deliveryTime || null,
      mode_of_payment: paymentMode,
      branch_id: 1,
      new_customer: selectedCustomerType === 'new',
      items: posItems.map(item => ({
        code: item.code === 'CANVAS_ONLY' ? '' : item.code,
        feet_size: item.feet_size,
        paintingId: item.painting ? item.painting.id : null
      }))
    };

    fetch(getApiUrl("/api/sales/invoices"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("POS Checkout database sync failed.");
        return res.json();
      })
      .then(result => {
        setSuccessReceipt({
          invoice_id1: result.invoice_id1,
          customerName,
          customerPhone,
          customerAddress,
          subTotal,
          discount,
          advance,
          balance,
          paymentMode,
          deliveryDate,
          posItems,
          system_date: new Date().toLocaleString()
        });
        setProcessing(false);
        onSuccess();
        
        setPosItems([]);
        setDiscount(0);
        setAdvance(0);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerAddress('');
        setNewCustomerEmail('');
        setSelectedCustomerId('');
      })
      .catch(err => {
        console.error(err);
        alert("Error creating POS invoice: " + err.message);
        setProcessing(false);
      });
  };

  if (successReceipt) {
    return (
      <div className="glass-card" style={{ padding: '2.5rem', maxWidth: '700px', margin: '0 auto', color: '#fff', border: '1px solid var(--accent-gold)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px dashed var(--border-color)', paddingBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--accent-gold)' }}>MAINFRAME THE GALLERY</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>POS INVOICE RECEIPT</p>
          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
            Paid / Recorded
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Invoice ID:</span>
            <p style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>#{successReceipt.invoice_id1}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>System Date:</span>
            <p>{successReceipt.system_date}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Customer Name:</span>
            <p style={{ fontWeight: 600 }}>{successReceipt.customerName}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Customer Phone:</span>
            <p>{successReceipt.customerPhone || 'N/A'}</p>
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontSize: '1.05rem', marginBottom: '1rem' }}>Bill Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {successReceipt.posItems.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div>
                <p style={{ fontWeight: 600 }}>
                  {item.code === 'CANVAS_ONLY' ? 'Canvas Only' : `Frame: ${item.code}`}
                </p>
                {item.painting && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600, marginTop: '0.1rem' }}>
                    Painting: {item.painting.title}
                  </p>
                )}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  Size: {item.width}" x {item.height}" ({item.qty} qty)
                </p>
                {item.fittings.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '0.1rem' }}>
                    Fittings: {item.fittings.map(f => f.name).join(', ')}
                  </p>
                )}
                {item.isOverridden && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontStyle: 'italic' }}>
                    {item.adjustmentType === 'discount' && `Discount Applied: -${item.adjustmentValue}% (Base Unit: ${item.baseUnitPrice.toLocaleString()} PKR)`}
                    {item.adjustmentType === 'markup' && `Markup Applied: +${item.adjustmentValue}% (Base Unit: ${item.baseUnitPrice.toLocaleString()} PKR)`}
                    {item.adjustmentType === 'override' && `Custom Override (Base Unit: ${item.baseUnitPrice.toLocaleString()} PKR)`}
                  </p>
                )}
              </div>
              <strong style={{ alignSelf: 'center' }}>{item.totalPrice.toLocaleString()} PKR</strong>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <strong>{successReceipt.subTotal.toLocaleString()} PKR</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-red)' }}>
            <span>Discount Given:</span>
            <strong>-{parseFloat(successReceipt.discount).toLocaleString()} PKR</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)' }}>
            <span>Advance Received:</span>
            <strong>{parseFloat(successReceipt.advance).toLocaleString()} PKR</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', color: 'var(--accent-gold)' }}>
            <span>Net Balance Due:</span>
            <strong>{successReceipt.balance.toLocaleString()} PKR</strong>
          </div>
          {successReceipt.deliveryDate && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              <span>Scheduled Delivery:</span>
              <strong>{successReceipt.deliveryDate}</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button onClick={() => window.print()} className="btn-secondary" style={{ flex: 1 }}>
            Print Receipt
          </button>
          <button onClick={() => setSuccessReceipt(null)} className="btn-primary" style={{ flex: 1 }}>
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={20} /> Create POS Billing Invoice
        </h2>

        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>1. CUSTOMER INFORMATION</span>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="radio" name="custType" checked={selectedCustomerType === 'existing'} onChange={() => setSelectedCustomerType('existing')} style={{ accentColor: 'var(--accent-gold)' }} /> Existing Customer
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="radio" name="custType" checked={selectedCustomerType === 'new'} onChange={() => setSelectedCustomerType('new')} style={{ accentColor: 'var(--accent-gold)' }} /> Add New Customer
            </label>
          </div>

          {selectedCustomerType === 'existing' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Select Profile</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}>
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Full Name *</label>
                <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} placeholder="e.g. Asif Raza" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Phone Number</label>
                <input type="text" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} placeholder="e.g. 03001234567" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email Address</label>
                <input type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} placeholder="e.g. asif@example.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Billing Address</label>
                <input type="text" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} placeholder="Street details, Karachi" />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>2. FRAMING LINE ITEMS COMPOSER</span>
          <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
            
            {/* Search Painting Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Link Painting from Database (Optional)</label>
                <input 
                  type="text" 
                  value={paintingSearchQuery} 
                  onChange={(e) => setPaintingSearchQuery(e.target.value)} 
                  placeholder="Search painting code, title, or artist..." 
                  style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} 
                />
              </div>
              <button 
                type="button" 
                onClick={handleSearchPaintings} 
                className="btn-secondary" 
                style={{ padding: '0.7rem', width: '100%' }}
                disabled={loadingPaintings}
              >
                {loadingPaintings ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Painting Results Dropdown */}
            {paintingSearchResults.length > 0 && (
              <div style={{ backgroundColor: 'rgba(18, 20, 24, 0.95)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', maxHeight: '180px', overflowY: 'auto', zIndex: 10 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Matching Paintings:</span>
                {paintingSearchResults.map(art => (
                  <div 
                    key={art.id} 
                    onClick={() => handleSelectPainting(art)} 
                    style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    className="submenu-btn"
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>{art.code || 'NO CODE'}</strong> - <span style={{ fontSize: '0.85rem' }}>{art.title}</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>by {art.artist_name} | Size: {art.width}" x {art.length}"</span>
                    </div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>{art.price ? `${art.price.toLocaleString()} PKR` : 'Inquiry'}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Painting Label */}
            {selectedPainting && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked Painting</span>
                  <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', marginTop: '0.15rem' }}>
                    {selectedPainting.title} (Code: {selectedPainting.code})
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Artist: {selectedPainting.artist_name} | Price: {selectedPainting.price.toLocaleString()} PKR
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedPainting(null);
                    setPaintingSearchQuery('');
                    setPaintingSearchResults([]);
                  }} 
                  className="btn-secondary" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  Unlink
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Select Frame Profile</label>
                <select value={selectedFrameCode} onChange={(e) => setSelectedFrameCode(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required={!selectedPainting}>
                  <option value="">-- Choose Frame (Optional if Painting Linked) --</option>
                  {frames.map(f => (
                    <option key={f.frame_id} value={f.item_id}>{f.item_id} - {f.description || 'No desc'} (Ft: {f.selling_price} PKR, Thickness: {f.thickness}")</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Artwork Width (in)</label>
                <input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="12" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Artwork Height (in)</label>
                <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required placeholder="16" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Quantity</label>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Include Custom Fittings / Protection Layers</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {fittings.map(fit => (
                  <label key={fit.fitting_id} className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', borderColor: selectedFittingIds.includes(fit.fitting_id) ? 'var(--accent-gold)' : 'var(--border-color)', backgroundColor: selectedFittingIds.includes(fit.fitting_id) ? 'rgba(212, 175, 55, 0.05)' : 'var(--bg-card)' }}>
                    <input type="checkbox" checked={selectedFittingIds.includes(fit.fitting_id)} onChange={() => handleAddFittingToggle(fit.fitting_id)} style={{ accentColor: 'var(--accent-gold)' }} />
                    <div>
                      <span>{fit.name}</span>
                      <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>+{fit.price} PKR</strong>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Adjustment Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-end' }}>
              <div style={{ flex: '2 1 250px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Price Adjustment Type</label>
                <select 
                  value={priceAdjustmentType} 
                  onChange={(e) => {
                    setPriceAdjustmentType(e.target.value);
                    setPriceAdjustmentValue('');
                  }} 
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="none">No Adjustment (Use Auto-Calculated Price)</option>
                  <option value="override">Custom Price (Override per Unit)</option>
                  <option value="discount">Apply Discount Percentage (%)</option>
                  <option value="markup">Apply Markup Percentage (%)</option>
                </select>
              </div>
              
              {priceAdjustmentType !== 'none' && (
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    {priceAdjustmentType === 'override' ? 'New Price (PKR) *' : priceAdjustmentType === 'discount' ? 'Discount % *' : 'Markup % *'}
                  </label>
                  <input 
                    type="number" 
                    value={priceAdjustmentValue} 
                    onChange={(e) => setPriceAdjustmentValue(e.target.value)} 
                    placeholder={priceAdjustmentType === 'override' ? 'e.g. 5000' : 'e.g. 10'} 
                    style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} 
                    required 
                  />
                </div>
              )}
              
              {priceAdjustmentType !== 'none' && (
                <div style={{ flex: '1.2 1 180px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {priceAdjustmentType === 'override' ? (
                      <>
                        <button type="button" onClick={() => setPriceAdjustmentValue(Math.round(calculatedUnitPrice * 0.9).toString())} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', margin: 0, flex: 1 }}>-10%</button>
                        <button type="button" onClick={() => setPriceAdjustmentValue(Math.round(calculatedUnitPrice * 0.95).toString())} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', margin: 0, flex: 1 }}>-5%</button>
                        <button type="button" onClick={() => setPriceAdjustmentValue(Math.round(calculatedUnitPrice * 1.1).toString())} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', margin: 0, flex: 1 }}>+10%</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setPriceAdjustmentValue('5')} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', margin: 0, flex: 1 }}>5%</button>
                        <button type="button" onClick={() => setPriceAdjustmentValue('10')} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', margin: 0, flex: 1 }}>10%</button>
                        <button type="button" onClick={() => setPriceAdjustmentValue('15')} className="btn-secondary" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', margin: 0, flex: 1 }}>15%</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(selectedFrameCode || selectedPainting) && (
              <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--accent-gold)', borderRadius: '10px', backgroundColor: 'rgba(212, 175, 55, 0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-gold)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', margin: 0 }}>
                  🔍 Measurement & Pricing Formula Breakdown
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.85rem' }}>
                  {/* Left Column: Dimensions & Formula */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedFrameCode && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Selected Frame Profile:</span>
                          <strong>{currentFrame?.item_id} ({currentFrame?.description || 'N/A'})</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Input Size (W x H):</span>
                          <strong>{width || 0}" x {height || 0}"</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Frame Thickness (T):</span>
                          <strong>{currentFrame?.thickness || 0}"</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Perimeter calculation:</span>
                          <strong>((W + T) * 2) + ((H + T) * 2)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)', paddingLeft: '0.5rem' }}>Calculation:</span>
                          <span>(({parseFloat(width || 0)} + {currentFrame?.thickness || 0}) * 2) + (({parseFloat(height || 0)} + {currentFrame?.thickness || 0}) * 2) = <strong>{(((parseFloat(width || 0) + (currentFrame?.thickness || 0)) * 2) + ((parseFloat(height || 0) + (currentFrame?.thickness || 0)) * 2)).toFixed(2)} in.</strong></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Length in Feet (Perimeter / 12):</span>
                          <strong>{((((parseFloat(width || 0) + (currentFrame?.thickness || 0)) * 2) + ((parseFloat(height || 0) + (currentFrame?.thickness || 0)) * 2)) / 12).toFixed(2)} ft.</strong>
                        </div>
                      </>
                    )}
                    {!selectedFrameCode && selectedPainting && (
                      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Painting Canvas Only (No framing charges apply).
                      </div>
                    )}
                  </div>

                  {/* Right Column: Costs addition */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1.5rem' }}>
                    {selectedFrameCode && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Frame Cost ({((((parseFloat(width || 0) + (currentFrame?.thickness || 0)) * 2) + ((parseFloat(height || 0) + (currentFrame?.thickness || 0)) * 2)) / 12).toFixed(2)} ft @ {currentFrame?.selling_price || 0}/ft):</span>
                        <strong>{currentFramePrice.toFixed(0)} PKR</strong>
                      </div>
                    )}
                    {selectedFittingIds.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Fittings / Layers:</span>
                        <strong>{currentFittingsPrice.toFixed(0)} PKR</strong>
                      </div>
                    )}
                    {selectedPainting && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Painting Base Cost:</span>
                        <strong>{currentPaintingPrice.toLocaleString()} PKR</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Base Calculated Price:</span>
                      <strong>{calculatedUnitPrice.toLocaleString()} PKR</strong>
                    </div>

                    {priceAdjustmentType !== 'none' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: priceAdjustmentType === 'discount' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        <span>
                          Adjustment ({priceAdjustmentType === 'override' ? 'Override' : priceAdjustmentType === 'discount' ? 'Discount' : 'Markup'}{priceAdjustmentType !== 'override' ? ` ${priceAdjustmentValue}%` : ''}):
                        </span>
                        <strong>
                          {priceAdjustmentType === 'override' 
                            ? `${(adjustedUnitPrice - calculatedUnitPrice).toLocaleString()} PKR` 
                            : priceAdjustmentType === 'discount' 
                              ? `-${(calculatedUnitPrice - adjustedUnitPrice).toLocaleString()} PKR` 
                              : `+${(adjustedUnitPrice - calculatedUnitPrice).toLocaleString()} PKR`}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Unit Price Box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Final Price per Unit × {qty} qty:
                  </span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                    {priceAdjustmentType !== 'none' && (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {calculatedUnitPrice.toLocaleString()} PKR
                      </span>
                    )}
                    <strong style={{ fontSize: '1.4rem', color: 'var(--accent-gold)' }}>
                      {adjustedUnitPrice.toLocaleString()} PKR
                    </strong>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Total: <strong>{currentItemTotal.toLocaleString()} PKR</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.6rem 1.5rem' }}>
              <Plus size={16} /> Add Item to Bill
            </button>
          </form>
        </div>

        {posItems.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Items in Bill ({posItems.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {posItems.map((item) => (
                <div key={item.id} className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.05rem' }}>
                      {item.code === 'CANVAS_ONLY' ? 'Canvas Only' : `Frame Profile: ${item.code}`}
                    </h4>
                    {item.painting && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 600, marginTop: '0.2rem' }}>
                        Painting: {item.painting.title} (Code: {item.painting.code}) by {item.painting.artist_name}
                      </p>
                    )}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Dimensions: {item.width}" Width x {item.height}" Height (Qty: {item.qty})
                    </p>
                    {item.fittings.length > 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginTop: '0.25rem' }}>Fittings: {item.fittings.map(f => `${f.name} (+${f.price})`).join(', ')}</p>
                    )}
                    {item.isOverridden && (
                      <p style={{ fontSize: '0.8rem', color: item.adjustmentType === 'discount' ? 'var(--accent-red)' : 'var(--accent-green)', marginTop: '0.25rem' }}>
                        {item.adjustmentType === 'discount' && `Applied Discount: -${item.adjustmentValue}% (Base: ${item.baseUnitPrice.toLocaleString()} PKR/unit)`}
                        {item.adjustmentType === 'markup' && `Applied Markup: +${item.adjustmentValue}% (Base: ${item.baseUnitPrice.toLocaleString()} PKR/unit)`}
                        {item.adjustmentType === 'override' && `Custom Override Price: ${item.unitPrice.toLocaleString()} PKR (Base: ${item.baseUnitPrice.toLocaleString()} PKR/unit)`}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Line Total:</span>
                      <p style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{item.totalPrice.toLocaleString()} PKR</p>
                    </div>
                    <button onClick={() => handleRemovePosItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }} title="Remove item"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {posItems.length > 0 && (
          <form onSubmit={handlePOSSubmit} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Delivery Date</label>
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Delivery Time</label>
                  <input type="text" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} placeholder="e.g. 5:00 PM" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Payment Mode</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                </select>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span>Gross Subtotal:</span>
                  <strong>{subTotal.toLocaleString()} PKR</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem' }}>Discount:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={discountPercent} 
                      onChange={(e) => handleDiscountPercentChange(e.target.value)} 
                      placeholder="%"
                      style={{ width: '100%', padding: '0.4rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', textAlign: 'right' }} 
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input 
                      type="number" 
                      min="0" 
                      value={discount} 
                      onChange={(e) => handleDiscountAmountChange(e.target.value)} 
                      placeholder="PKR"
                      style={{ width: '100%', padding: '0.4rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', textAlign: 'right' }} 
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PKR</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 600, borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <span>Net Total:</span>
                  <span style={{ color: '#fff' }}>{netTotal.toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem' }}>Advance Payment:</span>
                  <input type="number" min="0" value={advance} onChange={(e) => setAdvance(Math.min(netTotal, parseFloat(e.target.value) || 0))} style={{ width: '120px', padding: '0.4rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', borderTop: '2px solid var(--border-color)', paddingTop: '0.75rem', color: 'var(--accent-gold)' }}>
                  <span>Balance Due:</span>
                  <strong>{balance.toLocaleString()} PKR</strong>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.9rem' }} disabled={processing}>
                {processing ? 'Generating Invoice...' : 'Generate & Record POS Invoice'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
