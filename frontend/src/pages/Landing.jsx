import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Package, Truck, ShieldCheck, 
  ArrowRightLeft, Lock 
} from 'lucide-react';

// Counter Component
const Counter = ({ from, to, duration, suffix = '+' }) => {
  const [count, setCount] = useState(from);
  useEffect(() => {
    let startTime;
    const animateCount = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);
      if (progress < 1) {
        setCount(Math.floor(from + (to - from) * progress));
        requestAnimationFrame(animateCount);
      } else {
        setCount(to);
      }
    };
    requestAnimationFrame(animateCount);
  }, [from, to, duration]);
  return <span>{count.toLocaleString()}{suffix}</span>;
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={ { fontFamily: "'DM Sans', sans-serif", backgroundColor: '#111e14', color: '#FDF6E3', overflowX: 'hidden' }}>
      
      {/* =========================================
          HERO SECTION (Preserving original image)
      ========================================= */}
      <section style={ {
        height: '100vh',
        position: 'relative',
        backgroundImage: 'url(/landing-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1F3A1F',
      }}>
        
        <div style={ { position: 'relative', zIndex: 2, width: '100%', height: '100%', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Top Left Pill */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={ { position: 'absolute', top: '40px', left: '5%', marginLeft: '-16px' }}
          >
            <div style={ { 
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
              borderRadius: '999px', background: 'transparent', border: '1px solid rgba(245, 200, 66, 0.3)', width: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              <span style={ { width: '8px', height: '8px', borderRadius: '50%', background: '#F5C842' }}></span>
              <span style={ { fontSize: '0.85rem', fontWeight: 600, color: '#F5C842' }}>Prime Oils Distribution</span>
            </div>
          </motion.div>
          
          {/* Bottom Left Text Block */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            style={ { position: 'absolute', bottom: '160px', left: '5%', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}
          >
            <h1 style={ { fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontFamily: "'Playfair Display', serif", fontWeight: 700, lineHeight: 1.1, textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>
              Prime Oils <br/>
              <span style={ { color: '#F5C842', fontStyle: 'italic' }}>Warehouse &amp; Logistics</span> <br/>
              Management
            </h1>
            
            <p style={ { fontSize: '1rem', color: 'rgba(253,246,227,0.9)', maxWidth: '400px', lineHeight: 1.5, textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}>
              Manage Inventory, Orders, Dispatch, Proof of Delivery, and Warehouse Transfers in Real-Time from a Single Integrated Platform.
            </p>
          </motion.div>

          {/* Bottom Left Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
            style={ { position: 'absolute', bottom: '30px', left: '5%', display: 'flex', gap: '16px', flexWrap: 'wrap' }}
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/auth', { state: { tab: 'login' } })} 
              style={ {
                padding: '12px 24px', borderRadius: '999px', background: '#F5C842', color: '#0D0A05',
                border: 'none', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(245,200,66,0.3)', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              Login <ArrowRight size={18} />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/auth', { state: { tab: 'signup' } })} 
              style={ {
                padding: '12px 24px', borderRadius: '999px', background: '#1F3A1F', color: '#FDF6E3',
                border: '1px solid rgba(253,246,227,0.3)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
            >
              <Lock size={16} /> Sign Up
            </motion.button>
          </motion.div>

          {/* Right Content - Floating Badges */}
          <div className="hidden md:block" style={ { position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <motion.div 
                animate={{ y: [0, -15, 0] }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                style={ { position: 'absolute', bottom: '10%', right: '0%', padding: '20px', background: '#1F3A1F', border: '1px solid rgba(245,200,66,0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', pointerEvents: 'auto' }}
              >
                <div style={ { padding: '12px', background: 'rgba(245,200,66,0.2)', borderRadius: '12px', color: '#F5C842' }}><Package size={24} /></div>
                <div>
                  <p style={ { fontSize: '0.8rem', color: 'rgba(253,246,227,0.6)', margin: 0 }}>Inventory Accuracy</p>
                  <p style={ { fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#FDF6E3' }}>99.9% Audited</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 20, 0] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                style={ { position: 'absolute', top: '40%', right: '45%', padding: '20px', background:'#1F3A1F' , border: '1px solid rgba(245,200,66,0.4)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', pointerEvents: 'auto' }}
              >
                <div style={ { padding: '12px', background: 'rgba(31,58,31,0.1)', borderRadius: '12px', color: '#F5C842' }}><Truck size={24} /></div>
                <div>
                  <p style={ { fontSize: '0.8rem', color: "white" , margin: 0 }}>Active Fleet</p>
                  <p style={ { fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'white' }}>Real-Time GPS</p>
                </div>
              </motion.div>
          </div>

        </div>

        {/* Scroll hint */}
        <div style={ { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 2, color: 'rgba(253,246,227,0.5)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Scroll Down ↓
        </div>
      </section>

      {/* =========================================
          LIVE STATISTICS
      ========================================= */}
      <section style={ { padding: '80px 5%', background: '#0a170d', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={ { maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '40px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {[
            { label: 'Orders Processed', to: 150000 },
            { label: 'Inventory Accuracy', to: 99, suffix: '.9%' },
            { label: 'Active Warehouses', to: 5 },
            { label: 'Successful Drops', to: 28400 }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={ { textAlign: 'center', flex: '1 1 200px' }}
            >
              <h3 style={ { fontSize: '3rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#F5C842', margin: '0 0 8px 0' }}>
                <Counter from={0} to={stat.to} duration={2} suffix={stat.suffix || '+'} />
              </h3>
              <p style={ { fontSize: '0.85rem', fontWeight: 600, color: 'rgba(253,246,227,0.5)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =========================================
          CORE FEATURES
      ========================================= */}
      <section style={ { padding: '120px 5%', background: 'linear-gradient(180deg, #111e14 0%, #0d2a14 100%)' }}>
        <div style={ { maxWidth: '1200px', margin: '0 auto' }}>
          <div style={ { textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={ { fontSize: '3rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: '16px' }}>Operational Control Modules</h2>
            <p style={ { color: 'rgba(253,246,227,0.6)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              A meticulously engineered suite designed to govern every aspect of your distribution supply chain.
            </p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            style={ { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}
          >
            {[
              { icon: <Package/>, title: 'Inventory Engine', desc: 'Real-time stock tracking, ledger auditing, and automated threshold alerts.' },
              { icon: <ShieldCheck/>, title: 'Order Compliance', desc: 'Strict credit validation and approval workflows before dispatch.' },
              { icon: <Truck/>, title: 'Fleet Dispatch', desc: 'Vehicle assignment, driver manifest generation, and delivery tracking.' },
              { icon: <ArrowRightLeft/>, title: 'Warehouse Transfers', desc: 'Secure inter-warehouse stock movements and reconciliation.' },
            ].map((feat, i) => (
              <motion.div 
                key={i} variants={itemVariant}
                whileHover={{ y: -5, background: 'rgba(255,255,255,0.08)' }}
                style={ { padding: '32px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.3s' }}
              >
                <div style={ { width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 200, 66, 0.1)', border: '1px solid rgba(245, 200, 66, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C842', marginBottom: '24px' }}>
                  {feat.icon}
                </div>
                <h3 style={ { fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>{feat.title}</h3>
                <p style={ { color: 'rgba(253,246,227,0.6)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================
          LOGISTICS PIPELINE
      ========================================= */}
      <section style={ { padding: '120px 5%', background: '#0a170d' }}>
        <div style={ { maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          
          <div style={ { position: 'absolute', left: '32px', top: 0, bottom: 0, width: '2px', background: 'rgba(245, 200, 66, 0.2)' }} />

          <h2 style={ { fontSize: '2.5rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: '60px', paddingLeft: '80px' }}>The Logistics Pipeline</h2>

          {[
            { step: '01', title: 'Order Creation & Approval', desc: 'Salesmen capture orders; system validates credit.' },
            { step: '02', title: 'Inventory Allocation', desc: 'Stock is reserved at the origin warehouse.' },
            { step: '03', title: 'Vehicle Dispatch', desc: 'Load sheets generated; drivers assigned.' },
            { step: '04', title: 'Proof of Delivery', desc: 'Driver confirms drop-off or records partial return.' },
            { step: '05', title: 'Financial Reconciliation', desc: 'Ledgers update instantly based on delivered quantities.' }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={ { display: 'flex', gap: '32px', marginBottom: '40px', position: 'relative' }}
            >
              <div style={ { width: '64px', height: '64px', borderRadius: '50%', background: '#0a170d', border: '2px solid #F5C842', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5C842', fontWeight: 700, zIndex: 2 }}>
                {item.step}
              </div>
              <div style={ { paddingTop: '16px' }}>
                <h4 style={ { fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h4>
                <p style={ { color: 'rgba(253,246,227,0.6)', fontSize: '0.95rem', margin: 0 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =========================================
          VIDEO / SYSTEM DEMONSTRATION (Preserving existing video)
      ========================================= */}
      <section style={ { height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
        <div style={ {
          position: 'absolute', top: '50%', left: '50%', width: '100vw', height: '56.25vw',
          minWidth: '177.77777778vh', minHeight: '100vh', transform: 'translate(-50%, -50%)',
        }}>
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube-nocookie.com/embed/dy70sTWgEMA?autoplay=1&loop=1&playlist=dy70sTWgEMA&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=0"
            style={ { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen={false}
            title="ERP Demonstration"
            loading="lazy"
          />
        </div>
      
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}
      <footer style={ { background: '#0a170d', padding: '60px 5% 30px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={ { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', marginBottom: '60px' }}>
          <div style={ { flex: '1 1 300px' }}>
            <h3 style={ { fontSize: '1.5rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: '16px' }}>
              Prime <span style={ { color: '#F5C842', fontStyle: 'italic' }}>Oil</span> Suppliers
            </h3>
            <p style={ { color: 'rgba(253,246,227,0.5)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Advanced ERP platform engineered for the modern distribution industry. Managing millions in inventory and thousands of deliveries daily.
            </p>
          </div>
          <div style={ { display: 'flex', gap: '80px', flexWrap: 'wrap' }}>
            <div>
              <h4 style={ { fontSize: '0.85rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Technology</h4>
              <ul style={ { listStyle: 'none', padding: 0, margin: 0, color: 'rgba(253,246,227,0.6)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li>React 18 / Node.js</li>
                <li>MongoDB Engine</li>
                <li>Framer Motion</li>
                <li>JWT Security</li>
              </ul>
            </div>
            <div>
              <h4 style={ { fontSize: '0.85rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>System</h4>
              <ul style={ { listStyle: 'none', padding: 0, margin: 0, color: 'rgba(253,246,227,0.6)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={ { cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => navigate('/auth')}>Admin Login</li>
                <li style={ { cursor: 'pointer', transition: 'color 0.2s' }}>Security Audit</li>
                <li style={ { cursor: 'pointer', transition: 'color 0.2s' }}>System Architecture</li>
              </ul>
            </div>
          </div>
        </div>
        <div style={ { maxWidth: '1200px', margin: '0 auto', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', color: 'rgba(253,246,227,0.4)', fontSize: '0.85rem' }}>
          <p>&copy; {new Date().getFullYear()} Prime Oil Suppliers ERP. FYP Showcase.</p>
          <div style={ { display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} /> Fully Audited &amp; Secure
          </div>
        </div>
      </footer>
    </div>
  );
}
