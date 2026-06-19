import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import ProductCard, { formatProductPrice } from '../components/ProductCard';
import ProductImageUpload from '../components/ProductImageUpload';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError, ApiEmpty } from '../components/ApiMessage';
import Table, { TRow, TCell } from '../components/Table';
import FormInput from '../components/common/FormInput';
import { sortProductsBySize } from '../config/products';
import { useFetch } from '../hooks/useFetch';
import { useVirtualScroll } from '../hooks/useVirtual';
import { useDebounce } from '../hooks/useDebounce';
import { inventoryApi } from '../api/inventoryApi';

const EMPTY_FORM = { name: '', cat: '', stock: '', unit: '', price: '', costPrice: '', min: '' };

export default function Inventory({ role }) {
  const { data: products, setData: setProducts, loading, error } = useFetch(() => inventoryApi.getProducts(), []);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [adjust, setAdjust] = useState({});
  const [receivingId, setReceivingId] = useState(null);
  const [receiveData, setReceiveData] = useState({ quantity: '', unitCost: '', notes: '' });

  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  const canAddProduct = role === 'admin' || role === 'supplier';
  // Disabling manual stock adjustment for Enterprise Mode
  const canAdjustStock = false;

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
      costPrice: String(product.costPrice ?? ''),
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
    if (form.costPrice !== '' && (isNaN(form.costPrice) || +form.costPrice < 0)) errors.costPrice = 'Cost price cannot be negative';
    if (form.stock === '' || isNaN(form.stock) || +form.stock < 0) errors.stock = 'Stock must be at least 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0 && !imageError;
  };

  const syncProductImage = async productId => {
    if (removeExistingImage) {
      return inventoryApi.deleteProductImage(productId);
    }
    if (pendingImageFile) {
      return inventoryApi.uploadProductImage(productId, pendingImageFile, setUploadProgress);
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
        costPrice: +form.costPrice || 0,
        min: +form.min || 0,
      };

      let saved;
      if (editingProduct) {
        saved = await inventoryApi.updateProduct(pid(editingProduct), payload);
        const withImage = await syncProductImage(pid(saved));
        if (withImage) saved = withImage;
        setProducts(prev => prev.map(p => (pid(p) === pid(saved) ? saved : p)));
      } else {
        saved = await inventoryApi.createProduct(payload);
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
      const updated = await inventoryApi.adjustStock(id, delta);
      setProducts(prev => prev.map(p => (pid(p) === id ? updated : p)));
      setAdjust(prev => ({ ...prev, [id]: '' }));
    } catch (e) {
      console.error(e);
    }
  };

  const applyReceiveStock = async id => {
    const qty = +receiveData.quantity;
    const cost = +receiveData.unitCost;
    if (Number.isNaN(qty) || qty <= 0) return;
    
    try {
      const updated = await inventoryApi.receiveProduct({ 
        productId: id, 
        quantity: qty, 
        unitCost: cost || undefined,
        notes: receiveData.notes
      });
      setProducts(prev => prev.map(p => (pid(p) === id ? updated : p)));
      setReceivingId(null);
      setReceiveData({ quantity: '', unitCost: '', notes: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const FIELDS = [
    { label: 'Product Name', key: 'name', type: 'text', required: true },
    { label: 'Category', key: 'cat', type: 'text', required: true },
    { label: 'Stock', key: 'stock', type: 'number', required: true },
    { label: 'Unit (e.g. Bottle)', key: 'unit', type: 'text' },
    { label: 'Selling Price (PKR)', key: 'price', type: 'number', required: true },
    { label: 'Cost Price (PKR)', key: 'costPrice', type: 'number' },
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
            {filtered.map(p => (
              <ProductCard key={pid(p)} product={p} showStock />
            ))}
          </div>

          <Table
            headers={
              canAddProduct
                ? ['Product', 'Size', 'Category', 'Stock', 'Unit', 'Cost', 'Sell', 'Min', 'Status', 'Actions']
                : ['Product', 'Size', 'Category', 'Stock', 'Unit', 'Cost', 'Sell', 'Min', 'Status']
            }
            data={visibleItems}
            onScroll={onScroll}
            style={{ maxHeight: `${viewportHeight}px`, overflowY: 'auto' }}
            virtualPadding={{ top: startOffset, bottom: bottomPadding }}
            emptyMessage="No products in inventory match your filters."
            caption="Inventory database records"
            renderRow={p => (
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
                <TCell>{formatProductPrice(p.costPrice || 0)}</TCell>
                <TCell>{formatProductPrice(p.price)}</TCell>
                <TCell>{p.min}</TCell>
                <TCell>
                  <Badge s={p.stock < p.min ? 'overdue' : 'active'} />
                </TCell>
                {canAddProduct && (
                  <td style={{ padding: '8px 12px' }}>
                    {receivingId === pid(p) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          type="number"
                          value={receiveData.quantity}
                          onChange={e => setReceiveData(prev => ({ ...prev, quantity: e.target.value }))}
                          placeholder="Qty"
                          style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }}
                        />
                        <input
                          type="number"
                          value={receiveData.unitCost}
                          onChange={e => setReceiveData(prev => ({ ...prev, unitCost: e.target.value }))}
                          placeholder="Unit Cost"
                          style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => applyReceiveStock(pid(p))}
                            style={{ padding: '4px 8px', background: C.gold, color: '#fff', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, flex: 1 }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setReceivingId(null)}
                            style={{ padding: '4px 8px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, flex: 1 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
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
                        {(role === 'supplier' || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => setReceivingId(pid(p))}
                            style={{
                              padding: '6px 12px',
                              background: 'transparent',
                              border: `1.5px solid ${C.border}`,
                              borderRadius: 8,
                              color: C.text,
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            Receive
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </TRow>
            )}
          />
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
