import React from 'react';
import { EnterpriseModal, Typography, Badge, Button } from '../ui';

const STEPS = ['REQUESTED', 'INSPECTING', 'APPROVED', 'RECEIVED', 'COMPLETED'];

export default function ReturnDetailModal({ isOpen, onClose, returnItem }) {
  if (!returnItem) return null;

  const stepIndex = STEPS.indexOf(returnItem.status === 'REJECTED' ? 'REQUESTED' : returnItem.status);

  return (
    <EnterpriseModal isOpen={isOpen} onClose={onClose} title={`Return ${returnItem.rmaId}`} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default">{returnItem.status}</Badge>
          <Badge variant="default">{(returnItem.resolutionType || 'REFUND').replace(/_/g, ' ')}</Badge>
          {returnItem.settlementStatus === 'SETTLED' && <Badge variant="success">Settled</Badge>}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                i <= stepIndex ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'
              }`}>
                {s.replace(/_/g, ' ')}
              </div>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Order:</span> {typeof returnItem.order === 'object' ? returnItem.order.orderId : returnItem.order}</div>
          <div><span className="text-muted-foreground">Customer:</span> {typeof returnItem.customer === 'object' ? returnItem.customer.name : returnItem.customer}</div>
          <div><span className="text-muted-foreground">Reason:</span> {returnItem.reason}</div>
          <div><span className="text-muted-foreground">Settlement:</span> PKR {(returnItem.settlementAmount || 0).toLocaleString()}</div>
        </div>

        {returnItem.inspectionNotes && (
          <Typography variant="body" className="text-sm block">
            <strong>Inspection:</strong> {returnItem.inspectionNotes} ({returnItem.inspectionGrade})
          </Typography>
        )}

        <div className="border border-border dark:border-border-dark rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-bg">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Qty</th>
                <th className="text-left p-2">Condition</th>
                <th className="text-left p-2">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {(returnItem.products || []).map(p => (
                <tr key={p.productId} className="border-t border-border dark:border-border-dark">
                  <td className="p-2">{p.productName}</td>
                  <td className="p-2">{p.quantity}</td>
                  <td className="p-2">{p.condition || '—'}</td>
                  <td className="p-2">{p.disposition?.replace(/_/g, ' ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {returnItem.creditNote && (
          <Typography variant="body" className="text-sm">
            Credit Note: <strong>{returnItem.creditNote.creditNoteId}</strong> — PKR {returnItem.creditNote.total?.toLocaleString()}
          </Typography>
        )}
        {returnItem.refund && (
          <Typography variant="body" className="text-sm">
            Refund: <strong>{returnItem.refund.refundId}</strong> — PKR {returnItem.refund.amount?.toLocaleString()} ({returnItem.refund.method})
          </Typography>
        )}
        {returnItem.replacementOrder && (
          <Typography variant="body" className="text-sm">
            Replacement Order: <strong>{returnItem.replacementOrder.orderId}</strong> — {returnItem.replacementOrder.status}
          </Typography>
        )}

        <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
      </div>
    </EnterpriseModal>
  );
}
