import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, UserPlus, Filter, X } from 'lucide-react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { userApi } from '../api/userApi';
import { EnterpriseModal, Typography, Button } from '../components/ui';

const ALL_ROLES = ['admin', 'shopkeeper', 'salesman', 'supplier'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={ {
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        padding: '12px 18px',
        borderRadius: 10,
        background: type === 'success' ? C.success : C.danger,
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        maxWidth: 360,
      }}
    >
      {message}
      <button
        type="button"
        onClick={onClose}
        style={ {
          marginLeft: 12,
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'shopkeeper' });
  const [inviting, setInviting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [viewActivityUser, setViewActivityUser] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await userApi.getUsers();
      setUsers(list);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter(u => roleFilter === 'all' || u.role === roleFilter);
  }, [users, roleFilter]);

  const handleInvite = async () => {
    const { name, email, password, role } = inviteForm;
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('Name, email, and password are required', 'error');
      return;
    }

    setInviting(true);
    try {
      const res = await userApi.createUser({ name: name.trim(), email: email.trim(), password: password.trim(), role });
      setUsers(prev => [res.data, ...prev]);
      setShowInvite(false);
      setInviteForm({ name: '', email: '', password: '', role: 'shopkeeper' });
      showToast(res.message || 'User created successfully');
    } catch (e) {
      showToast(e.message || 'Failed to invite user', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    if (user.role === newRole || user.isSuperAdmin) return;
    setActionId(user.id);
    try {
      const res = await userApi.updateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => (u.id === user.id ? res.data : u)));
      showToast(`Role updated to ${newRole}`);
    } catch (e) {
      showToast(e.message || 'Failed to update role', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async user => {
    if (user.isSuperAdmin) {
      showToast('Super admin cannot be deleted', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Permanently delete ${user.name}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setActionId(user.id);
    try {
      const res = await userApi.disableUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(res.message || 'User permanently deleted');
    } catch (e) {
      showToast(e.message || 'Failed to delete user', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleResetPassword = async user => {
    setActionId(`reset-${user.id}`);
    try {
      const res = await userApi.resetUserPassword(user.id);
      showToast(res.message || 'Password reset email sent');
    } catch (e) {
      showToast(e.message || 'Failed to send reset email', 'error');
    } finally {
      setActionId(null);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    background: C.bg,
    color: C.text,
    fontSize: 13,
    boxSizing: 'border-box',
  };

  const columns = useMemo(() => [
    { header: 'Name', accessorKey: 'name', sortable: true, cell: (u) => (
      <span style={ { fontWeight: 600 }}>
        {u.name}
        {u.isSuperAdmin && <span style={ { marginLeft: 6, fontSize: 10, color: C.gold }}>SUPER ADMIN</span>}
      </span>
    )},
    { header: 'Email', accessorKey: 'email', sortable: true },
    { header: 'Role', accessorKey: 'role', sortable: true, cell: (u) => {
      const isActive = u.active !== false && u.status === 'active';
      const busy = actionId === u.id || actionId === `reset-${u.id}`;
      return u.isSuperAdmin ? (
        <Badge s="admin" />
      ) : (
        <select
          value={u.role}
          disabled={busy || !isActive}
          onChange={e => handleRoleChange(u, e.target.value)}
          style={ {
            ...inputStyle,
            padding: '4px 8px',
            fontSize: 12,
            minWidth: 120,
          }}
        >
          {ALL_ROLES.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )
    }},
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (u) => <Badge s={u.active === false ? 'suspended' : (u.isOnline ? 'online' : 'offline')} /> },
    { header: 'Joined', accessorKey: 'joinedDate', sortable: true, cell: (u) => formatDate(u.joinedDate || u.createdAt) },
    { header: 'Last login', accessorKey: 'lastLogin', sortable: true, cell: (u) => formatDate(u.lastLogin) },
    { header: 'Actions', cell: (u) => {
      const isActive = u.active !== false && u.status === 'active';
      const busy = actionId === u.id || actionId === `reset-${u.id}`;
      const btnBase = {
        fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '5px 10px',
        background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center',
      };
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button type="button" disabled={busy || !isActive} onClick={() => handleResetPassword(u)}
            style={{ ...btnBase, border: `1px solid ${C.gold}`, color: C.gold, cursor: busy || !isActive ? 'not-allowed' : 'pointer' }}>
            Reset
          </button>
          <button type="button" onClick={() => setSelectedUser(u)}
            style={{ ...btnBase, border: `1px solid ${C.border}`, color: C.text }}>
            Details
          </button>
          {!u.isSuperAdmin && isActive && (
            <button type="button" disabled={busy} onClick={() => handleDelete(u)}
              style={{ ...btnBase, border: `1px solid ${C.danger}`, color: C.danger, cursor: busy ? 'not-allowed' : 'pointer' }}>
              Delete
            </button>
          )}
          <button type="button" onClick={() => setViewActivityUser(u)}
            style={{ ...btnBase, border: `1px solid ${C.border}`, color: C.text }}>
            Activity
          </button>
        </div>
      );
    }}
  ], [actionId]);

  if (loading && !users.length) {
    return <PageLoader label="Loading users..." />;
  }

  return (
    <div className="page-enter" style={ { display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SectionHeader
        title="User Management"
        btn="Create User"
        onBtn={() => {
          setShowInvite(true);
          setError(null);
        }}
      />

      <p style={ { fontSize: 12, color: C.muted, marginBottom: 14 }}>
        Manage Prime Oil staff and control system access.
      </p>

      <ApiError error={error} />

      <div style={ { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div>
          <label style={ { display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
            Filter by role
          </label>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={ { ...inputStyle, minWidth: 160, cursor: 'pointer' }}
          >
            <option value="all">All roles</option>
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showInvite && (
        <div
          style={ {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            padding: 20,
          }}
          onClick={() => !inviting && setShowInvite(false)}
        >
          <div
            style={ {
              background: C.card,
              borderRadius: 14,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              border: `1px solid ${C.goldBorder}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={ { fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Create User
            </div>
            <div style={ { display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={ { fontSize: 11, fontWeight: 600, color: C.muted }}>Full name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={ { fontSize: 11, fontWeight: 600, color: C.muted }}>Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={ { fontSize: 11, fontWeight: 600, color: C.muted }}>Password</label>
                <input
                  type="password"
                  value={inviteForm.password}
                  onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                  style={inputStyle}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label style={ { fontSize: 11, fontWeight: 600, color: C.muted }}>Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  style={inputStyle}
                >
                  {ALL_ROLES.map(r => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p style={ { fontSize: 12, color: C.muted, marginTop: 12 }}>
              The user can log in immediately with the password provided.
            </p>
            <div style={ { display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting}
                style={ {
                  flex: 1,
                  padding: '10px',
                  background: inviting ? C.muted : C.gold,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: inviting ? 'not-allowed' : 'pointer',
                }}
              >
                {inviting ? 'Creating user…' : 'Create user'}
              </button>
              <button
                type="button"
                disabled={inviting}
                onClick={() => setShowInvite(false)}
                style={ {
                  padding: '10px 16px',
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.muted,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewActivityUser && (
        <div
          style={ {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20,
          }}
          onClick={() => setViewActivityUser(null)}
        >
          <div
            style={ {
              background: C.card, borderRadius: 14, padding: 24, width: '100%', maxWidth: 500,
              border: `1px solid ${C.border}`, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={ { fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Login Activity for {viewActivityUser.name}
            </div>
            <div style={ { overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {viewActivityUser.loginHistory?.length > 0 ? (
                <div style={ { display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {viewActivityUser.loginHistory.slice().reverse().map((log, i) => (
                    <div key={i} style={ { padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg }}>
                      <div style={ { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={ { fontSize: 13, fontWeight: 600, color: C.text }}>{new Date(log.time).toLocaleString()}</span>
                        <Badge s={log.status || 'success'} />
                      </div>
                      <div style={ { fontSize: 11, color: C.muted }}>IP: {log.ip || 'Unknown'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={ { padding: 20, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                  No recent login activity found.
                </div>
              )}
            </div>
            <div style={ { marginTop: 20, textAlign: 'right' }}>
              <button 
                onClick={() => setViewActivityUser(null)} 
                style={ { 
                  padding: '10px 24px', 
                  background: C.gold, 
                  border: 'none', 
                  borderRadius: 8, 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 12px rgba(212, 136, 10, 0.2)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20,
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              background: C.card, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420,
              border: `1px solid ${C.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 18 }}>
              User Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Name', selectedUser.name],
                ['Email', selectedUser.email],
                ['Role', selectedUser.role],
                ['Status', selectedUser.active !== false ? 'Active' : 'Inactive'],
                ['Joined', selectedUser.joinedDate || selectedUser.createdAt ? new Date(selectedUser.joinedDate || selectedUser.createdAt).toLocaleDateString() : '—'],
                ['Last Login', selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  padding: '10px 24px', background: C.gold, border: 'none', borderRadius: 8,
                  color: '#fff', cursor: 'pointer', fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(212, 136, 10, 0.2)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={ { flex: 1, minHeight: 400 }}>
        <DataGrid 
          columns={columns}
          data={filtered}
          selectable={false}
          emptyMessage={users.length ? 'No users match your search or filter.' : 'No users yet. Invite someone to get started.'}
          rowHeight={84}
        />
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  );
}
