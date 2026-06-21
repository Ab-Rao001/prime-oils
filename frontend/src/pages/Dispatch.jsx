import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { dispatchApi } from '../api/dispatchApi';
import { userApi } from '../api/userApi';
import { useOrders } from '../queries/useOrders';
import { SkeletonTable } from '../components/common/Skeleton';
import DataGrid from '../components/DataGrid';
import { ConfirmationDialog, EnterpriseModal, Typography, Button, Input, Select, Badge, LocationDisplay } from '../components/ui';
import PoDModal from '../components/orders/PoDModal';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const vehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  model: z.string().min(1, 'Model is required'),
  capacity: z.number({ invalid_type_error: "Capacity is required" }).positive("Capacity must be positive")
});

export default function Dispatch({ role, users }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('routes');
  
  const { data: dispatches, setData: setDispatches, loading: loadingD } = useFetch(() => dispatchApi.getDispatches(), []);
  const { data: vehicles, setData: setVehicles, loading: loadingV } = useFetch(() => dispatchApi.getVehicles(), []);
  const { data: orders = [], isPending: loadingO } = useOrders({ status: 'ready_for_dispatch' });
  
  const [showModal, setShowModal] = useState(false);
  const [podDispatch, setPodDispatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, type: null, id: null });
  const [loadInventoryDispatch, setLoadInventoryDispatch] = useState(null);
  
  const [form, setForm] = useState({ vehicle: '', driver: '', orders: [], notes: '' });

  const { register: registerVehicle, handleSubmit: handleVehicleSubmit, formState: { errors: vehicleErrors, isSubmitting: savingVehicle }, reset: resetVehicle } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { plateNumber: '', model: '', capacity: '' }
  });



  const pendingOrders = useMemo(() => {
    const ordersArray = Array.isArray(orders) ? orders : [];
    const activeOrderIds = new Set();
    if (dispatches && Array.isArray(dispatches)) {
      dispatches.forEach(d => {
        if (d.status === 'scheduled' || d.status === 'in-transit') {
           d.orders?.forEach(o => {
             const oid = typeof o === 'object' ? o._id : o;
             if (oid) activeOrderIds.add(oid.toString());
           });
        }
      });
    }
    return ordersArray.filter(o => !activeOrderIds.has(o._id?.toString()));
  }, [orders, dispatches]);

  const handleOrderToggle = (orderId) => {
      setForm(prev => {
          const isSelected = prev.orders.includes(orderId);
          if (isSelected) {
              return { ...prev, orders: prev.orders.filter(id => id !== orderId) };
          } else {
              return { ...prev, orders: [...prev.orders, orderId] };
          }
      });
  };

  const handleCreateRoute = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
          const payload = { ...form };
          delete payload.driver; // No longer needed
          const created = await dispatchApi.createDispatch(payload);
          setDispatches(prev => [created, ...prev]);
          setShowModal(false);
          setForm({ vehicle: '', driver: '', orders: [], notes: '' });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          toast.success('Dispatch route created');
      } catch (err) {
          toast.error(err.message || 'Failed to create route');
      } finally {
          setSaving(false);
      }
  };

  const confirmAction = (type, id) => {
      setConfirmState({ isOpen: true, type, id });
  };

  const executeConfirmAction = async () => {
      const { type, id } = confirmState;
      if (!id) return;
      
      if (type === 'start') {
          try {
              const updated = await dispatchApi.startDispatch(id);
              setDispatches(prev => prev.map(d => d._id === updated._id ? updated : d));
              toast.success('Route started');
              setConfirmState({ isOpen: false, type: '', id: null });
          } catch (err) {
              toast.error('Failed to start');
          }
      }
  };

  const executePoD = async (id, payload) => {
      try {
          const updated = await dispatchApi.completeDispatch(id, payload);
          setDispatches(prev => prev.map(d => d._id === updated._id ? updated : d));
          
          if (payload.outcome === 'DELIVERED' || payload.outcome === 'PARTIAL') {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('PoD submitted. Route completed and orders delivered.');
          } else {
            toast.success('PoD submitted. Delivery failed.');
          }
          setPodDispatch(null);
      } catch (err) {
          throw err;
      }
  };

  const handleAddVehicle = async (data) => {
      try {
          const created = await dispatchApi.createVehicle(data);
          setVehicles(prev => [created, ...prev]);
          resetVehicle();
          toast.success('Vehicle added');
      } catch (err) {
          toast.error('Failed to add vehicle');
      }
  };

  const routeColumns = useMemo(() => [
    { header: 'Dispatch ID', accessorKey: 'dispatchId', sortable: true, cell: (d) => <Typography variant="body" weight="semibold">{d.dispatchId}</Typography> },
    { header: 'Vehicle', accessorKey: 'vehicle', cell: (d) => `${d.vehicle?.plateNumber || ''} (${d.vehicle?.model || ''})` },
    { header: 'Driver', accessorKey: 'driver', cell: (d) => d.driver?.name },
    { header: 'Orders Included', accessorKey: 'orders', cell: (d) => <div className="text-xs font-semibold">{d.orders?.length || 0} Orders</div> },
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (d) => <Badge variant={d.status === 'completed' ? 'success' : d.status === 'in-transit' ? 'info' : 'warning'}>{d.status}</Badge> },
    { header: 'Actions', width: 220, cell: (d) => (
      <div className="flex gap-2 items-center">
        {d.status === 'scheduled' && (
          <Button size="xs" variant="primary" onClick={() => setLoadInventoryDispatch(d)}>
            Load Inventory
          </Button>
        )}
        {d.status === 'in-transit' && (
          <div className="flex gap-2 items-center">
            <Button size="xs" variant="outline" onClick={() => {
              const firstOrderLoc = d.orders?.[0]?.shop?.loc || '';
              window.open(`https://maps.google.com/?q=${encodeURIComponent(firstOrderLoc || 'Pakistan')}`, '_blank');
            }}>
              Map
            </Button>
            <Button size="xs" variant="primary" onClick={() => setPodDispatch(d)}>
              Resolve Route
            </Button>
          </div>
        )}
        {d.status === 'completed' && (
            <div className="text-[11px] text-muted-foreground">Returned: {new Date(d.arrivalTime).toLocaleString()}</div>
        )}
      </div>
    )}
  ], []);

  const fleetColumns = useMemo(() => [
    { header: 'Plate', accessorKey: 'plateNumber', sortable: true, cell: (v) => <Typography variant="body" weight="semibold">{v.plateNumber}</Typography> },
    { header: 'Model', accessorKey: 'model', sortable: true },
    { header: 'Capacity', accessorKey: 'capacity', sortable: true, cell: (v) => `${v.capacity} Units` },
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (v) => <Badge variant={v.status === 'active' ? 'success' : 'danger'}>{v.status}</Badge> }
  ], []);

  if (loadingD || loadingV || loadingO) {
    return (
      <div className="page-enter flex flex-col gap-5">
        <SectionHeader title="Vehicles & Dispatch Routing" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-full">
      <SectionHeader 
          title="Vehicles & Dispatch Routing" 
          action={(role === 'admin' || role === 'supplier') && activeTab === 'routes' ? "Create Route" : null} 
          onAction={() => setShowModal(true)} 
      />

      <div className="flex gap-3 mb-6">
          {['routes', 'vehicles'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-5 rounded-full border cursor-pointer font-semibold capitalize transition-colors duration-200 ${activeTab === tab ? 'border-gold bg-gold/15 text-gold' : 'border-border dark:border-border-dark bg-card text-foreground'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {activeTab === 'routes' && (
        <div className="flex flex-col gap-6 flex-1 min-h-[400px]">
          {pendingOrders.length > 0 && (
            <div className="bg-card border border-border dark:border-border-dark p-4 rounded-xl shadow-sm">
               <div className="flex justify-between items-center mb-3">
                 <Typography variant="h3" className="m-0 text-foreground">Pending Orders to Dispatch</Typography>
                 <Badge variant="warning">{pendingOrders.length} Ready</Badge>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse text-sm text-foreground">
                   <thead>
                     <tr className="border-b border-border dark:border-border-dark">
                       <th className="py-2 px-3 font-semibold text-muted-foreground">ORDER ID</th>
                       <th className="py-2 px-3 font-semibold text-muted-foreground">SHOP</th>
                       <th className="py-2 px-3 font-semibold text-muted-foreground">ITEMS</th>
                       <th className="py-2 px-3 font-semibold text-muted-foreground">DATE</th>
                       <th className="py-2 px-3 font-semibold text-muted-foreground">ACTION</th>
                     </tr>
                   </thead>
                   <tbody>
                     {pendingOrders.map(o => (
                       <tr key={o._id} className="border-b border-border dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                         <td className="py-2 px-3 font-semibold">{o.orderId}</td>
                          <td className="py-2 px-3">{typeof o.shop === 'string' ? o.shop : o.shop?.name || 'Unknown'}</td>
                          <td className="py-2 px-3">{o.items} items</td>
                          <td className="py-2 px-3">{o.date ? new Date(o.date).toLocaleDateString() : 'Unknown Date'}</td>
                         <td className="py-2 px-3">
                           {(role === 'admin' || role === 'supplier') && (
                             <Button size="xs" variant="outline" onClick={() => {
                               setForm(prev => ({ ...prev, orders: [o._id] }));
                               setShowModal(true);
                             }}>Dispatch Now</Button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          <div>
            <Typography variant="h3" className="m-0 mb-3 text-foreground block">Active Routes</Typography>
            <DataGrid 
              columns={routeColumns}
              data={dispatches}
              emptyMessage="No dispatch routes found. Create a route to assign pending orders to a vehicle."
            />
          </div>
        </div>
      )}

      {activeTab === 'vehicles' && (
          <div className="flex gap-6 flex-wrap h-full">
              {(role === 'admin' || role === 'supplier') && (
                <div className="flex-1 min-w-[300px]">
                    <div className="bg-card p-5 rounded-xl border border-border dark:border-border-dark">
                        <Typography variant="h3" className="m-0 mb-4 block text-foreground">Add Vehicle</Typography>
                        <form onSubmit={handleVehicleSubmit(handleAddVehicle)} className="flex flex-col gap-3">
                            <Input placeholder="Plate Number (e.g. LHR-1234)" required {...registerVehicle('plateNumber')} error={vehicleErrors.plateNumber} />
                            <Input placeholder="Model (e.g. Hino Ranger)" required {...registerVehicle('model')} error={vehicleErrors.model} />
                            <Input type="number" placeholder="Capacity (units)" required {...registerVehicle('capacity', { valueAsNumber: true })} error={vehicleErrors.capacity} />
                            <Button type="submit" isLoading={savingVehicle}>Add Vehicle</Button>
                        </form>
                    </div>
                </div>
              )}
              <div className="flex-[2] min-w-[400px] min-h-[400px]">
                  <DataGrid 
                    columns={fleetColumns}
                    data={vehicles}
                    emptyMessage="No vehicles found."
                  />
              </div>
          </div>
      )}

      <EnterpriseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Dispatch Route"
        size="lg"
      >
        <form onSubmit={handleCreateRoute} className="flex flex-col flex-1 overflow-hidden min-h-[500px]">
            <div className="overflow-y-auto flex gap-6 max-md:flex-col">
                
                <div className="flex-1 flex flex-col gap-4">
                    <Select label="Assign Vehicle" required value={form.vehicle} onChange={e => setForm({...form, vehicle: e.target.value})}>
                        <option value="">-- Select --</option>
                        {vehicles.filter(v => v.status === 'active').map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.model}</option>)}
                    </Select>
                    

                    
                    <Input label="Route Notes" placeholder="Optional notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                    
                    <div className="p-4 bg-info/10 border border-info/30 rounded-lg text-sm text-foreground">
                        <strong>Selected Orders: {form.orders.length}</strong>
                        <p className="m-0 mt-1 text-muted-foreground text-xs">When this route completes, all selected orders will be automatically marked as Delivered.</p>
                    </div>
                </div>

                <div className="flex-[1.5] flex flex-col border-l border-border dark:border-border-dark pl-6 max-md:border-l-0 max-md:border-t max-md:pl-0 max-md:pt-6">
                    <Typography variant="caption" className="text-muted-foreground uppercase font-bold block mb-3">Pending Orders to Route</Typography>
                    <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-2">
                        {pendingOrders.length === 0 ? <div className="text-sm text-muted-foreground">No pending orders available.</div> : null}
                        
                        {pendingOrders.map(o => {
                          const orderRef = o._id;
                          return (
                            <div key={orderRef || o.id} onClick={() => handleOrderToggle(orderRef)} className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${form.orders.includes(orderRef) ? 'border-gold bg-gold/10' : 'border-border dark:border-border-dark bg-bg hover:bg-card'}`}>
                                <div>
                                    <div className="font-semibold text-sm text-foreground">{o.id || o.orderId} - {typeof o.shop === 'string' ? o.shop : o.shop?.name}</div>
                                    <div className="text-xs text-muted-foreground">{o.items} items • <LocationDisplay loc={typeof o.shop === 'object' ? (o.shop?.loc || o.shop?.location) : null} /></div>
                                </div>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${form.orders.includes(orderRef) ? 'border-gold bg-gold text-white' : 'border-muted bg-transparent'}`}>
                                    {form.orders.includes(orderRef) && <span className="text-sm">✓</span>}
                                </div>
                            </div>
                          );
                        })}
                    </div>
                </div>

            </div>
            
            <div className="mt-6 pt-4 border-t border-border dark:border-border-dark flex justify-end gap-3 bg-bg/50">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || form.orders.length === 0} isLoading={saving}>
                {saving ? 'Saving...' : 'Create Dispatch Route'}
              </Button>
            </div>
        </form>
      </EnterpriseModal>

      <ConfirmationDialog 
        isOpen={confirmState.isOpen}
        title={"Depart Dispatch"}
        message={"Mark this dispatch as IN-TRANSIT (Departed)?"}
        onConfirm={executeConfirmAction}
        onClose={() => setConfirmState({ isOpen: false, type: null, id: null })}
        confirmText={"Depart"}
        isDanger={false}
      />

      <EnterpriseModal
        isOpen={!!loadInventoryDispatch}
        onClose={() => setLoadInventoryDispatch(null)}
        title="Load Inventory Checklist"
        size="md"
      >
        <Typography variant="body" className="text-muted-foreground mb-5 block">
            Please verify the following aggregated inventory is loaded into the vehicle <strong>{loadInventoryDispatch?.vehicle?.plateNumber}</strong> before departing.
        </Typography>
        
        <div className="max-h-[300px] overflow-y-auto mb-5 border border-border dark:border-border-dark rounded-lg">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-bg">
              <tr>
                <th className="text-left p-2.5 border-b border-border dark:border-border-dark font-semibold text-foreground">Item Details (Orders)</th>
              </tr>
            </thead>
            <tbody>
              {loadInventoryDispatch?.orders?.map(o => (
                <tr key={o._id || o.id}>
                  <td className="p-3 border-b border-border dark:border-border-dark">
                    <div className="font-semibold text-foreground">{o.orderId || o.id} - {typeof o.shop === 'object' ? o.shop?.name : o.shop}</div>
                    <div className="text-muted-foreground mt-1">
                      {o.lineItems && o.lineItems.length > 0 
                        ? o.lineItems.map(li => `${li.quantity}x ${li.productName}`).join(' • ') 
                        : `${o.items} total units assigned.`}
                    </div>
                  </td>
                </tr>
              ))}
              {(!loadInventoryDispatch?.orders || loadInventoryDispatch.orders.length === 0) && (
                <tr><td className="p-3 text-center text-muted-foreground">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLoadInventoryDispatch(null)} className="flex-1">Cancel</Button>
          <Button onClick={() => {
            const idToStart = loadInventoryDispatch._id;
            setLoadInventoryDispatch(null);
            setConfirmState({ isOpen: true, type: 'start', id: idToStart });
          }} className="flex-[2]">
            Acknowledge & Depart
          </Button>
        </div>
      </EnterpriseModal>

      {podDispatch && (
        <PoDModal 
          dispatch={podDispatch} 
          onClose={() => setPodDispatch(null)} 
          onComplete={executePoD} 
        />
      )}

    </div>
  );
}
