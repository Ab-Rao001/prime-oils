import React, { useState, useEffect, useMemo } from 'react';
import C from '../theme';
import { Badge, Skeleton, EmptyState, ConfirmationDialog, Button, Input, Select, Typography, LocationDisplay } from '../components/ui';
import { Users } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { useFetch } from '../hooks/useFetch';
import { useVirtualScroll } from '../hooks/useVirtual';
import { useDebounce } from '../hooks/useDebounce';
import { ApiError } from '../components/ApiMessage';
import { userApi } from '../api/userApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const shopkeeperSchema = z.object({
  name: z.string().min(1, 'Shop name is required'),
  owner: z.string().min(1, 'Owner name is required'),
  loc: z.string().min(1, 'Location is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

const editShopkeeperSchema = z.object({
  owner: z.string().min(1, 'Owner name is required'),
  loc: z.string().min(1, 'Location is required'),
  phone: z.string().min(1, 'Phone number is required'),
  status: z.enum(['active', 'inactive'])
});

export default function Shopkeepers({ role }) {
  const { data: shops, setData: setShops, loading, error } = useFetch(() => userApi.getShopkeepers(), []);
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { register: registerAdd, handleSubmit: handleAddSubmit, formState: { errors: addErrors, isSubmitting: isAdding }, reset: resetAdd, setValue: setAddValue } = useForm({
    resolver: zodResolver(shopkeeperSchema),
    defaultValues: { name: '', owner: '', loc: '', phone: '' }
  });

  const { register: registerEdit, handleSubmit: handleEditSubmit, formState: { errors: editErrors, isSubmitting: isEditing }, reset: resetEdit, setValue: setEditValue } = useForm({
    resolver: zodResolver(editShopkeeperSchema)
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filtered = useMemo(() => {
    return shops.filter(s =>
      s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.owner.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.loc.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [shops, debouncedSearch]);

  const colsCount = isMobile ? 1 : (window.innerWidth <= 1024 ? 2 : 3);
  const chunkedShops = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < filtered.length; i += colsCount) {
      chunks.push(filtered.slice(i, i + colsCount));
    }
    return chunks;
  }, [filtered, colsCount]);

  const rowHeight = 366; 
  const viewportHeight = 600;
  
  const { visibleItems, totalHeight, startOffset, onScroll } = useVirtualScroll({
    items: chunkedShops,
    rowHeight,
    viewportHeight
  });

  const bottomPadding = Math.max(0, totalHeight - startOffset - (visibleItems.length * rowHeight));

  const extractLatLng = (locString) => {
    if (locString.includes(',')) {
      const parts = locString.split(',');
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
    }
    return null;
  };

  const onAdd = async (data) => {
    try {
      const coords = extractLatLng(data.loc);
      const payload = { ...data, status: 'active', credit: 0, total: 0, ...(coords || {}) };
      const created = await userApi.createShopkeeper(payload);
      setShops(prev => [...prev, created]);
      resetAdd();
      setShowForm(false);
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = s => {
    setEditId(s._id || s.id);
    resetEdit({
      owner: s.owner,
      loc: s.loc,
      phone: s.phone,
      status: s.status,
    });
  };

  const onEdit = async (data) => {
    try {
      const coords = extractLatLng(data.loc);
      const payload = { ...data, ...(coords || {}) };
      const updated = await userApi.updateShopkeeper(editId, payload);
      setShops(prev => prev.map(s => (s.id === editId || s._id === editId ? updated : s)));
    } catch {
      setShops(prev => prev.map(s =>
        s.id === editId || s._id === editId
          ? { ...s, ...data }
          : s
      ));
    }
    setEditId(null);
  };

  const getLocation = (setValueFn) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setValueFn('loc', `${pos.coords.latitude},${pos.coords.longitude}`, { shouldValidate: true });
      }, () => alert('Unable to retrieve your location'));
    }
  };

  if (loading) {
    return (
      <div className="page-enter flex flex-col gap-5">
        <SectionHeader title="Shopkeeper Management" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <SectionHeader title="Shopkeeper Management" btn="Add Shopkeeper" onBtn={() => setShowForm(!showForm)} />
      
      <div className="mb-4">
        <Input 
          placeholder="Search name, owner, location..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="max-w-md"
        />
      </div>

      {showForm && (
        <div className="card-premium mb-5">
          <Typography variant="heading" size="lg" className="mb-4">Register New Shopkeeper</Typography>
          <form onSubmit={handleAddSubmit(onAdd)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Shop Name" required {...registerAdd('name')} error={addErrors.name} />
              <Input label="Owner Name" required {...registerAdd('owner')} error={addErrors.owner} />
              <div className="flex flex-col">
                <Input label="Location" required {...registerAdd('loc')} error={addErrors.loc} />
                <button type="button" onClick={() => getLocation(setAddValue)} className="text-gold text-xs font-semibold text-left mt-1 hover:underline">
                  📍 Use My Current Location
                </button>
              </div>
              <Input label="Phone Number" required {...registerAdd('phone')} error={addErrors.phone} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" isLoading={isAdding}>Add Shopkeeper</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {editId && (
        <div className="card-premium mb-5 border-gold">
          <div className="flex justify-between items-center mb-4">
            <Typography variant="heading" size="lg">Edit Shopkeeper Credentials</Typography>
            <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
          <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Owner Name" required {...registerEdit('owner')} error={editErrors.owner} />
              <div className="flex flex-col">
                <Input label="Location" required {...registerEdit('loc')} error={editErrors.loc} />
                <button type="button" onClick={() => getLocation(setEditValue)} className="text-gold text-xs font-semibold text-left mt-1 hover:underline">
                  📍 Use My Current Location
                </button>
              </div>
              <Input label="Phone Number" required {...registerEdit('phone')} error={editErrors.phone} />
              <Select label="Status" {...registerEdit('status')} error={editErrors.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" isLoading={isEditing}>Save Changes</Button>
            </div>
          </form>
        </div>
      )}

      <div onScroll={onScroll} style={ { maxHeight: `${viewportHeight}px` } } className="overflow-y-auto p-1 flex flex-col">
        <div style={ { height: `${totalHeight}px`, position: 'relative' } }>
          {startOffset > 0 && <div style={ { height: `${startOffset}px` } } />}
          
          <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <EmptyState title="No shopkeepers found" description="Adjust your search criteria." icon={<Users size={36} />} />
            ) : (
              visibleItems.map((rowItems, rowIndex) => (
                <div key={rowIndex} style={ { display: 'grid', gridTemplateColumns: `repeat(${colsCount}, 1fr)`, gap: '14px', height: '350px' } }>
                  {rowItems.map(s => (
                    <div key={s._id || s.id} className="card-premium flex flex-col justify-between h-full animate-slideUp">
                      <div className="flex justify-between items-start">
                        <div>
                          <Typography variant="h4" size="md" weight="bold">{s.name}</Typography>
                          <Typography variant="caption">{s.owner}</Typography>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status}</Badge>
                          <div className="flex items-center gap-2">
                            {['admin', 'shopkeeper', 'salesman'].includes(role) && (
                              <Button size="xs" variant="outline" onClick={() => startEdit(s)}>Edit</Button>
                            )}
                            {role === 'admin' && (
                              <Button size="xs" variant="danger" onClick={async () => {
                                  if(window.confirm('Are you sure you want to delete this shop?')) {
                                    await userApi.deleteShopkeeper(s._id || s.id);
                                    setShops(prev => prev.filter(x => (x._id || x.id) !== (s._id || s.id)));
                                  }
                                }}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 my-2">
                        <Typography variant="caption" className="flex items-center gap-1 truncate">
                          <span>📍</span> <LocationDisplay loc={s.loc} truncate={true} />
                        </Typography>
                        <Typography variant="caption">📞 {s.phone}</Typography>
                      </div>

                      {s.loc && (
                        <div className="my-2 rounded-lg overflow-hidden h-20 border border-border dark:border-border-dark">
                          <iframe
                            title={`Map for ${s.name}`}
                            width="100%"
                            height="100%"
                            style={ { border: 0 } }
                            loading="lazy"
                            allowFullScreen
                            src={`https://www.google.com/maps?q=${encodeURIComponent(s.loc)}&output=embed`}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-border dark:border-border-dark">
                        <div className="text-center">
                          <Typography size="sm" weight="bold" className={s.credit > 0 ? "text-danger" : "text-success"}>
                            PKR {s.credit.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" size="xs">Outstanding</Typography>
                        </div>
                        <div className="text-center">
                          <Typography size="sm" weight="bold" className="text-gold">
                            PKR {(s.total / 1000).toFixed(0)}K
                          </Typography>
                          <Typography variant="caption" size="xs">Total Purchases</Typography>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {rowItems.length < colsCount && Array.from({ length: colsCount - rowItems.length }).map((_, emptyIdx) => (
                    <div key={`empty-${emptyIdx}`} className="invisible" />
                  ))}
                </div>
              ))
            )}
          </div>
          {bottomPadding > 0 && <div style={ { height: `${bottomPadding}px` } } />}
        </div>
      </div>
    </div>
  );
}
