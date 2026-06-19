import React, { useState, useMemo } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { analyticsApi } from '../api/analyticsApi';
import Badge from '../components/Badge';
import { SkeletonTable } from '../components/common/Skeleton';
import { THead, TRow, TCell } from '../components/Table';
import FormInput from '../components/common/FormInput';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';

const CATEGORIES = ['Fuel', 'Salary', 'Maintenance', 'Rent', 'Utilities', 'Other'];

export default function Expenses({ role }) {
  const { data: expenses, setData: setExpenses, loading } = useFetch(() => analyticsApi.getExpenses(), []);
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null });
  
  const [form, setForm] = useState({ amount: '', category: 'Fuel', description: '', date: new Date().toISOString().split('T')[0] });

  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0), [expenses]);

  const openCreate = () => {
    setEditing(null);
    setForm({ amount: '', category: 'Fuel', description: '', date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        date: new Date(exp.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return toast.error('Enter a valid amount');
    if (!form.description) return toast.error('Enter a description');

    setSaving(true);
    try {
      if (editing) {
          const updated = await analyticsApi.updateExpense(editing._id, {
              ...form, amount: Number(form.amount)
          });
          setExpenses(prev => prev.map(e => e._id === updated._id ? updated : e));
          toast.success('Expense updated');
      } else {
          const created = await analyticsApi.createExpense({
            ...form, amount: Number(form.amount)
          });
          setExpenses(prev => [created, ...prev]);
          toast.success('Expense logged');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmState({ isOpen: true, id });
  };

  const executeDelete = async () => {
      const { id } = confirmState;
      if(!id) return;
      try {
          await analyticsApi.deleteExpense(id);
          setExpenses(prev => prev.filter(e => e._id !== id));
          toast.success('Expense deleted');
      } catch (err) {
          toast.error('Failed to delete expense');
      }
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Expenses & General Ledger" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <SectionHeader title="Expenses & General Ledger" action={role === 'admin' ? "Log Expense" : null} onAction={openCreate} />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: C.card, padding: '20px', borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Outflows (All Time)</div>
          <div style={{ fontSize: 28, color: C.danger, fontWeight: 700 }}>PKR {totalExpenses.toLocaleString()}</div>
        </div>
      </div>

      <div className="table-responsive-container" style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <THead cols={['Date', 'Category', 'Description', 'Amount', 'Logged By', 'Actions']} />
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 0 }}><EmptyState title="No Expenses" message="There are no expenses recorded." icon="💸" /></td></tr>
            ) : expenses.map(exp => (
              <TRow key={exp._id}>
                <TCell>{new Date(exp.date).toLocaleDateString()}</TCell>
                <TCell><Badge s={exp.category.toLowerCase()} label={exp.category} /></TCell>
                <TCell>{exp.description}</TCell>
                <TCell bold color={C.danger}>PKR {exp.amount.toLocaleString()}</TCell>
                <TCell>{exp.loggedBy?.name || 'System'}</TCell>
                <TCell>
                  {role === 'admin' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(exp)} style={{ padding: '6px 12px', background: `${C.primary}11`, color: C.primary, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Edit
                        </button>
                        <button onClick={() => handleDeleteClick(exp._id)} style={{ padding: '6px 12px', background: `${C.danger}11`, color: C.danger, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Delete
                        </button>
                    </div>
                  )}
                </TCell>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>{editing ? 'Edit Expense' : 'Log New Expense'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                        <FormInput id="amount" label="Amount (PKR)" type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Category</label>
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <FormInput id="description" label="Description" type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                
                <FormInput id="date" label="Date" type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setConfirmState({ isOpen: false, id: null })}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
