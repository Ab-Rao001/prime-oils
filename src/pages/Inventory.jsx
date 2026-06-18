import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import ProductCard, { formatProductPrice } from '../components/ProductCard';
import ProductImageUpload from '../components/ProductImageUpload';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError, ApiEmpty } from '../components/ApiMessage';
import { THead, TRow, TCell } from '../components/Table';
import FormInput from '../components/common/FormInput';
import { sortProductsBySize } from '../config/products';
import { useFetch } from '../hooks/useFetch';
import { useVirtualScroll } from '../hooks/useVirtual';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../api/client';

const EMPTY_FORM = { name: '', cat: '', stock: '', unit: '', price: '', min: '' };

export default function Inventory({ role }) {
  const { data: products, setData: setProducts, loading, error } = useFetch(() => api.getProducts(), []);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [adjust, setAdjust] = useState({});

  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  const canAddProduct = role === 'admin' || role === 'supplier';
  const canAdjustStock = role === 'supplier';

  const filtered = sortProductsBySize(
    products.filter(p =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.cat.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      String(p.size || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  );

  const pid = p => p._id || p.id;

  const rowHeight = 56;
  const viewportHeight = 350;
  const { visibleItems, totalHeight, startOffset, onScroll } = useVirtualScroll({
    items: filtered,
    rowHeight,
    viewportHeight,
  });

  const startIndex = Math.max(0, Math.floor(startOffset / rowHeight));
  const bottomPadding = Math.max(0, totalHeight - startOffset - visibleItems.length * rowHeight);

  const resetImageState = () => {
    setPendingImageFile(null);
    setImageError(null);
    setRemoveExistingImage(false);
    setUploadProgress(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    resetImageState();
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    resetImageState();
    setShowForm(true);
  };

  const openEditForm = product => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      cat: product.cat || '',
      stock: String(product.stock ?? ''),
      unit: product.unit || '',
      price: String(product.price ?? ''),
      min: String(product.min ?? ''),
    });
    setFormErrors({});
    resetImageState();
    setShowForm(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Product name is required';
    if (!form.cat.trim()) errors.cat = 'Category is required';
    if (form.price === '' || isNaN(form.price) || +form.price < 0) errors.price = 'Price must be a positive number';
    if (form.stock === '' || isNaN(form.stock) || +form.stock < 0) errors.stock = 'Stock must be at least 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0 && !imageError;
  };

  const syncProductImage = async productId => {
    if (removeExistingImage) {
      return api.deleteProductImage(productId);
    }
    if (pendingImageFile) {
      return api.uploadProductImage(productId, pendingImageFile, setUploadProgress);
    }
    return null;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setUploadProgress(null);

    try {
      const payload = {
        name: form.name,
        cat: form.cat,
        stock: +form.stock,
        unit: form.unit || 'Bottle',
        price: +form.price,
        min: +form.min || 0,
      };

      let saved;
      if (editingProduct) {
        saved = await api.updateProduct(pid(editingProduct), payload);
        const withImage = await syncProductImage(pid(saved));
        if (withImage) saved = withImage;
        setProducts(prev => prev.map(p => (pid(p) === pid(saved) ? saved : p)));
      } else {
        saved = await api.createProduct(payload);
        if (pendingImageFile || removeExistingImage) {
          const withImage = await syncProductImage(pid(saved));
          if (withImage) saved = withImage;
        }
        setProducts(prev => [...prev, saved]);
      }

      closeForm();
    } catch (e) {
      console.error(e);
      if (pendingImageFile) {
        setImageError(e.message || 'Image upload failed');
      }
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const applyStockAdjust = async id => {
    const delta = +adjust[id];
    if (Number.isNaN(delta)) return;
    try {
      const updated = await api.adjustStock(id, delta);
      setProducts(prev => prev.map(p => (pid(p) === id ? updated : p)));
      setAdjust(prev => ({ ...prev, [id]: '' }));
    } catch (e) {
      console.error(e);
    }
  };

  const FIELDS = [
    { label: 'Product Name', key: 'name', type: 'text', required: true },
    { label: 'Category', key: 'cat', type: 'text', required: true },
    { label: 'Stock', key: 'stock', type: 'number', required: true },
    { label: 'Unit (e.g. Bottle)', key: 'unit', type: 'text' },
    { label: 'Price (PKR)', key: 'price', type: 'number', required: true },
    { label: 'Min Stock Level', key: 'min', type: 'number' },
  ];

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Inventory" />
        <SkeletonTable rows={6} cols={canAdjustStock ? 10 : 9} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <SectionHeader
        title="Inventory"
        btn={canAddProduct ? (showForm ? 'Cancel' : 'Add Product') : null}
        onBtn={() => {
          if (showForm) closeForm();
          else openCreateForm();
        }}
      />

      <ApiError error={error} />

      {showForm && canAddProduct && (
        <div
          className="card-premium"
          style={{
            background: C.card,
            border: `1.5px solid ${C.goldBorder}`,
            borderRadius: 14,
            padding: 22,
            marginBottom: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            {editingProduct ? 'Edit Product' : 'New Product Entry'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {FIELDS.map(({ label, key, type, required }) => (
              <FormInput
                key={key}
                id={key}
                label={label}
                type={type}
                required={required}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                error={formErrors[key]}
              />
            ))}
            <ProductImageUpload
              existingImageUrl={removeExistingImage ? null : editingProduct?.imageUrl}
              pendingFile={pendingImageFile}
              onFileSelect={(file, err) => {
                setPendingImageFile(file);
                setImageError(err);
                if (file) setRemoveExistingImage(false);
              }}
              onClearPending={() => {
                setPendingImageFile(null);
                setImageError(null);
              }}
              onRemoveExisting={() => {
                setRemoveExistingImage(true);
                setPendingImageFile(null);
                setImageError(null);
              }}
              error={imageError}
              uploadProgress={uploadProgress}
              disabled={saving}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 22px',
                background: saving ? C.muted : C.gold,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {saving
                ? uploadProgress !== null
                  ? `Uploading… ${uploadProgress}%`
                  : 'Saving…'
                : editingProduct
                  ? 'Save Changes'
                  : 'Save Product'}
            </button>
            <button
              onClick={closeForm}
              disabled={saving}
              style={{
                padding: '9px 16px',
                background: 'transparent',
                color: C.muted,
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search products by name, category, or size..."
      />

      {!filtered.length && !error ? (
        <ApiEmpty message="No products in inventory match your filters. Run npm run server:seed to reset." />
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: C.text }}>
            Showing {filtered.length} products
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
            {filtered.slice(0, 3).map(p => (
              <ProductCard key={pid(p)} product={p} showStock />
            ))}
          </div>

          <div
            className="table-responsive-container"
            onScroll={onScroll}
            style={{
              maxHeight: `${viewportHeight}px`,
              overflowY: 'auto',
              borderRadius: 14,
              border: `1px solid ${C.border}`,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <caption className="sr-only">Inventory database records</caption>
              <THead
                cols={
                  canAddProduct
                    ? canAdjustStock
                      ? ['Product', 'Size', 'Category', 'Stock', 'Unit', 'Price', 'Min', 'Status', 'Edit', 'Adjust']
                      : ['Product', 'Size', 'Category', 'Stock', 'Unit', 'Price', 'Min', 'Status', 'Edit']
                    : canAdjustStock
                      ? ['Product', 'Size', 'Category', 'Stock', 'Unit', 'Price', 'Min', 'Status', 'Adjust']
                      : ['Product', 'Size', 'Category', 'Stock', 'Unit', 'Price', 'Min', 'Status']
                }
              />
              <tbody>
                {startOffset > 0 && (
                  <tr style={{ height: `${startOffset}px` }}>
                    <td
                      colSpan={canAddProduct ? (canAdjustStock ? 10 : 9) : canAdjustStock ? 9 : 8}
                      style={{ padding: 0 }}
                    />
                  </tr>
                )}

                {visibleItems.map(p => (
                  <TRow key={pid(p)}>
                    <TCell bold>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt=""
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: 'contain',
                              borderRadius: 6,
                              background: '#f5f5f0',
                            }}
                          />
                        )}
                        {p.name}
                      </div>
                    </TCell>
                    <TCell>{p.size || '—'}</TCell>
                    <TCell>{p.cat}</TCell>
                    <TCell bold color={p.stock < p.min ? C.danger : C.text}>
                      {p.stock}
                    </TCell>
                    <TCell>{p.unit}</TCell>
                    <TCell>{formatProductPrice(p.price)}</TCell>
                    <TCell>{p.min}</TCell>
                    <TCell>
                      <Badge s={p.stock < p.min ? 'overdue' : 'active'} />
                    </TCell>
                    {canAddProduct && (
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          type="button"
                          onClick={() => openEditForm(p)}
                          style={{
                            padding: '6px 12px',
                            background: C.goldBg,
                            border: `1.5px solid ${C.goldBorder}`,
                            borderRadius: 8,
                            color: C.gold,
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                    {canAdjustStock && (
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number"
                            value={adjust[pid(p)] || ''}
                            onChange={e => setAdjust(prev => ({ ...prev, [pid(p)]: e.target.value }))}
                            style={{
                              width: 70,
                              padding: '6px 8px',
                              border: `1.5px solid ${C.border}`,
                              borderRadius: 7,
                              fontSize: 12,
                              color: C.text,
                              background: C.bg,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                            placeholder="+"
                            aria-label={`Deduct or add stock for ${p.name}`}
                          />
                          <button
                            onClick={() => applyStockAdjust(pid(p))}
                            style={{
                              padding: '6px 12px',
                              background: C.goldBg,
                              border: `1.5px solid ${C.goldBorder}`,
                              borderRadius: 8,
                              color: C.gold,
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      </td>
                    )}
                  </TRow>
                ))}

                {bottomPadding > 0 && (
                  <tr style={{ height: `${bottomPadding}px` }}>
                    <td
                      colSpan={canAddProduct ? (canAdjustStock ? 10 : 9) : canAdjustStock ? 9 : 8}
                      style={{ padding: 0 }}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {products.some(p => p.stock < p.min) && (
        <div
          style={{
            background: C.dBg,
            border: `1px solid ${C.danger}18`,
            borderRadius: 10,
            padding: '12px 16px',
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: 'var(--shadow-sm)',
          }}
          role="alert"
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.danger, fontWeight: 500 }}>
            Critical Stock Warnings: {products.filter(p => p.stock < p.min).map(p => p.name).join(', ')} (Below
            Threshold)
          </span>
        </div>
      )}
    </div>
  );
}
