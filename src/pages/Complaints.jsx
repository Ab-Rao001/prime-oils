import React, { useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import { useFetch } from '../hooks/useFetch';
import { userApi } from '../api/userApi';
import { inventoryApi } from '../api/inventoryApi';
import { useComplaints } from '../queries/useComplaints';
import { useConvertComplaintToReturn } from '../mutations/useReturnMutations';
import ConvertComplaintModal from '../components/returns/ConvertComplaintModal';
import { Badge, Typography, Button, Input, Select } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const complaintSchema = z.object({
  product: z.string().optional().nullable(),
  targetUser: z.string().optional().nullable(),
  type: z.enum(['damaged', 'order', 'exchange', 'quality', 'delivery', 'behaviour']),
  issue: z.string().min(1, 'Issue description is required'),
});

const STATUS_LABEL = {
  pending: 'Pending',
  in_review: 'In Review',
  processing: 'In Review',
  resolved: 'Resolved',
  converted_to_return: 'Converted to Return',
  escalated: 'Escalated',
  closed_no_action: 'Closed',
};

export default function Complaints({ role, user }) {
  const { data: cmps = [], isPending, error, refetch } = useComplaints();
  const { data: products } = useFetch(() => inventoryApi.getProducts(), []);
  const [showForm, setShowForm] = useState(false);
  const [convertTarget, setConvertTarget] = useState(null);
  const { mutate: convertToReturn, isPending: converting } = useConvertComplaintToReturn();

  const { data: usersData } = useFetch(() => userApi.getUsers(), []);
  const staff = (usersData?.data || []).filter(u => ['salesman', 'supplier'].includes(u.role));

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm({
    resolver: zodResolver(complaintSchema),
    defaultValues: { product: '', targetUser: '', type: 'damaged', issue: '' },
  });

  const selectedType = watch('type');

  const visible = useMemo(() => {
    if (role === 'shopkeeper' && user?.name) return cmps.filter(c => c.shop === user.name);
    return cmps;
  }, [cmps, role, user]);

  const update = async (id, status) => {
    try {
      await userApi.updateComplaint(id, { status });
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const registerComplaint = async (data) => {
    const d = new Date();
    const date = d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).split(',')[0];

    try {
      await userApi.createComplaint({
        shop: user?.name || 'Unknown Shop',
        product: data.type === 'behaviour' ? null : data.product,
        targetUser: data.type === 'behaviour' ? data.targetUser : null,
        issue: data.issue,
        type: data.type,
        status: 'pending',
        date,
      });
      reset({ product: '', targetUser: '', type: 'damaged', issue: '' });
      setShowForm(false);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvert = (body) => {
    convertToReturn(body, { onSuccess: () => setConvertTarget(null) });
  };

  if (isPending) return <PageLoader label="Loading complaints..." />;

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <SectionHeader
        title="Complaint Management"
        btn={role === 'admin' ? null : 'Register Complaint'}
        onBtn={() => setShowForm(true)}
      />

      {showForm && role !== 'admin' && (
        <div className="relative mb-5 animate-fadeIn">
          <div className="bg-card border border-gold/30 rounded-xl p-5 mt-2">
            <Typography variant="body" weight="bold" className="text-foreground mb-4 block">New Complaint</Typography>

            <form onSubmit={handleSubmit(registerComplaint)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedType === 'behaviour' ? (
                <Select label="Against (Salesman/Supplier)" {...register('targetUser')} error={errors.targetUser}>
                  <option value="">Select person...</option>
                  {staff.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </Select>
              ) : (
                <Select label="Product" {...register('product')} error={errors.product}>
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </Select>
              )}
              <Select label="Type" {...register('type')} error={errors.type}>
                {['damaged', 'order', 'exchange', 'quality', 'delivery', 'behaviour'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
              <div className="md:col-span-2">
                <Input label="Issue" placeholder="Describe the issue..." {...register('issue')} error={errors.issue} />
              </div>
              <div className="flex gap-3 mt-2 md:col-span-2">
                <Button type="submit" isLoading={isSubmitting} className="flex-1">Submit</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting} className="flex-1">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pending', key: 'pending', colorClass: 'text-warn' },
          { label: 'In Review', key: 'in_review', colorClass: 'text-info' },
          { label: 'Resolved', key: 'resolved', colorClass: 'text-success' },
          { label: 'Total', key: null, colorClass: 'text-gold' },
        ].map(({ label, colorClass, key }) => (
          <div key={label} className="bg-card border border-border dark:border-border-dark rounded-xl p-3 text-center">
            <Typography variant="h2" size="2xl" className={`font-bold ${colorClass}`}>
              {key
                ? visible.filter(c => c.status === key || (key === 'in_review' && c.status === 'processing')).length
                : visible.length}
            </Typography>
            <Typography variant="caption" className="text-muted-foreground mt-1 block">{label}</Typography>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map(c => (
          <div key={c.id} className="bg-card border border-border dark:border-border-dark rounded-xl py-3.5 px-4.5">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Typography variant="body" weight="bold" className="text-foreground text-[13px]">{c.id || 'CMP-###'}</Typography>
                  <Badge variant="default">{c.type || 'unknown'}</Badge>
                  <Badge variant={
                    c.status === 'resolved' ? 'success'
                      : ['processing', 'in_review'].includes(c.status) ? 'info'
                        : c.status === 'converted_to_return' ? 'success'
                          : 'warning'
                  }>
                    {STATUS_LABEL[c.status] || c.status}
                  </Badge>
                  {c.returnRequestId && (
                    <Badge variant="info">RMA linked</Badge>
                  )}
                </div>
                {c.shop && (
                  <Typography variant="body" className="text-muted-foreground text-[13px] mb-0.5 block">
                    Shop: <span className="text-foreground font-medium">{c.shop}</span>
                  </Typography>
                )}
                {c.type === 'behaviour' && c.targetUser ? (
                  <Typography variant="body" className="text-muted-foreground text-[13px] mb-0.5 block">
                    Against: <span className="text-danger font-medium">{c.targetUser.name || c.targetUser}</span>
                  </Typography>
                ) : c.product && (
                  <Typography variant="body" className="text-muted-foreground text-[13px] mb-0.5 block">
                    Product: <span className="text-foreground">{c.product}</span>
                  </Typography>
                )}
                <Typography variant="body" className="text-muted-foreground text-[13px] block">
                  Issue: <span className="text-foreground">{c.issue}</span>
                </Typography>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <Typography variant="caption" className="text-muted-foreground">{c.date}</Typography>
                {role === 'admin' && (
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {c.status === 'pending' && (
                      <Button size="xs" variant="outline" onClick={() => update(c.id, 'in_review')}>
                        Review
                      </Button>
                    )}
                    {['pending', 'in_review', 'processing'].includes(c.status) && !c.returnRequestId && (
                      <Button size="xs" variant="primary" onClick={() => setConvertTarget(c)}>
                        Create Return
                      </Button>
                    )}
                    {!['resolved', 'converted_to_return', 'closed_no_action'].includes(c.status) && (
                      <Button size="xs" variant="outline" className="text-success border-success/30" onClick={() => update(c.id, 'resolved')}>
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
                {role === 'salesman' && !c.returnRequestId && ['in_review', 'processing', 'pending'].includes(c.status) && (
                  <Button size="xs" variant="primary" onClick={() => setConvertTarget(c)}>
                    Create Return
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConvertComplaintModal
        isOpen={!!convertTarget}
        onClose={() => setConvertTarget(null)}
        complaint={convertTarget}
        onSubmit={handleConvert}
        isLoading={converting}
      />
    </div>
  );
}
