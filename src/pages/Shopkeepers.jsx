import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { SHOPKEEPERS } from '../data/mockData';

export default function Shopkeepers({ role }) {
  const [shops, setShops]  = useState(SHOPKEEPERS);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', loc: '', phone: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ owner: '', loc: '', phone: '', status: 'active' });

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner.toLowerCase().includes(search.toLowerCase()) ||
    s.loc.toLowerCase().includes(search.toLowerCase())
  );

  const addShopkeeper = () => {
    if (!form.name || !form.owner || !form.loc || !form.phone) return;
    const nextId = Math.max(0, ...shops.map(s => s.id)) + 1;
    setShops(prev => ([
      ...prev,
      { id: nextId, name: form.name, owner: form.owner, loc: form.loc, phone: form.phone, status: 'active', credit: 0, total: 0 },
    ]));
    setForm({ name: '', owner: '', loc: '', phone: '' });
    setShowForm(false);
  };

  const startEdit = s => {
    setEditId(s.id);
    setEditForm({
      owner: s.owner,
      loc: s.loc,
      phone: s.phone,
      status: s.status,
    });
  };

  const saveEdit = () => {
    if (!editId) return;
    setShops(prev => prev.map(s =>
      s.id === editId
        ? { ...s, owner: editForm.owner, loc: editForm.loc, phone: editForm.phone, status: editForm.status }
        : s
    ));
    setEditId(null);
  };

  return (
    <div className="page-enter">
      <SectionHeader title="Shopkeeper Management" btn="Add Shopkeeper" onBtn={() => setShowForm(true)} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search name, owner, location..." />

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Add Shopkeeper</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Shop Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Owner</label>
              <input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Location</label>
              <input value={form.loc} onChange={e => setForm({ ...form, loc: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={addShopkeeper} style={{ flex: 1, padding: '9px 12px', background: C.gold, border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              Add
            </button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editId && (
        <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Edit Shopkeeper</div>
            <button onClick={() => setEditId(null)} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.muted, fontWeight: 700 }}>
              Cancel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Owner</label>
              <input value={editForm.owner} onChange={e => setEditForm({ ...editForm, owner: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Location</label>
              <input value={editForm.loc} onChange={e => setEditForm({ ...editForm, loc: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Phone</label>
              <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}>
                {['active','inactive'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={saveEdit} style={{ flex: 1, padding: '9px 12px', background: C.gold, border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 800 }}>
              Save
            </button>
            <button onClick={() => setEditId(null)} style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontWeight: 700 }}>
              Close
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
        {filtered.map(s => (
          <div key={s.id} style={{
            background: C.card,
            border: `1px solid ${s.status === 'active' ? C.border : C.danger + '44'}`,
            borderRadius: 14, padding: '16px 18px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.owner}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Badge s={s.status} />
                {role === 'admin' && (
                  <button
                    onClick={() => startEdit(s)}
                    style={{ padding: '5px 10px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 8, cursor: 'pointer', color: C.gold, fontWeight: 800, fontSize: 11 }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6 }}>📍 {s.loc}</div>
              <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 6 }}>📞 {s.phone}</div>
            </div>

            {/* Financials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.credit > 0 ? C.danger : C.success }}>
                  PKR {s.credit.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Outstanding</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
                  PKR {(s.total / 1000).toFixed(0)}K
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Total Purchase</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
