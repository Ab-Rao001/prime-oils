import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { THead, TRow, TCell } from '../components/Table';
import { PRODUCTS } from '../data/mockData';

export default function Inventory({ role }) {
  const [products, setProducts] = useState(PRODUCTS);
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', cat: '', stock: '', unit: '', price: '', min: '' });
  const [adjust, setAdjust] = useState({});

  const canAddProduct = role === 'admin' || role === 'supplier';
  const canAdjustStock = role === 'supplier';

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cat.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name) return;
    setProducts([...products, { ...form, id: Date.now(), stock: +form.stock, price: +form.price, min: +form.min }]);
    setForm({ name: '', cat: '', stock: '', unit: '', price: '', min: '' });
    setShowForm(false);
  };

  const applyStockAdjust = (id) => {
    const delta = +adjust[id];
    if (Number.isNaN(delta)) return;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: p.stock + delta } : p));
    setAdjust(prev => ({ ...prev, [id]: '' }));
  };

  const FIELDS = [
    { label: 'Product Name', key: 'name'  },
    { label: 'Category',     key: 'cat'   },
    { label: 'Stock',        key: 'stock' },
    { label: 'Unit',         key: 'unit'  },
    { label: 'Price (PKR)',  key: 'price' },
    { label: 'Min Stock',    key: 'min'   },
  ];

  return (
    <div className="page-enter">
      <SectionHeader
        title="Inventory Management"
        btn={canAddProduct ? 'Add Product' : null}
        onBtn={() => setShowForm(!showForm)}
      />

      {showForm && canAddProduct && (
        <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>New Product</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {FIELDS.map(({ label, key }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: '100%', padding: '7px 9px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleAdd} style={{ padding: '7px 18px', background: C.gold, color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <THead cols={canAdjustStock ? ['Product', 'Category', 'Stock', 'Unit', 'Price', 'Min Stock', 'Status', 'Adjust'] : ['Product', 'Category', 'Stock', 'Unit', 'Price', 'Min Stock', 'Status']} />
          <tbody>
            {filtered.map(p => (
              <TRow key={p.id}>
                <TCell bold>{p.name}</TCell>
                <TCell>{p.cat}</TCell>
                <TCell bold color={p.stock < p.min ? C.danger : C.text}>{p.stock}</TCell>
                <TCell>{p.unit}</TCell>
                <TCell>PKR {p.price.toLocaleString()}</TCell>
                <TCell>{p.min}</TCell>
                <TCell><Badge s={p.stock < p.min ? 'overdue' : 'active'} /></TCell>
                {canAdjustStock && (
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={adjust[p.id] || ''}
                        onChange={e => setAdjust(prev => ({ ...prev, [p.id]: e.target.value }))}
                        style={{ width: 86, padding: '5px 7px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: C.bg, outline: 'none' }}
                        placeholder="+"
                      />
                      <button
                        onClick={() => applyStockAdjust(p.id)}
                        style={{ padding: '6px 10px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                      >
                        Apply
                      </button>
                    </div>
                  </td>
                )}
              </TRow>
            ))}
          </tbody>
        </table>
      </div>

      {products.some(p => p.stock < p.min) && (
        <div style={{ background: C.dBg, border: `1px solid ${C.danger}22`, borderRadius: 9, padding: '10px 14px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.danger }}>
            Low stock alert: {products.filter(p => p.stock < p.min).map(p => p.name).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
