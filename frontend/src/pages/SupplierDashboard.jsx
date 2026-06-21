import React, { useState, useEffect } from 'react';
import { Package, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { request } from '../api/client';

export default function SupplierDashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    newOrders: 0,
    pendingReviews: 0,
    readyForDispatch: 0,
    deliveriesInProgress: 0,
    completedDeliveries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchAnalytics = async () => {
      try {
        const data = await request('/analytics/supplier');
        if (mounted) setStats(data);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAnalytics();
    
    // Real-time polling every 10 seconds
    const intervalId = setInterval(fetchAnalytics, 10000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const cards = [
    { title: 'New Orders', value: stats.newOrders, icon: Package, color: C.info, bg: C.iBg, path: 'orders' },
    { title: 'Pending Reviews', value: stats.pendingReviews, icon: Clock, color: C.warn, bg: C.wBg, path: 'orders' },
    { title: 'Ready for Dispatch', value: stats.readyForDispatch, icon: CheckCircle, color: C.success, bg: C.sBg, path: 'dispatch' },
    { title: 'In Transit', value: stats.deliveriesInProgress, icon: Truck, color: C.gold, bg: C.goldBg, path: 'dispatch' },
    { title: 'Completed', value: stats.completedDeliveries, icon: CheckCircle, color: C.success, bg: C.sBg, path: 'dispatch' },
  ];

  if (loading) {
    return (
      <div className="page-enter">
        <h2 style={ { fontSize: 24, fontWeight: 'bold', color: C.text, marginBottom: 20 }}>Supplier Operations</h2>
        <div style={ { padding: 40, textAlign: 'center', color: C.muted }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-enter">
        <div style={ { background: C.dBg, color: C.danger, padding: 16, borderRadius: 12, border: `1px solid ${C.danger}33`, display: 'flex', alignItems: 'center' }}>
          <AlertTriangle size={20} style={ { marginRight: 8 }} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={ { display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={ { fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 4 }}>Supplier Operations</h1>
        <p style={ { fontSize: 14, color: C.muted }}>Manage warehouse inventory and deliveries</p>
      </div>

      <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={card.title}
              className="card-premium hover-scale"
              style={ { display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate(card.path)}
            >
              <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={ { padding: 12, borderRadius: 10, background: card.bg }}>
                  <Icon size={24} color={card.color} />
                </div>
              </div>
              <h3 style={ { fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 4 }}>{card.value}</h3>
              <p style={ { fontSize: 13, color: C.muted, fontWeight: 600 }}>{card.title}</p>
            </motion.div>
          );
        })}
      </div>

      <div style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="card-premium" style={ { flex: 2, minWidth: 0 }}>
           <h3 style={ { fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>Recent Activity</h3>
           <div style={ { color: C.muted, textAlign: 'center', padding: '48px 0', fontSize: 14 }}>
             Activity feed implementation pending (Phase 4 integration)
           </div>
        </div>
        <div className="card-premium" style={ { flex: 1, minWidth: 0 }}>
           <h3 style={ { fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
             <AlertTriangle size={20} color={C.warn} style={ { marginRight: 8 }} />
             Low Stock Alerts
           </h3>
           <div style={ { color: C.muted, textAlign: 'center', padding: '48px 0', fontSize: 14 }}>
             No immediate alerts.
           </div>
        </div>
      </div>
    </div>
  );
}
