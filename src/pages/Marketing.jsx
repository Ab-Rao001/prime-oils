import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { CAMPAIGNS } from '../data/mockData';

export default function Marketing() {
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', budget: '', start: '', end: '' });

  const addCampaign = () => {
    if (!form.name || !form.budget || !form.start || !form.end) return;
    const nextId = Math.max(0, ...campaigns.map(c => c.id)) + 1;
    const budgetNum = +form.budget;
    const d1 = new Date(form.start);
    const d2 = new Date(form.end);
    const start = isNaN(d1.getTime()) ? form.start : d1.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const end = isNaN(d2.getTime()) ? form.end : d2.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    setCampaigns(prev => ([
      ...prev,
      { id: nextId, name: form.name, budget: budgetNum, spent: 0, start, end, status: 'planned', roi: '—' },
    ]));
    setForm({ name: '', budget: '', start: '', end: '' });
    setShowForm(false);
  };

  const totalBudget    = campaigns.reduce((a, c) => a + c.budget, 0);
  const totalSpent     = campaigns.reduce((a, c) => a + c.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  return (
    <div className="page-enter">
      <SectionHeader title="Marketing & Advertisement" btn="New Campaign" onBtn={() => setShowForm(true)} />

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Create New Campaign</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Campaign Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                placeholder="e.g. Diwali Sale"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Budget (PKR)</label>
              <input
                value={form.budget}
                onChange={e => setForm({ ...form, budget: e.target.value })}
                type="number"
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Start</label>
              <input
                value={form.start}
                onChange={e => setForm({ ...form, start: e.target.value })}
                type="date"
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>End</label>
              <input
                value={form.end}
                onChange={e => setForm({ ...form, end: e.target.value })}
                type="date"
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={addCampaign} style={{ flex: 1, padding: '9px 12px', background: C.gold, border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              Create
            </button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon="📣" label="Active Campaigns" value={campaigns.filter(c => c.status === 'active').length}   color={C.success} />
        <StatCard icon="💰" label="Total Budget"     value={`PKR ${(totalBudget    / 1000).toFixed(0)}K`} color={C.gold}    />
        <StatCard icon="💸" label="Total Spent"      value={`PKR ${(totalSpent     / 1000).toFixed(0)}K`} color={C.warn}    />
        <StatCard icon="🏦" label="Remaining"        value={`PKR ${(totalRemaining / 1000).toFixed(0)}K`} color={C.info}    />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {campaigns.map(c => (
          <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{c.name}</span>
                  <Badge s={c.status} />
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{c.start} → {c.end}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: C.muted }}>Sales Increase</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>{c.roi}</div>
              </div>
            </div>

            {/* Budget breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                ['Budget',    c.budget,          C.text],
                ['Spent',     c.spent,            c.spent > c.budget * 0.9 ? C.danger : C.warn],
                ['Remaining', c.budget - c.spent, C.success],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: '#F6F3EC', borderRadius: 8, padding: '9px 11px' }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>PKR {val.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {c.status !== 'planned' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 3 }}>
                  <span>Budget used</span>
                  <span>{Math.round((c.spent / c.budget) * 100)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#E6DECE', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (c.spent / c.budget) * 100)}%`,
                    height: '100%',
                    background: c.spent > c.budget * 0.9 ? C.danger : C.gold,
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
