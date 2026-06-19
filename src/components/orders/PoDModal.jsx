import React, { useState, useEffect, useRef } from 'react';
import C from '../../theme';
import toast from 'react-hot-toast';

export default function PoDModal({ dispatch, onClose, onComplete }) {
  const [outcome, setOutcome] = useState('DELIVERED');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Signature Canvas state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState([]);

  // Item verification state
  // We need to flatten lineItems from all orders into a single checkable list
  const [deliveryItems, setDeliveryItems] = useState([]);

  useEffect(() => {
    // Flatten items
    if (dispatch && dispatch.orders) {
      const items = [];
      dispatch.orders.forEach(o => {
        (o.lineItems || []).forEach(li => {
          items.push({
            orderId: o._id || o.id,
            productId: li.productId,
            productName: li.productName,
            expectedQuantity: li.quantity,
            deliveredQuantity: li.quantity, // Default to expected
          });
        });
      });
      setDeliveryItems(items);
    }
  }, [dispatch]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps([pos.coords.longitude, pos.coords.latitude]),
        err => console.warn('GPS not available', err)
      );
    }
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Canvas Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleQuantityChange = (idx, value) => {
    const qty = parseInt(value, 10);
    setDeliveryItems(prev => prev.map((item, i) => i === idx ? { ...item, deliveredQuantity: isNaN(qty) ? 0 : qty } : item));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (outcome === 'FAILED' && !failureReason.trim()) {
      return toast.error('Please provide a failure reason');
    }

    if (outcome === 'DELIVERED' && !hasSignature) {
      return toast.error('Signature is required for successful delivery');
    }
    
    setLoading(true);
    try {
      let signatureUrl = '';
      if (hasSignature && canvasRef.current) {
        signatureUrl = canvasRef.current.toDataURL('image/png');
      }

      // Automatically determine if PARTIAL based on deliveryItems mismatch
      let finalOutcome = outcome;
      if (outcome === 'DELIVERED') {
        const hasMismatch = deliveryItems.some(i => i.deliveredQuantity !== i.expectedQuantity);
        if (hasMismatch) finalOutcome = 'PARTIAL';
      }

      const payload = {
        outcome: finalOutcome,
        failureReason: finalOutcome === 'FAILED' ? failureReason : undefined,
        deliveryItems: finalOutcome !== 'FAILED' ? deliveryItems.map(item => ({
          orderId: item.orderId,
          productId: item.productId,
          expectedQuantity: item.expectedQuantity,
          deliveredQuantity: item.deliveredQuantity,
          status: item.deliveredQuantity === item.expectedQuantity ? 'DELIVERED' : 'PARTIAL'
        })) : [],
        proofOfDelivery: finalOutcome !== 'FAILED' ? {
          receiverName,
          receiverPhone,
          notes,
          gpsLocation: gps,
          signatureUrl,
          photoUrls: photos // Mock URLs for frontend
        } : undefined
      };
      
      await onComplete(dispatch._id, payload);
    } catch (err) {
      toast.error(err.message || 'Failed to submit PoD');
    } finally {
      setLoading(false);
    }
  };

  if (!dispatch) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: C.text }}>Proof of Delivery</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: 20, padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, color: C.muted }}>Dispatch Route</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.gold }}>{dispatch.dispatchId}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Orders: {dispatch.orders?.length || 0}</div>
          </div>

          <form id="pod-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.text }}>Delivery Outcome</label>
              <select 
                value={outcome} 
                onChange={e => setOutcome(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text }}
              >
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Delivery Failed</option>
              </select>
            </div>

            {outcome === 'FAILED' ? (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.text }}>Failure Reason *</label>
                <textarea 
                  required 
                  value={failureReason} 
                  onChange={e => setFailureReason(e.target.value)}
                  placeholder="e.g. Shop closed, refused delivery..."
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${C.danger}88`, background: C.bg, color: C.text, minHeight: 80, boxSizing: 'border-box' }}
                />
              </div>
            ) : (
              <>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: 12, background: C.bg, fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${C.border}` }}>Verify Item Quantities</div>
                  {deliveryItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: idx < deliveryItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{item.productName}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>Expected: {item.expectedQuantity}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Delivered:</span>
                        <input 
                          type="number" 
                          min="0"
                          max={item.expectedQuantity}
                          value={item.deliveredQuantity} 
                          onChange={e => handleQuantityChange(idx, e.target.value)}
                          style={{ width: 60, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  ))}
                  {deliveryItems.length === 0 && <div style={{ padding: 12, color: C.muted, fontSize: 13 }}>No items found.</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.text }}>Receiver Name</label>
                    <input 
                      type="text" 
                      value={receiverName} 
                      onChange={e => setReceiverName(e.target.value)}
                      placeholder="John Doe"
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.text }}>Phone</label>
                    <input 
                      type="text" 
                      value={receiverPhone} 
                      onChange={e => setReceiverPhone(e.target.value)}
                      placeholder="0300..."
                      style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Customer Signature *</label>
                    <button type="button" onClick={clearSignature} style={{ fontSize: 11, background: 'none', border: 'none', color: C.gold, cursor: 'pointer', fontWeight: 600 }}>Clear</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width: '100%', background: '#fff', border: `1px dashed ${C.border}`, borderRadius: 8, touchAction: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.text }}>Photo Evidence (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    multiple
                    onChange={handlePhotoUpload}
                    style={{ display: 'block', width: '100%', padding: 8, fontSize: 13 }}
                  />
                  {photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
                      {photos.map((src, idx) => (
                        <img key={idx} src={src} alt={`evidence-${idx}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}` }} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: gps ? `${C.success}11` : `${C.warn}11`, borderRadius: 8, border: `1px solid ${gps ? C.success : C.warn}44` }}>
                  <span style={{ fontSize: 20 }}>{gps ? '📍' : '⏳'}</span>
                  <div style={{ fontSize: 13, color: C.text }}>
                    {gps ? `GPS Location Captured: [${gps[0].toFixed(4)}, ${gps[1].toFixed(4)}]` : 'Acquiring GPS location...'}
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        <div style={{ padding: 20, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 12, background: C.bg }}>
          <button type="button" onClick={onClose} disabled={loading} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Cancel
          </button>
          <button type="submit" form="pod-form" disabled={loading} style={{ flex: 1, padding: 12, background: outcome === 'FAILED' ? C.danger : C.success, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Submitting...' : 'Complete Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}
