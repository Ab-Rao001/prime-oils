import React from 'react';
import C from '../theme';
import Badge from './Badge';

export function formatProductPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return '—';
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export default function ProductCard({ product, showStock = true }) {
  const lowStock = product.stock < product.min;

  return (
    <article style={{
      background: C.card,
      border: `1px solid ${lowStock ? `${C.danger}44` : C.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {product.imageUrl ? (
        <div style={{
          height: 150,
          background: 'linear-gradient(180deg, #faf8f4 0%, #f0ebe0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ maxHeight: 130, maxWidth: '88%', objectFit: 'contain' }}
          />
          {product.size ? (
            <span style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: C.gold,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
            }}>
              {product.size}
            </span>
          ) : null}
        </div>
      ) : (
        <div style={{
          height: 100,
          background: C.goldBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}>
          🛢️
        </div>
      )}

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{product.name}</div>
        {product.description ? (
          <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', lineHeight: 1.45 }}>{product.description}</p>
        ) : null}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
          {product.cat}{product.unit ? ` · ${product.unit}` : ''}
        </div>

        <div style={{
          marginTop: 'auto',
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Price</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.gold }}>{formatProductPrice(product.price)}</div>
          </div>
          {showStock ? (
            <div style={{ textAlign: 'right' }}>
              <Badge s={lowStock ? 'overdue' : 'active'} />
              <div style={{ fontSize: 12, color: lowStock ? C.danger : C.text, marginTop: 4, fontWeight: 600 }}>
                Stock: {product.stock ?? '—'}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
