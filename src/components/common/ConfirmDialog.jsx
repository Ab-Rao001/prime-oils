import React from 'react';
import C from '../../theme';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }} 
        onClick={onCancel}
        aria-hidden="true"
      />
      <div 
        role="alertdialog" 
        aria-modal="true" 
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: C.card, padding: 24, borderRadius: 12, width: '90%', maxWidth: 400, zIndex: 10000, boxShadow: 'var(--shadow-lg)', border: `1px solid ${C.border}` }}
      >
        <h3 style={{ margin: '0 0 12px 0', color: C.text, fontSize: 18, fontWeight: 'bold' }}>{title}</h3>
        <p style={{ margin: '0 0 24px 0', color: C.muted, fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button 
            onClick={onCancel}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {cancelText}
          </button>
          <button 
            autoFocus
            onClick={() => { onConfirm(); onCancel(); }}
            style={{ padding: '8px 16px', background: isDanger ? C.danger : C.gold, border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}
            className="focus-ring"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
};
export default ConfirmDialog;
