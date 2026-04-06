import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import { THead, TRow, TCell } from '../components/Table';
import { auth, db } from '../Firebase/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuthErrorMessage, validateEmail } from '../Firebase/authUtils';

export default function UserManagement({ users = [], setUsers }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'shopkeeper', status: 'active' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const addUser = async () => {
    const { name, email, password, role, status } = form;

    if (!name || !email || !password) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (!validateEmail(email)) {
      setMessage('Invalid email format');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role,
        status,
        createdAt: new Date(),
      });

      // Update local state
      setUsers?.(prev => {
        const safePrev = prev || [];
        const nextId = Math.max(0, ...safePrev.map(u => u.id || 0)) + 1;
        return [
          ...safePrev,
          { id: nextId, name, email, role, status, firebaseId: user.uid },
        ];
      });

      setForm({ name: '', email: '', password: '', role: 'shopkeeper', status: 'active' });
      setShowForm(false);
      setMessage(`✓ User ${name} created successfully!`);
      setMessageType('success');

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(getAuthErrorMessage(err.code));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus, email) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      // Update in local state first
      setUsers?.(prev => (prev || []).map(u =>
        u.id === id ? { ...u, status: newStatus } : u
      ));

      // Update in Firestore if user has firebaseId
      const user = users.find(u => u.id === id);
      if (user?.firebaseId) {
        await updateDoc(doc(db, 'users', user.firebaseId), { status: newStatus });
      }

      setMessage(`✓ User status updated to ${newStatus}`);
      setMessageType('success');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Error updating user status');
      setMessageType('error');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    background: C.bg,
    color: C.text,
    outline: 'none',
    fontSize: '13px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 10,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
    fontWeight: 600,
  };

  return (
    <div className="page-enter">
      <SectionHeader title="User Management" btn="Add User" onBtn={() => {
        setShowForm(true);
        setMessage('');
      }} />

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: messageType === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: messageType === 'success' ? '#10B981' : '#EF4444',
          border: `1px solid ${messageType === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          marginBottom: 16,
          fontSize: 13,
        }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Add New User</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={inputStyle}
              >
                <option value="admin">Admin</option>
                <option value="shopkeeper">Shopkeeper</option>
                <option value="salesman">Salesman</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={inputStyle}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={addUser}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: loading ? '#999' : C.gold,
                border: 'none',
                borderRadius: 10,
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setForm({ name: '', email: '', password: '', role: 'shopkeeper', status: 'active' });
                setMessage('');
              }}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.muted,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        {users && users.length > 0 ? (
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
                      onClick={() => toggleStatus(u.id, u.status, u.email)}
                      style={{
                        padding: '4px 11px',
                        background: u.status === 'active' ? '#FEF2F2' : '#F0FDF4',
                        border: 'none',
                        borderRadius: 6,
                        color: u.status === 'active' ? C.danger : C.success,
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </TRow>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: C.muted }}>
            No users found. Click "Add User" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
