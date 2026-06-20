import React, { useState, useEffect } from 'react';
import { EnterpriseModal, Typography, Button, Select, Input } from '../ui';

const CONDITIONS = ['UNOPENED', 'DAMAGED', 'EXPIRED', 'WRONG_ITEM'];
const DISPOSITIONS = ['RESTOCK_SELLABLE', 'RESTOCK_DAMAGED', 'SCRAP', 'REWORK'];
const GRADES = ['PASS', 'FAIL', 'PARTIAL'];

export default function InspectReturnModal({ isOpen, onClose, returnItem, onSubmit, isLoading }) {
  const [grade, setGrade] = useState('PASS');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photos, setPhotos] = useState([]);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (!isOpen || !returnItem) return;
    setGrade('PASS');
    setNotes('');
    setPhotoUrl('');
    setPhotos([]);
    setLines((returnItem.products || []).map(p => ({
      productId: p.productId,
      productName: p.productName,
      quantity: p.quantity,
      condition: p.condition || 'DAMAGED',
      disposition: p.disposition || 'RESTOCK_SELLABLE',
    })));
  }, [isOpen, returnItem]);

  if (!returnItem) return null;

  const addPhoto = () => {
    if (photoUrl.trim()) {
      setPhotos(prev => [...prev, photoUrl.trim()]);
      setPhotoUrl('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: returnItem._id,
      grade,
      notes,
      inspectionPhotos: photos,
      products: lines.map(l => ({
        productId: l.productId,
        condition: l.condition,
        disposition: l.disposition,
      })),
    });
  };

  return (
    <EnterpriseModal isOpen={isOpen} onClose={onClose} title={`Inspect ${returnItem.rmaId}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Inspection Grade" value={grade} onChange={e => setGrade(e.target.value)}>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </Select>

        <div className="border border-border dark:border-border-dark rounded-lg divide-y divide-border dark:divide-border-dark">
          {lines.map((line, idx) => (
            <div key={line.productId} className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <Typography variant="body" weight="semibold">{line.productName} × {line.quantity}</Typography>
              <Select
                value={line.condition}
                onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, condition: e.target.value } : l))}
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </Select>
              <Select
                value={line.disposition}
                onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, disposition: e.target.value } : l))}
              >
                {DISPOSITIONS.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>
          ))}
        </div>

        <Input label="Inspection Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="QC findings..." />

        <div className="flex gap-2">
          <Input
            placeholder="Photo evidence URL"
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addPhoto}>Add</Button>
        </div>
        {photos.length > 0 && (
          <div className="text-xs text-muted-foreground">{photos.length} photo(s) attached</div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" isLoading={isLoading}>Complete Inspection</Button>
        </div>
      </form>
    </EnterpriseModal>
  );
}
