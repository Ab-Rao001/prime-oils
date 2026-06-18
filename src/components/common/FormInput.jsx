import React from 'react';
import C from '../../theme';

/**
 * Enterprise-grade accessible Form Input component.
 */
export function FormInput({
  label,
  id,
  type = 'text',
  value,
  onChange,
  error = null,
  helperText = null,
  required = false,
  placeholder = '',
  disabled = false,
  style = {},
  ...props
}) {
  const helperId = helperText ? `${id}-helper` : '';
  const errorId = error ? `${id}-error` : '';
  const describedBy = [helperId, errorId].filter(Boolean).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginBottom: '14px', ...style }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: error ? C.danger : C.muted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {label}
          {required && <span style={{ color: C.danger }} aria-hidden="true">*</span>}
        </label>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: `1.5px solid ${error ? C.danger : '#d8e2da'}`,
          borderRadius: '8px',
          fontSize: '13px',
          color: C.text,
          backgroundColor: disabled ? '#f4f7f5' : 'white',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'all 0.15s ease',
        }}
        {...props}
      />

      {error && (
        <span
          id={errorId}
          style={{
            fontSize: '11px',
            color: C.danger,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '2px'
          }}
          role="alert"
        >
          ⚠️ {error}
        </span>
      )}

      {helperText && !error && (
        <span
          id={helperId}
          style={{
            fontSize: '11px',
            color: C.muted,
            marginTop: '2px'
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}

export default FormInput;
