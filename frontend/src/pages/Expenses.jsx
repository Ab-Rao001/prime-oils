import React, { useState, useMemo } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { analyticsApi } from '../api/analyticsApi';
import { Badge, ConfirmationDialog, EmptyState, Button, Input, Select, EnterpriseModal, Typography } from '../components/ui';
import { SkeletonTable } from '../components/common/Skeleton';
import DataGrid from '../components/DataGrid';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const CATEGORIES = ['Fuel', 'Salary', 'Maintenance', 'Rent', 'Utilities', 'Other'];

const expenseSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required")
});

export default function Expenses({ role }) {
  const { data: expenses, setData: setExpenses, loading } = useFetch(() => analyticsApi.getExpenses(), []);
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, id: null });
  
  const { register, handleSubmit, formState: { errors, isSubmitting: saving }, reset } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: '', category: 'Fuel', description: '', date: new Date().toISOString().split('T')[0] }
  });

  const totalExpenses = useMemo(() => expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0), [expenses]);

  const openCreate = () => {
    setEditing(null);
    reset({ amount: '', category: 'Fuel', description: '', date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    reset({
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        date: new Date(exp.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const onSave = async (data) => {
    try {
      if (editing) {
          const updated = await analyticsApi.updateExpense(editing._id, data);
          setExpenses(prev => prev.map(e => e._id === updated._id ? updated : e));
          toast.success('Expense updated');
      } else {
          const created = await analyticsApi.createExpense(data);
          setExpenses(prev => [created, ...prev]);
          toast.success('Expense logged');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save expense');
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
      } finally {
          setConfirmState({ isOpen: false, id: null });
      }
  };

  const columns = useMemo(() => [
    { header: 'Date', accessorKey: 'date', sortable: true, cell: (exp) => new Date(exp.date).toLocaleDateString() },
    { header: 'Category', accessorKey: 'category', sortable: true, cell: (exp) => <Badge variant="default">{exp.category}</Badge> },
    { header: 'Description', accessorKey: 'description', sortable: true },
    { header: 'Amount', accessorKey: 'amount', sortable: true, cell: (exp) => <span className="font-semibold text-danger">PKR {exp.amount.toLocaleString()}</span> },
    { header: 'Logged By', accessorKey: 'loggedBy', cell: (exp) => exp.loggedBy?.name || 'System' },
    { header: 'Actions', cell: (exp) => {
      if (role === 'admin') {
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(exp)}>Edit</Button>
            <Button size="sm" variant="danger" onClick={() => handleDeleteClick(exp._id)}>Delete</Button>
          </div>
        );
      }
      return null;
    }}
  ], [role]);

  if (loading) {
    return (
      <div className="page-enter flex flex-col gap-5">
        <SectionHeader title="Expenses & General Ledger" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-full">
      <SectionHeader title="Expenses & General Ledger" action={role === 'admin' ? "Log Expense" : null} onAction={openCreate} />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card-premium">
          <Typography variant="caption" className="block mb-2 font-semibold">Total Outflows (All Time)</Typography>
          <Typography variant="h2" size="3xl" className="text-danger font-bold">PKR {totalExpenses.toLocaleString()}</Typography>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataGrid 
          columns={columns}
          data={expenses}
          emptyMessage="There are no expenses recorded."
          selectable={false}
          rowHeight={64}
        />
      </div>

      <EnterpriseModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editing ? 'Edit Expense' : 'Log New Expense'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Amount (PKR)" type="number" required {...register('amount', { valueAsNumber: true })} error={errors.amount} />
            <Select label="Category" required {...register('category')} error={errors.category}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Input label="Description" required {...register('description')} error={errors.description} />
          <Input label="Date" type="date" required {...register('date')} error={errors.date} />
          
          <div className="flex gap-3 pt-4 border-t border-border dark:border-border-dark mt-6">
            <Button type="submit" isLoading={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </EnterpriseModal>

      <ConfirmationDialog 
        isOpen={confirmState.isOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
        onConfirm={executeDelete}
        onClose={() => setConfirmState({ isOpen: false, id: null })}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
