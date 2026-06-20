import React, { useState, useMemo } from 'react';
import C from '../theme';
import { Badge, Alert, EmptyState, Button, Input, Typography, EnterpriseModal } from '../components/ui';
import SectionHeader from '../components/SectionHeader';
import ProductCard, { formatProductPrice } from '../components/ProductCard';
import ProductImageUpload from '../components/ProductImageUpload';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError, ApiEmpty } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { sortProductsBySize } from '../config/products';
import { useFetch } from '../hooks/useFetch';
import { inventoryApi } from '../api/inventoryApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  cat: z.string().min(1, 'Category is required'),
  stock: z.number({ invalid_type_error: "Required" }).min(0, 'Stock must be at least 0'),
  unit: z.string().optional(),
  price: z.number({ invalid_type_error: "Required" }).positive('Price must be a positive number'),
  costPrice: z.number().min(0, 'Cost price cannot be negative').optional().default(0),
  min: z.number().min(0).optional().default(0),
});

export default function Inventory({ role }) {
  const { data: products, setData: setProducts, loading, error } = useFetch(() => inventoryApi.getProducts(), []);
  
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [receivingId, setReceivingId] = useState(null);
  const [receiveData, setReceiveData] = useState({ quantity: '', unitCost: '', notes: '' });

  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const canAddProduct = role === 'admin' || role === 'supplier';
  const pid = p => p._id || p.id;

  const { register, handleSubmit, formState: { errors, isSubmitting: saving }, reset } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', cat: '', stock: '', unit: '', price: '', costPrice: '', min: '' }
  });

  const resetImageState = () => {
    setPendingImageFile(null);
    setImageError(null);
    setRemoveExistingImage(false);
    setUploadProgress(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    reset({ name: '', cat: '', stock: '', unit: '', price: '', costPrice: '', min: '' });
    resetImageState();
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    reset({ name: '', cat: '', stock: '', unit: '', price: '', costPrice: '', min: '' });
    resetImageState();
    setShowForm(true);
  };

  const openEditForm = product => {
    setEditingProduct(product);
    reset({
      name: product.name || '',
      cat: product.cat || '',
      stock: product.stock ?? 0,
      unit: product.unit || '',
      price: product.price ?? 0,
      costPrice: product.costPrice ?? 0,
      min: product.min ?? 0,
    });
    resetImageState();
    setShowForm(true);
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

  const onSave = async (data) => {
    if (imageError) return;
    setUploadProgress(null);

    try {
      const payload = {
        name: data.name,
        cat: data.cat,
        stock: data.stock,
        unit: data.unit || 'Bottle',
        price: data.price,
        costPrice: data.costPrice || 0,
        min: data.min || 0,
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
      if (pendingImageFile) setImageError(e.message || 'Image upload failed');
    } finally {
      setUploadProgress(null);
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

  const columns = useMemo(() => {
    const cols = [
      { 
        header: 'Product', 
        accessorKey: 'name', 
        sortable: true,
        cell: (p) => (
          <div className="flex items-center gap-3 font-semibold">
            {p.imageUrl && (
              <img
                src={p.imageUrl}
                alt=""
                className="w-9 h-9 object-contain rounded-md bg-gray-50 dark:bg-gray-800"
              />
            )}
            {p.name}
          </div>
        )
      },
      { header: 'Size', accessorKey: 'size', sortable: true, cell: p => p.size || '—' },
      { header: 'Category', accessorKey: 'cat', sortable: true },
      { header: 'Stock', accessorKey: 'stock', sortable: true, cell: p => <span className={p.stock < p.min ? 'text-danger font-bold' : 'font-semibold'}>{p.stock}</span> },
      { header: 'Unit', accessorKey: 'unit', sortable: true },
      { header: 'Cost', accessorKey: 'costPrice', sortable: true, cell: p => formatProductPrice(p.costPrice || 0) },
      { header: 'Sell', accessorKey: 'price', sortable: true, cell: p => formatProductPrice(p.price) },
      { header: 'Min', accessorKey: 'min', sortable: true },
      { header: 'Status', accessorKey: 'status', cell: p => <Badge variant={p.stock < p.min ? 'danger' : 'success'}>{p.stock < p.min ? 'overdue' : 'active'}</Badge> }
    ];

    if (canAddProduct) {
      cols.push({
        header: 'Actions',
        width: 200,
        cell: p => (
          <div className="p-2">
            {receivingId === pid(p) ? (
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  value={receiveData.quantity}
                  onChange={e => setReceiveData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Qty"
                  className="px-2 py-1 text-xs border border-border dark:border-border-dark rounded bg-bg dark:bg-bg-dark"
                />
                <input
                  type="number"
                  value={receiveData.unitCost}
                  onChange={e => setReceiveData(prev => ({ ...prev, unitCost: e.target.value }))}
                  placeholder="Unit Cost"
                  className="px-2 py-1 text-xs border border-border dark:border-border-dark rounded bg-bg dark:bg-bg-dark"
                />
                <div className="flex gap-1">
                  <Button size="xs" onClick={() => applyReceiveStock(pid(p))} className="flex-1">Save</Button>
                  <Button size="xs" variant="secondary" onClick={() => setReceivingId(null)} className="flex-1">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditForm(p)}>Edit</Button>
                {(role === 'supplier' || role === 'admin') && (
                  <Button size="sm" variant="secondary" onClick={() => setReceivingId(pid(p))}>Receive</Button>
                )}
              </div>
            )}
          </div>
        )
      });
    }
    return cols;
  }, [canAddProduct, receivingId, receiveData, role]);

  const sortedProducts = useMemo(() => sortProductsBySize(products), [products]);
  const criticalProducts = products.filter(p => p.stock < p.min);

  if (loading) {
    return (
      <div className="page-enter flex flex-col gap-5">
        <SectionHeader title="Inventory" />
        <SkeletonTable rows={6} cols={9} />
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-full">
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
        <div className="card-premium mb-5 border-gold animate-fadeIn">
          <Typography variant="heading" size="lg" className="mb-4">
            {editingProduct ? 'Edit Product' : 'New Product Entry'}
          </Typography>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Product Name" required {...register('name')} error={errors.name} />
              <Input label="Category" required {...register('cat')} error={errors.cat} />
              <Input label="Stock" type="number" required {...register('stock', { valueAsNumber: true })} error={errors.stock} />
              <Input label="Unit (e.g. Bottle)" {...register('unit')} error={errors.unit} />
              <Input label="Selling Price (PKR)" type="number" required {...register('price', { valueAsNumber: true })} error={errors.price} />
              <Input label="Cost Price (PKR)" type="number" {...register('costPrice', { valueAsNumber: true })} error={errors.costPrice} />
              <Input label="Min Stock Level" type="number" {...register('min', { valueAsNumber: true })} error={errors.min} />
              
              <div className="lg:col-span-4">
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
            </div>
            <div className="flex gap-3">
              <Button type="submit" isLoading={saving}>
                {saving
                  ? uploadProgress !== null
                    ? `Uploading… ${uploadProgress}%`
                    : 'Saving…'
                  : editingProduct
                    ? 'Save Changes'
                    : 'Save Product'}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {!sortedProducts.length && !error ? (
        <ApiEmpty message="No products in inventory match your filters. Run npm run server:seed to reset." />
      ) : (
        <>
          <Typography variant="caption" className="mb-3 font-semibold block">
            Showing {sortedProducts.length} products
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {sortedProducts.slice(0, 4).map(p => (
              <ProductCard key={pid(p)} product={p} showStock />
            ))}
          </div>

          <div className="flex-1 min-h-[400px]">
            <DataGrid 
              columns={columns}
              data={sortedProducts}
              selectable={false}
              emptyMessage="No products in inventory match your filters."
              rowHeight={64}
            />
          </div>
        </>
      )}

      {criticalProducts.length > 0 && (
        <Alert variant="danger" className="mt-4 shadow-sm" title="Critical Stock Warnings">
          {criticalProducts.map(p => p.name).join(', ')} (Below Threshold)
        </Alert>
      )}
    </div>
  );
}
