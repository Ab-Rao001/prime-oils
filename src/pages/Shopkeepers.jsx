import React, { useState, useEffect, useMemo } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { useFetch } from '../hooks/useFetch';
import { useVirtualScroll } from '../hooks/useVirtual';
import { useDebounce } from '../hooks/useDebounce';
import { SkeletonTable } from '../components/common/Skeleton';
import FormInput from '../components/common/FormInput';
import { ApiError } from '../components/ApiMessage';
import { api } from '../api/client';

export default function Shopkeepers({ role }) {
  const { data: shops, setData: setShops, loading, error } = useFetch(() => api.getShopkeepers(), []);
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); // Debounce search input

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', loc: '', phone: '' });
  const [formErrors, setFormErrors] = useState({});

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ owner: '', loc: '', phone: '', status: 'active' });
  const [editErrors, setEditErrors] = useState({});

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter based on debounced search
  const filtered = useMemo(() => {
    return shops.filter(s =>
      s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.owner.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.loc.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [shops, debouncedSearch]);

  // Virtualize the grid of cards
  const colsCount = isMobile ? 1 : (window.innerWidth <= 1024 ? 2 : 3);
  const chunkedShops = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < filtered.length; i += colsCount) {
      chunks.push(filtered.slice(i, i + colsCount));
    }
    return chunks;
  }, [filtered, colsCount]);

  const rowHeight = 220; // Height of card row + margins
  const viewportHeight = 450;
  
  const { visibleItems, totalHeight, startOffset, onScroll } = useVirtualScroll({
    items: chunkedShops,
    rowHeight,
    viewportHeight
  });

  const startIndex = Math.max(0, Math.floor(startOffset / rowHeight));
  const bottomPadding = Math.max(0, totalHeight - startOffset - (visibleItems.length * rowHeight));

  const validateAddForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Shop name is required';
    if (!form.owner.trim()) errors.owner = 'Owner is required';
    if (!form.loc.trim()) errors.loc = 'Location is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.owner.trim()) errors.owner = 'Owner is required';
    if (!editForm.loc.trim()) errors.loc = 'Location is required';
    if (!editForm.phone.trim()) errors.phone = 'Phone number is required';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addShopkeeper = async () => {
    if (!validateAddForm()) return;
    try {
      const created = await api.createShopkeeper({
        name: form.name, owner: form.owner, loc: form.loc, phone: form.phone, status: 'active', credit: 0, total: 0,
      });
      setShops(prev => [...prev, created]);
      setForm({ name: '', owner: '', loc: '', phone: '' });
      setFormErrors({});
      setShowForm(false);
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = s => {
    setEditId(s._id || s.id);
    setEditForm({
      owner: s.owner,
      loc: s.loc,
      phone: s.phone,
      status: s.status,
    });
    setEditErrors({});
  };

  const saveEdit = async () => {
    if (!validateEditForm()) return;
    try {
      const updated = await api.updateShopkeeper(editId, editForm);
      setShops(prev => prev.map(s => (s.id === editId || s._id === editId ? updated : s)));
    } catch {
      setShops(prev => prev.map(s =>
        s.id === editId || s._id === editId
          ? { ...s, owner: editForm.owner, loc: editForm.loc, phone: editForm.phone, status: editForm.status }
          : s
      ));
    }
    setEditId(null);
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Shopkeeper Management" />
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <SectionHeader title="Shopkeeper Management" btn="Add Shopkeeper" onBtn={() => setShowForm(!showForm)} />
      
      <SearchBar value={search} onChange={setSearch} placeholder="Search name, owner, location..." />

      {/* Add shopkeeper form */}
      {showForm && (
        <div className="card-premium" style={{ background: C.card, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Register New Shopkeeper</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <FormInput
              id="name"
              label="Shop Name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              error={formErrors.name}
            />
            <FormInput
              id="owner"
              label="Owner Name"
              required
              value={form.owner}
              onChange={e => setForm({ ...form, owner: e.target.value })}
              error={formErrors.owner}
            />
            <FormInput
              id="loc"
              label="Location"
              required
              value={form.loc}
              onChange={e => setForm({ ...form, loc: e.target.value })}
              error={formErrors.loc}
            />
            <FormInput
              id="phone"
              label="Phone Number"
              required
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              error={formErrors.phone}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={addShopkeeper} style={{ padding: '9px 20px', background: C.gold, border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              Add Shopkeeper
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 16px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit shopkeeper form */}
      {editId && (
        <div className="card-premium" style={{ background: C.card, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Edit Shopkeeper Credentials</div>
            <button onClick={() => setEditId(null)} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.muted, fontWeight: 600 }}>
              Cancel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <FormInput
              id="edit-owner"
              label="Owner Name"
              required
              value={editForm.owner}
              onChange={e => setEditForm({ ...editForm, owner: e.target.value })}
              error={editErrors.owner}
            />
            <FormInput
              id="edit-loc"
              label="Location"
              required
              value={editForm.loc}
              onChange={e => setEditForm({ ...editForm, loc: e.target.value })}
              error={editErrors.loc}
            />
            <FormInput
              id="edit-phone"
              label="Phone Number"
              required
              value={editForm.phone}
              onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              error={editErrors.phone}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="edit-status" style={{ fontSize: '11px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Status</label>
              <select
                id="edit-status"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, outline: 'none', fontSize: 13, height: '40px' }}
              >
                {['active','inactive'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={saveEdit} style={{ padding: '9px 20px', background: C.gold, border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              Save Changes
            </button>
            <button onClick={() => setEditId(null)} style={{ padding: '9px 16px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Virtualized Cards Grid Container */}
      <div
        onScroll={onScroll}
        style={{
          maxHeight: `${viewportHeight}px`,
          overflowY: 'auto',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Top spacer padding */}
          {startOffset > 0 && <div style={{ height: `${startOffset}px` }} />}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {visibleItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.muted, background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
                No shopkeepers found matching search criteria.
              </div>
            ) : (
              visibleItems.map((rowItems, rowIndex) => (
                <div
                  key={rowIndex}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${colsCount}, 1fr)`,
                    gap: '14px',
                    height: '206px', // fixed height per row of cards
                  }}
                >
                  {rowItems.map(s => (
                    <div
                      key={s._id || s.id}
                      className="card-premium"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        animation: 'fadeIn 0.25s ease-out'
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.owner}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <Badge s={s.status} />
                          {role === 'admin' && (
                            <button
                              onClick={() => startEdit(s)}
                              style={{ padding: '5px 10px', background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 8, cursor: 'pointer', color: C.gold, fontWeight: 700, fontSize: 11, transition: 'all 0.15s ease' }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '8px 0' }}>
                        <div style={{ fontSize: 12, color: C.muted }}>📍 {s.loc}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>📞 {s.phone}</div>
                      </div>

                      {/* Card Financials Footer */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 750, color: s.credit > 0 ? C.danger : C.success }}>
                            PKR {s.credit.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Outstanding</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 750, color: C.gold }}>
                            PKR {(s.total / 1000).toFixed(0)}K
                          </div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Total Purchases</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fill empty grid spaces in the last row to prevent stretching */}
                  {rowItems.length < colsCount && Array.from({ length: colsCount - rowItems.length }).map((_, emptyIdx) => (
                    <div key={`empty-${emptyIdx}`} style={{ visibility: 'hidden' }} />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Bottom spacer padding */}
          {bottomPadding > 0 && <div style={{ height: `${bottomPadding}px` }} />}
        </div>
      </div>
    </div>
  );
}
