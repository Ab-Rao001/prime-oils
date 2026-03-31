import React, { useMemo, useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { COMPLAINTS, PRODUCTS } from '../data/mockData';

export default function Complaints({ role, user }) {
  const [cmps, setCmps] = useState(COMPLAINTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product: '', type: 'damaged', issue: '' });

  const visible = useMemo(() => {
    if (role === 'shopkeeper' && user?.name) return cmps.filter(c => c.shop === user.name);
    return cmps;
  }, [cmps, role, user]);

  const update = (id, status) =>
    setCmps(cmps.map(c => c.id === id ? { ...c, status } : c));

  const registerComplaint = () => {
    if (!form.product || !form.issue) return;
    const maxNum = Math.max(
      0,
      ...cmps.map(c => Number(String(c.id).replace(/\D/g, '')) || 0)
    );
    const id = `CMP-${String(maxNum + 1).padStart(3, '0')}`;
    const d = new Date();
    const date = d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).split(',')[0];

    setCmps(prev => ([
      ...prev,
      {
        id,
        shop: user?.name || 'Unknown Shop',
        product: form.product,
        issue: form.issue,
        type: form.type,
        status: 'pending',
        date,
      },
    ]));
    setForm({ product: '', type: 'damaged', issue: '' });
    setShowForm(false);
  };

  return (
    <div className="page-enter">
      <SectionHeader
        title="Complaint Management"
        btn={role === 'admin' ? null : 'Register Complaint'}
        onBtn={() => setShowForm(true)}
      />

      {showForm && role !== 'admin' && (
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>New Complaint</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Product</label>
                <select
                  value={form.product}
                  onChange={e => setForm({ ...form, product: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                >
                  <option value="">Select product...</option>
                  {PRODUCTS.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                >
                  {['damaged', 'order', 'exchange'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Issue</label>
                <input
                  value={form.issue}
                  onChange={e => setForm({ ...form, issue: e.target.value })}
                  placeholder="Describe the issue..."
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={registerComplaint} style={{ flex: 1, padding: '9px 12px', background: C.gold, border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                Submit
              </button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Pending',    color: C.warn,    key: 'pending'    },
          { label: 'Processing', color: C.info,    key: 'processing' },
          { label: 'Resolved',   color: C.success, key: 'resolved'   },
          { label: 'Total',      color: C.gold,    key: null         },
        ].map(({ label, color, key }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>
              {key ? visible.filter(c => c.status === key).length : visible.length}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Complaint cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(c => (
          <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '15px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.id}</span>
                  <Badge s={c.type} />
                  <Badge s={c.status} />
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>Shop: <span style={{ color: C.text, fontWeight: 500 }}>{c.shop}</span></div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>Product: <span style={{ color: C.text }}>{c.product}</span></div>
                <div style={{ fontSize: 13, color: C.muted }}>Issue: <span style={{ color: C.text }}>{c.issue}</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <span style={{ fontSize: 11, color: C.muted }}>{c.date}</span>
                {role === 'admin' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.status === 'pending' && (
                      <button onClick={() => update(c.id, 'processing')} style={{ padding: '4px 10px', background: C.iBg, border: 'none', borderRadius: 6, color: C.info, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        Process
                      </button>
                    )}
                    {c.status !== 'resolved' && (
                      <button onClick={() => update(c.id, 'resolved')} style={{ padding: '4px 10px', background: C.sBg, border: 'none', borderRadius: 6, color: C.success, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
