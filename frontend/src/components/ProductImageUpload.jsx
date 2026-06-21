import React, { useCallback, useEffect, useRef, useState } from 'react';
import C from '../theme';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPEG and PNG images are allowed';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Image must be 5MB or smaller';
  }
  return null;
}

/**
 * Product image picker with local preview (upload happens on parent form submit).
 */
export default function ProductImageUpload({
  existingImageUrl = null,
  pendingFile = null,
  onFileSelect,
  onClearPending,
  onRemoveExisting,
  error = null,
  uploadProgress = null,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const applyFile = useCallback(
    file => {
      const validationError = validateImageFile(file);
      if (validationError) {
        onFileSelect(null, validationError);
        return;
      }
      onFileSelect(file, null);
    },
    [onFileSelect]
  );

  const handleFiles = useCallback(
    files => {
      const file = files?.[0];
      if (!file) return;
      applyFile(file);
    },
    [applyFile]
  );

  const onInputChange = e => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = e => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const showExisting = existingImageUrl && !pendingFile && !previewUrl;
  const displayUrl = previewUrl || (showExisting ? existingImageUrl : null);

  return (
    <div style={ { gridColumn: '1 / -1' }}>
      <label style={ { display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
        Product Image
      </label>

      <div
        onDragOver={e => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={ {
          border: `2px dashed ${error ? C.danger : dragOver ? C.gold : C.border}`,
          borderRadius: 12,
          padding: displayUrl ? 16 : 28,
          background: dragOver ? C.goldBg : C.bg,
          textAlign: 'center',
          transition: 'border-color 0.15s ease, background 0.15s ease',
        }}
      >
        {displayUrl ? (
          <div style={ { position: 'relative', display: 'inline-block' }}>
            <img
              src={displayUrl}
              alt="Product preview"
              style={ {
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 10,
                objectFit: 'contain',
                background: '#f5f5f0',
              }}
            />
            {!disabled && (
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => {
                  if (pendingFile) {
                    onClearPending();
                  } else if (existingImageUrl) {
                    onRemoveExisting();
                  }
                }}
                style={ {
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  background: C.danger,
                  color: '#fff',
                  fontSize: 16,
                  lineHeight: 1,
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={ { fontSize: 32, marginBottom: 8, opacity: 0.5 }}>🖼️</div>
            <div style={ { fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>
              Drag and drop an image here
            </div>
            <div style={ { fontSize: 12, color: C.muted, marginBottom: 12 }}>JPEG or PNG, max 5MB</div>
          </>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={ {
              marginTop: displayUrl ? 12 : 0,
              padding: '8px 18px',
              background: C.goldBg,
              border: `1.5px solid ${C.goldBorder}`,
              borderRadius: 8,
              color: C.gold,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {displayUrl ? 'Choose different image' : 'Choose file'}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={onInputChange}
          style={ { display: 'none' }}
          disabled={disabled}
        />
      </div>

      {error && (
        <div style={ { marginTop: 8, fontSize: 12, color: C.danger, fontWeight: 500 }} role="alert">
          {error}
        </div>
      )}

      {uploadProgress !== null && uploadProgress >= 0 && (
        <div style={ { marginTop: 10 }}>
          <div
            style={ {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: C.muted,
              marginBottom: 4,
            }}
          >
            <span>Uploading image…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div
            style={ {
              height: 6,
              borderRadius: 4,
              background: C.border,
              overflow: 'hidden',
            }}
          >
            <div
              style={ {
                height: '100%',
                width: `${uploadProgress}%`,
                background: C.gold,
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { validateImageFile, ALLOWED_TYPES, MAX_SIZE_BYTES };
