import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { THead, TRow, TCell } from '../components/Table';

export default function UserManagement({ users = [], setUsers }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'shopkeeper', status: 'active' });

  const addUser = () => {
    if (!form.name || !form.email) return;
    setUsers?.(prev => {
      const safePrev = prev || [];
      const nextId = Math.max(0, ...safePrev.map(u => u.id)) + 1;
      return [
        ...safePrev,
        { id: nextId, name: form.name, email: form.email, role: form.role, status: form.status },
      ];
    });
    setForm({ name: '', email: '', role: 'shopkeeper', status: 'active' });
    setShowForm(false);
  };

  const toggleStatus = id =>
    setUsers?.(prev => (prev || []).map(u =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
    ));

  return (
    <div className="page-enter">
      <SectionHeader title="User Management" btn="Add User" onBtn={() => setShowForm(true)} />

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Add User</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}>
                {['admin','shopkeeper','salesman','supplier'].map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}>
                {['active','inactive'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={addUser} style={{ flex: 1, padding: '9px 12px', background: C.gold, border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              Add
            </button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['ID', 'Name', 'Email', 'Role', 'Status', 'Action']} />
          <tbody>
            {users.map(u => (
              <TRow key={u.id}>
                <TCell>{u.id}</TCell>
                <TCell bold>{u.name}</TCell>
                <TCell>{u.email}</TCell>
                <TCell><Badge s={u.role} /></TCell>
                <TCell><Badge s={u.status} /></TCell>
                <td style={{ padding: '8px 12px' }}>
                  <button
                    onClick={() => toggleStatus(u.id)}
                    style={{
                      padding: '4px 11px',
                      background: u.status === 'active' ? '#FEF2F2' : '#F0FDF4',
                      border: 'none', borderRadius: 6,
                      color: u.status === 'active' ? C.danger : C.success,
                      fontSize: 11, cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {u.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
