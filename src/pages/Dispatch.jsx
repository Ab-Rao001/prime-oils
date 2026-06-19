import React, { useState, useMemo, useEffect } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { dispatchApi } from '../api/dispatchApi';
import { orderApi } from '../api/orderApi';
import { userApi } from '../api/userApi';
import Badge from '../components/Badge';
import { SkeletonTable } from '../components/common/Skeleton';
import { THead, TRow, TCell } from '../components/Table';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import PoDModal from '../components/orders/PoDModal';
import toast from 'react-hot-toast';

export default function Dispatch({ role, users }) {
  const [activeTab, setActiveTab] = useState('routes');
  
  const { data: dispatches, setData: setDispatches, loading: loadingD } = useFetch(() => dispatchApi.getDispatches(), []);
  const { data: vehicles, setData: setVehicles, loading: loadingV } = useFetch(() => dispatchApi.getVehicles(), []);
  const { data: orders, setData: setOrders, loading: loadingO } = useFetch(() => orderApi.getOrders({}), []);
  const { data: fetchedSalesmen } = useFetch(() => userApi.getSalesmen(), []);
  
  const [showModal, setShowModal] = useState(false);
  const [podDispatch, setPodDispatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, type: null, id: null });
  const [loadInventoryDispatch, setLoadInventoryDispatch] = useState(null);
  
  const [form, setForm] = useState({ vehicle: '', driver: '', orders: [], notes: '' });

  const salesmen = useMemo(() => {
    if (fetchedSalesmen && fetchedSalesmen.length > 0) return fetchedSalesmen;
    return (users || []).filter(u => u.role === 'salesman');
  }, [users, fetchedSalesmen]);

  const pendingOrders = useMemo(() => (orders || []).filter(o => o.status === 'ready_for_dispatch'), [orders]);

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
      if (!form.vehicle || !form.driver) return toast.error('Select Vehicle and Driver');
      if (form.orders.length === 0) return toast.error('Select at least one order to dispatch');
      
      setSaving(true);
      try {
          const created = await dispatchApi.createDispatch(form);
          setDispatches(prev => [created, ...prev]);
          setShowModal(false);
          setForm({ vehicle: '', driver: '', orders: [], notes: '' });
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
            setOrders(prev => prev.map(o => {
                if(updated.orders.some(uo => uo._id === o.id || uo._id === o._id)) {
                    return { ...o, status: 'delivered' };
                }
                return o;
            }));
            toast.success('PoD submitted. Route completed and orders delivered.');
          } else {
            toast.success('PoD submitted. Delivery failed.');
          }
          setPodDispatch(null);
      } catch (err) {
          throw err;
      }
  };

  const [vehForm, setVehForm] = useState({ plateNumber: '', model: '', capacity: '' });
  const handleAddVehicle = async (e) => {
      e.preventDefault();
      try {
          const created = await dispatchApi.createVehicle(vehForm);
          setVehicles(prev => [created, ...prev]);
          setVehForm({ plateNumber: '', model: '', capacity: '' });
          toast.success('Vehicle added');
      } catch (err) {
          toast.error('Failed to add vehicle');
      }
  };

  if (loadingD || loadingV || loadingO) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Fleet & Dispatch Routing" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <SectionHeader 
          title="Fleet & Dispatch Routing" 
          action={(role === 'admin' || role === 'supplier') && activeTab === 'routes' ? "Create Route" : null} 
          onAction={() => setShowModal(true)} 
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {['routes', 'fleet'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                    padding: '8px 20px',
                    borderRadius: 20,
                    border: `1px solid ${activeTab === tab ? C.gold : C.border}`,
                    background: activeTab === tab ? `${C.gold}22` : C.card,
                    color: activeTab === tab ? C.gold : C.text,
                    cursor: 'pointer',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                }}
              >
                  {tab}
              </button>
          ))}
      </div>

      {activeTab === 'routes' && (
        <div className="table-responsive-container" style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <THead cols={['Dispatch ID', 'Vehicle', 'Driver', 'Orders Included', 'Status', 'Actions']} />
            <tbody>
              {dispatches.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 0 }}><EmptyState title="No Dispatches" message="No dispatch routes found." icon="🚚" /></td></tr>
              ) : dispatches.map(d => (
                <TRow key={d._id}>
                  <TCell bold>{d.dispatchId}</TCell>
                  <TCell>{d.vehicle?.plateNumber} ({d.vehicle?.model})</TCell>
                  <TCell>{d.driver?.name}</TCell>
                  <TCell>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{d.orders?.length || 0} Orders</div>
                  </TCell>
                  <TCell><Badge s={d.status} /></TCell>
                  <TCell>
                    {d.status === 'scheduled' && (
                      <button onClick={() => setLoadInventoryDispatch(d)} style={{ padding: '6px 12px', background: C.info, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Load Inventory
                      </button>
                    )}
                    {d.status === 'in-transit' && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => {
                          const firstOrderLoc = d.orders?.[0]?.shop?.loc || '';
                          window.open(`https://maps.google.com/?q=${encodeURIComponent(firstOrderLoc || 'Pakistan')}`, '_blank');
                        }} style={{ padding: '6px 10px', background: '#e3f2fd', color: '#1976d2', border: `1px solid #90caf9`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          📍 Nav
                        </button>
                        <button onClick={() => setPodDispatch(d)} style={{ padding: '6px 12px', background: C.success, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Resolve Route
                        </button>
                      </div>
                    )}
                    {d.status === 'completed' && (
                        <div style={{ fontSize: 11, color: C.muted }}>Returned: {new Date(d.arrivalTime).toLocaleString()}</div>
                    )}
                  </TCell>
                </TRow>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'fleet' && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ background: C.card, padding: 20, borderRadius: 12, border: `1px solid ${C.border}` }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Add Vehicle</h3>
                      <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <input type="text" placeholder="Plate Number (e.g. LHR-1234)" value={vehForm.plateNumber} onChange={e => setVehForm({...vehForm, plateNumber: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
                          <input type="text" placeholder="Model (e.g. Hino Ranger)" value={vehForm.model} onChange={e => setVehForm({...vehForm, model: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
                          <input type="number" placeholder="Capacity (units)" value={vehForm.capacity} onChange={e => setVehForm({...vehForm, capacity: e.target.value})} required style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
                          <button type="submit" style={{ padding: 10, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Add Vehicle</button>
                      </form>
                  </div>
              </div>
              <div style={{ flex: 2, minWidth: 400 }}>
                  <div className="table-responsive-container" style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <THead cols={['Plate', 'Model', 'Capacity', 'Status']} />
                        <tbody>
                            {vehicles.length === 0 ? (
                              <tr><td colSpan={4} style={{ padding: 0 }}><EmptyState title="No Vehicles" message="No vehicles found in fleet." icon="🚛" /></td></tr>
                            ) : vehicles.map(v => (
                                <TRow key={v._id}>
                                    <TCell bold>{v.plateNumber}</TCell>
                                    <TCell>{v.model}</TCell>
                                    <TCell>{v.capacity} Units</TCell>
                                    <TCell><Badge s={v.status} /></TCell>
                                </TRow>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>Create Dispatch Route</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateRoute} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: 20, overflowY: 'auto', display: 'flex', gap: 24 }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>Assign Vehicle</label>
                            <select required value={form.vehicle} onChange={e => setForm({...form, vehicle: e.target.value})} style={{ width: '100%', padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
                                <option value="">-- Select --</option>
                                {vehicles.filter(v => v.status === 'active').map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.model}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>Assign Driver (Salesman)</label>
                            <select required value={form.driver} onChange={e => setForm({...form, driver: e.target.value})} style={{ width: '100%', padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
                                <option value="">-- Select --</option>
                                {salesmen.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>Route Notes</label>
                            <input type="text" placeholder="Optional notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                        </div>
                        
                        <div style={{ padding: 16, background: `${C.info}11`, border: `1px solid ${C.info}44`, borderRadius: 8, fontSize: 13, color: C.text }}>
                            <strong>Selected Orders: {form.orders.length}</strong>
                            <p style={{ margin: '4px 0 0 0', color: C.muted }}>When this route completes, all selected orders will be automatically marked as Delivered.</p>
                        </div>
                    </div>

                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${C.border}`, paddingLeft: 24 }}>
                        <label style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 12 }}>Pending Orders to Route</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                            {pendingOrders.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>No pending orders available.</div> : null}
                            
                            {pendingOrders.map(o => (
                                <div key={o.id} onClick={() => handleOrderToggle(o.id || o._id)} style={{ padding: 12, border: `1px solid ${form.orders.includes(o.id || o._id) ? C.gold : C.border}`, background: form.orders.includes(o.id || o._id) ? `${C.gold}11` : C.bg, borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{o.orderId} - {o.shop?.name}</div>
                                        <div style={{ fontSize: 12, color: C.muted }}>{o.items} items • {o.shop?.loc || 'No location'}</div>
                                    </div>
                                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${form.orders.includes(o.id || o._id) ? C.gold : C.muted}`, background: form.orders.includes(o.id || o._id) ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {form.orders.includes(o.id || o._id) && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
                
                <div style={{ padding: 20, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12, background: `${C.bg}55` }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" disabled={saving || form.orders.length === 0} style={{ padding: '10px 20px', background: C.gold, color: '#fff', border: 'none', borderRadius: 8, cursor: saving || form.orders.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving || form.orders.length === 0 ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Create Dispatch Route'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title={"Depart Dispatch"}
        message={"Mark this dispatch as IN-TRANSIT (Departed)?"}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmState({ isOpen: false, type: null, id: null })}
        confirmText={"Depart"}
        isDanger={false}
      />

      {loadInventoryDispatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 20 }}>Load Inventory Checklist</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Please verify the following aggregated inventory is loaded into the vehicle <strong>{loadInventoryDispatch.vehicle?.plateNumber}</strong> before departing.</p>
            
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: C.bg }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>Item Details (Orders)</th>
                  </tr>
                </thead>
                <tbody>
                  {loadInventoryDispatch.orders?.map(o => (
                    <tr key={o._id || o.id}>
                      <td style={{ padding: '12px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontWeight: 600 }}>{o.orderId} - {o.shop?.name}</div>
                        <div style={{ color: C.muted, marginTop: 4 }}>{o.items} total units assigned.</div>
                      </td>
                    </tr>
                  ))}
                  {(!loadInventoryDispatch.orders || loadInventoryDispatch.orders.length === 0) && (
                    <tr><td style={{ padding: 12, textAlign: 'center', color: C.muted }}>No orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setLoadInventoryDispatch(null)} style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => {
                const idToStart = loadInventoryDispatch._id;
                setLoadInventoryDispatch(null);
                setConfirmState({ isOpen: true, type: 'start', id: idToStart });
              }} style={{ flex: 2, padding: 12, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Acknowledge & Depart
              </button>
            </div>
          </div>
        </div>
      )}

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
