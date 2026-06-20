import React from 'react';
import { Badge, Typography } from './ui';

export function formatProductPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return '—';
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export default function ProductCard({ product, showStock = true }) {
  const lowStock = product.stock < product.min;

  return (
    <article className={`bg-card rounded-xl overflow-hidden flex flex-col border ${lowStock ? 'border-danger/30 dark:border-danger/40' : 'border-border dark:border-border-dark'}`}>
      {product.imageUrl ? (
        <div className="h-[150px] flex items-center justify-center relative bg-gradient-to-b from-[#faf8f4] to-[#f0ebe0] dark:from-[#2a2d24] dark:to-[#1e2019]">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-[130px] max-w-[88%] object-contain"
          />
          {product.size && (
            <span className="absolute top-2.5 left-2.5 bg-gold text-white text-[10px] font-bold py-1 px-2 rounded-md">
              {product.size}
            </span>
          )}
        </div>
      ) : (
        <div className="h-[100px] bg-gold/10 flex items-center justify-center text-4xl">
          🛢️
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <Typography variant="body" weight="bold" className="text-foreground text-sm">{product.name}</Typography>
        
        {product.description && (
          <Typography variant="body" className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{product.description}</Typography>
        )}
        
        <Typography variant="caption" className="text-muted-foreground mt-2 block">
          {product.cat}{product.unit ? ` · ${product.unit}` : ''}
        </Typography>

        <div className="mt-auto pt-3 flex justify-between items-end">
          <div>
            <Typography variant="caption" className="text-muted-foreground uppercase tracking-widest text-[10px] block">Price</Typography>
            <Typography variant="h3" size="lg" className="font-extrabold text-gold">{formatProductPrice(product.price)}</Typography>
          </div>
          {showStock && (
            <div className="text-right">
              <Badge variant={lowStock ? 'danger' : 'success'}>
                {lowStock ? 'overdue' : 'active'}
              </Badge>
              <Typography variant="body" weight="semibold" className={`text-xs mt-1 block ${lowStock ? 'text-danger' : 'text-foreground'}`}>
                Stock: {product.stock ?? '—'}
              </Typography>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
