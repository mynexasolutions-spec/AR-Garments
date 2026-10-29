'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Plus, Search, Upload, Trash2, Edit2,
  ImageIcon, Loader2, X, Sparkles, Flame, RefreshCw, Star,
  Info, Truck, ArrowLeft, Check, Box, Tag, Ruler,
  Shirt, DollarSign, Scale, Percent, FileCheck,
  Link as LinkIcon, Home, Crown, Award, Store,
  Layers, Package, CheckCircle2, Bookmark
} from 'lucide-react';
import { Product } from '@/lib/adminData';
import { useToast } from '@/context/ToastContext';

const DEFAULT_CATEGORIES = [
  'All', 'Sarees', 'Suits & Dress Material',
  'Dupatta Sets', 'Men Fashion', 'Kids Fashion',
];

const COMMON_BRANDS = [
  'AR Garment',
  'Kashvi Creations',
  'Samyakk',
  'Manyavar',
  'Biba',
  'FabIndia',
  'Craftsvilla',
  'Surat Wholesalers',
];

const COMMON_HSN_CODES = [
  { code: '6204', desc: "Women's Sarees, Suits, Kurtis, Dress Material (Woven)" },
  { code: '5208', desc: 'Cotton Sarees & Cotton Fabrics' },
  { code: '5407', desc: 'Silk, Georgette, Chiffon & Synthetic Fabrics' },
  { code: '6211', desc: 'Ethnic Dupattas, Shawls & Traditional Wear' },
  { code: '6203', desc: "Men's Kurta, Sherwani & Ethnic Wear" },
  { code: '6209', desc: "Kids' Ethnic Wear & Garments" },
];

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  active: boolean;
};

type CustomSpec = {
  label: string;
  value: string;
};

// Full Variant type matching the new product_variants table and Screenshot 1
export type VariantRecord = {
  id: string;
  variantType: 'set_size' | 'individual';
  size: string;
  piecesPerSet: number;
  pricePerPiece: number;
  totalSetPrice: number;
  availableSets: number;
  totalStockPieces: number;
  availablePieces: number;
  weight: string;
  weightUnit: string;
  gstRate: string;
  skuId: string;
  purchasePrice: number;
  hsnCode: string;
  colour: string;
  fabric: string;
  work: string;
  fitShape: string;
  sleeveLength: string;
  length: string;
  customSpecifications: CustomSpec[];
};

type ProductFormData = {
  id?: string;
  name: string;
  categoryId: string;
  category: string;
  subcategoryId: string;
  brand: string;
  description: string;
  image: string;
  images: string[];
  fabric: string;
  colour: string;
  work: string;
  length: string;
  occasion: string;
  fitShape: string;
  sleeveLength: string;
  customSpecifications: CustomSpec[];
  size: string;
  piecesPerSet: number;
  pricePerPiece: number;
  totalSetPrice: number;
  purchasePrice: number;
  totalStockPieces: number;
  stockSets: number;
  weight: string;
  weightUnit: string;
  gstRate: string;
  hsnCode: string;
  variants: VariantRecord[];
  shippingCare: string;
  youtubeUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isPremium: boolean;
  isGold: boolean;
  active: boolean;
  // Delivery Type (per-product override)
  deliveryType: 'standard' | 'low_margin';
  deliveryChargeAmount: number;
};

const initialFormData = (): ProductFormData => ({
  name: '',
  categoryId: '',
  category: 'Sarees',
  subcategoryId: '',
  brand: 'AR Garment',
  description: '',
  image: '',
  images: [],
  fabric: '',
  colour: '',
  work: '',
  length: '',
  occasion: '',
  fitShape: '',
  sleeveLength: '',
  customSpecifications: [],
  size: 'Free Size',
  piecesPerSet: 6,
  pricePerPiece: 135,
  totalSetPrice: 810,
  purchasePrice: 0,
  totalStockPieces: 150,
  stockSets: 25,
  weight: '5',
  weightUnit: 'kg',
  gstRate: '5%',
  hsnCode: '6204',
  variants: [],
  shippingCare: 'Dispatch Time: Dispatched within 24 hours | Wash Care: Dry Clean Recommended | Returns: 7-day easy exchange & return',
  youtubeUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  isNewArrival: true,
  isBestSeller: false,
  isPremium: false,
  isGold: false,
  active: true,
  deliveryType: 'standard',
  deliveryChargeAmount: 0,
});

const defaultVariant = (parentForm: ProductFormData): VariantRecord => ({
  id: `var-${Date.now()}`,
  variantType: 'set_size',
  size: parentForm.size || 'Free Size',
  piecesPerSet: parentForm.piecesPerSet || 6,
  pricePerPiece: parentForm.pricePerPiece || 135,
  totalSetPrice: (parentForm.piecesPerSet || 6) * (parentForm.pricePerPiece || 135),
  availableSets: parentForm.stockSets || 25,
  totalStockPieces: (parentForm.piecesPerSet || 6) * (parentForm.stockSets || 25),
  availablePieces: 25,
  weight: parentForm.weight || '5',
  weightUnit: parentForm.weightUnit || 'kg',
  gstRate: parentForm.gstRate || '5%',
  skuId: `SKU-${Date.now().toString().slice(-4)}`,
  purchasePrice: parentForm.purchasePrice || 0,
  hsnCode: parentForm.hsnCode || '6204',
  colour: parentForm.colour || 'Black',
  fabric: parentForm.fabric || 'Cotton Blend',
  work: parentForm.work || 'Printed',
  fitShape: parentForm.fitShape || 'Regular Fit',
  sleeveLength: parentForm.sleeveLength || 'Half Sleeve',
  length: parentForm.length || 'Standard',
  customSpecifications: [],
});

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Page view mode: 'list' (catalog table) or 'form' (add/edit form)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData());

  // Variant Modal
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState<VariantRecord>(defaultVariant(initialFormData()));
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

  // Upload & Helper modals
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showHsnModal, setShowHsnModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load Products ──────────────────────────────────────────────────────────
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      const mapped: Product[] = (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({
        id: String(d.id),
        name: String(d.name || ''),
        price: String(d.price || ''),
        numericPrice: Number(d.numeric_price) || 0,
        category: String(d.category || ''),
        categoryId: d.category_id ? String(d.category_id) : undefined,
        subcategoryId: d.subcategory_id ? String(d.subcategory_id) : null,
        brand: d.brand ? String(d.brand) : '',
        image: String(d.image || ''),
        images: Array.isArray(d.images) && d.images.length > 0
          ? (d.images as string[])
          : (d.image ? [String(d.image)] : []),
        description: String(d.description || ''),
        specification: String(d.specification || ''),
        shippingCare: String(d.shipping_care || ''),
        stock: Number(d.stock) || 0,
        active: Boolean(d.active !== false),
        isNewArrival: Boolean(d.is_new_arrival),
        isBestSeller: Boolean(d.is_best_seller),
        isPremium: Boolean(d.is_premium),
        isGold: Boolean(d.is_gold),
        order: Number(d.sort_order) || 0,
        fabric: d.fabric ? String(d.fabric) : '',
        colour: d.colour ? String(d.colour) : '',
        work: d.work ? String(d.work) : '',
        length: d.length ? String(d.length) : '',
        occasion: d.occasion ? String(d.occasion) : '',
        fitShape: d.fit_shape ? String(d.fit_shape) : '',
        sleeveLength: d.sleeve_length ? String(d.sleeve_length) : '',
        size: d.size ? String(d.size) : 'Free Size',
        piecesPerSet: Number(d.pieces_per_set) || 1,
        pricePerPiece: Number(d.price_per_piece) || 0,
        totalSetPrice: Number(d.total_set_price) || 0,
        purchasePrice: Number(d.purchase_price) || 0,
        totalStockPieces: Number(d.total_stock_pieces) || 0,
        weight: d.weight ? String(d.weight) : '',
        weightUnit: d.weight_unit ? String(d.weight_unit) : 'kg',
        gstRate: d.gst_rate ? String(d.gst_rate) : '5%',
        hsnCode: d.hsn_code ? String(d.hsn_code) : '',
        youtubeUrl: String(d.youtube_url || ''),
        facebookUrl: String(d.facebook_url || ''),
        instagramUrl: String(d.instagram_url || ''),
        deliveryType: (d.delivery_type === 'low_margin' ? 'low_margin' : 'standard') as 'standard' | 'low_margin',
        deliveryChargeAmount: Number(d.delivery_charge_amount) || 0,
      }));
      setProducts(mapped);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load products.';
      toast.error(msg, { title: 'Load Failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    fetch('/api/categories?active=true')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CategoryOption[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const parents = data.filter((c) => !c.parentId);
          setCategoriesList(['All', ...parents.map((c) => c.name)]);
          setCategoryOptions(data);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Open Form ─────────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingProduct(null);
    const firstParent = categoryOptions.find((c) => !c.parentId);
    setFormData({
      ...initialFormData(),
      category: firstParent?.name || 'Sarees',
      categoryId: firstParent?.id || '',
    });
    setUploadError('');
    setSaveError('');
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditForm = async (p: Product) => {
    setEditingProduct(p);
    const existingImages = Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : (p.image ? [p.image] : []);

    const pieces = p.piecesPerSet || 6;
    const ppp = p.pricePerPiece || (p.numericPrice ? Math.round(p.numericPrice / pieces) : 135);
    const totalSet = p.totalSetPrice || (pieces * ppp);
    const totalStock = p.totalStockPieces || (p.stock || 10) * pieces;

    // Load any existing variants from product_variants table
    let loadedVariants: VariantRecord[] = [];
    try {
      const res = await fetch(`/api/products/${p.id}/variants`);
      if (res.ok) {
        const vData = await res.json();
        if (Array.isArray(vData) && vData.length > 0) {
          loadedVariants = vData.map((v: Record<string, unknown>) => ({
            id: String(v.id),
            variantType: (v.variant_type as 'set_size' | 'individual') || 'set_size',
            size: String(v.size || 'Free Size'),
            piecesPerSet: Number(v.pieces_per_set) || pieces,
            pricePerPiece: Number(v.price_per_piece) || ppp,
            totalSetPrice: Number(v.total_set_price) || totalSet,
            availableSets: Number(v.available_sets) || 25,
            totalStockPieces: Number(v.total_stock_pieces) || totalStock,
            availablePieces: Number(v.available_pieces) || 25,
            weight: String(v.weight || '5'),
            weightUnit: String(v.weight_unit || 'kg'),
            gstRate: String(v.gst_rate || '5%'),
            skuId: String(v.sku_id || ''),
            purchasePrice: Number(v.purchase_price) || 0,
            hsnCode: String(v.hsn_code || '6204'),
            colour: String(v.colour || 'Black'),
            fabric: String(v.fabric || 'Cotton Blend'),
            work: String(v.work || 'Printed'),
            fitShape: String(v.fit_shape || 'Regular Fit'),
            sleeveLength: String(v.sleeve_length || 'Half Sleeve'),
            length: String(v.length || 'Standard'),
            customSpecifications: Array.isArray(v.custom_specifications) ? v.custom_specifications : [],
          }));
        }
      }
    } catch {
      // ignore
    }

    setFormData({
      id: p.id,
      name: p.name || '',
      category: p.category || 'Sarees',
      categoryId: p.categoryId
        || categoryOptions.find((c) => !c.parentId && c.name === p.category)?.id
        || '',
      subcategoryId: p.subcategoryId || '',
      brand: p.brand || 'AR Garment',
      description: p.description || '',
      image: p.image || (existingImages[0] ?? ''),
      images: existingImages,
      fabric: p.fabric || '',
      colour: p.colour || '',
      work: p.work || '',
      length: p.length || '',
      occasion: p.occasion || '',
      fitShape: p.fitShape || '',
      sleeveLength: p.sleeveLength || '',
      customSpecifications: p.customSpecifications || [],
      size: p.size || 'Free Size',
      piecesPerSet: pieces,
      pricePerPiece: ppp,
      totalSetPrice: totalSet,
      purchasePrice: p.purchasePrice || 0,
      totalStockPieces: totalStock,
      stockSets: Math.floor(totalStock / (pieces || 1)) || 25,
      weight: p.weight || '5',
      weightUnit: p.weightUnit || 'kg',
      gstRate: p.gstRate || '5%',
      hsnCode: p.hsnCode || '6204',
      variants: loadedVariants,
      shippingCare: p.shippingCare || '',
      youtubeUrl: p.youtubeUrl || '',
      facebookUrl: p.facebookUrl || '',
      instagramUrl: p.instagramUrl || '',
      isNewArrival: Boolean(p.isNewArrival),
      isBestSeller: Boolean(p.isBestSeller),
      isPremium: Boolean(p.isPremium),
      isGold: Boolean(p.isGold),
      active: p.active !== false,
      deliveryType: (p.deliveryType === 'low_margin' ? 'low_margin' : 'standard') as 'standard' | 'low_margin',
      deliveryChargeAmount: p.deliveryChargeAmount ?? 0,
    });
    setUploadError('');
    setSaveError('');
    setViewMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Image Upload via Server ImageKit ──────────────────────────────────────
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('folder', '/products');
        const cleanName = (formData.name || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-');
        uploadData.append('fileName', `${cleanName}_${Date.now()}`);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Failed to upload image to ImageKit');
        }
        return data.url as string;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData((prev) => {
        const combined = [...prev.images, ...uploadedUrls];
        return {
          ...prev,
          images: combined,
          image: prev.image || combined[0] || '',
        };
      });

      toast.success(
        uploadedUrls.length === 1
          ? 'Image uploaded to ImageKit CDN!'
          : `${uploadedUrls.length} images uploaded to ImageKit CDN!`,
        { title: 'ImageKit Upload' }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setUploadError(msg);
      toast.error(msg, { title: 'Upload Failed' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const url = imageUrlInput.trim();
    setFormData((prev) => {
      const combined = [...prev.images, url];
      return {
        ...prev,
        images: combined,
        image: prev.image || combined[0] || '',
      };
    });
    setImageUrlInput('');
  };

  const removeImage = (urlToRemove: string) => {
    setFormData((prev) => {
      const remaining = prev.images.filter((img) => img !== urlToRemove);
      return {
        ...prev,
        images: remaining,
        image: prev.image === urlToRemove ? (remaining[0] || '') : prev.image,
      };
    });
  };

  const setPrimaryImage = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  // ─── Custom Specifications ────────────────────────────────────────────────
  const addCustomSpec = () => {
    setFormData((prev) => ({
      ...prev,
      customSpecifications: [...prev.customSpecifications, { label: '', value: '' }],
    }));
  };

  const updateCustomSpec = (index: number, field: 'label' | 'value', val: string) => {
    setFormData((prev) => {
      const updated = [...prev.customSpecifications];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, customSpecifications: updated };
    });
  };

  const removeCustomSpec = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customSpecifications: prev.customSpecifications.filter((_, i) => i !== index),
    }));
  };

  // ─── Variant Modal Handlers (Screenshot 1) ────────────────────────────────
  const openNewVariantModal = () => {
    setCurrentVariant(defaultVariant(formData));
    setEditingVariantIndex(null);
    setVariantModalOpen(true);
  };

  const openEditVariantModal = (index: number) => {
    setCurrentVariant({ ...formData.variants[index] });
    setEditingVariantIndex(index);
    setVariantModalOpen(true);
  };

  const handleSaveVariantModal = () => {
    const updated = [...formData.variants];
    if (editingVariantIndex !== null && editingVariantIndex >= 0) {
      updated[editingVariantIndex] = currentVariant;
    } else {
      updated.push({ ...currentVariant, id: `var-${Date.now()}` });
    }
    setFormData({ ...formData, variants: updated });
    setVariantModalOpen(false);
    toast.success('Variant configured successfully!', { title: 'Variant Added' });
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
    toast.info('Variant removed');
  };

  // Variant calculations
  const handleVariantPiecesChange = (pieces: number) => {
    const validPieces = Math.max(1, pieces);
    const totalSet = validPieces * currentVariant.pricePerPiece;
    const totalStock = validPieces * currentVariant.availableSets;
    setCurrentVariant((prev) => ({
      ...prev,
      piecesPerSet: validPieces,
      totalSetPrice: totalSet,
      totalStockPieces: totalStock,
    }));
  };

  const handleVariantPricePerPieceChange = (ppp: number) => {
    const validPpp = Math.max(0, ppp);
    const totalSet = currentVariant.piecesPerSet * validPpp;
    setCurrentVariant((prev) => ({
      ...prev,
      pricePerPiece: validPpp,
      totalSetPrice: totalSet,
    }));
  };

  const handleVariantSetsChange = (sets: number) => {
    const validSets = Math.max(0, sets);
    const totalStock = currentVariant.piecesPerSet * validSets;
    setCurrentVariant((prev) => ({
      ...prev,
      availableSets: validSets,
      totalStockPieces: totalStock,
    }));
  };

  // ─── Main Form calculations ───────────────────────────────────────────────
  const handlePiecesChange = (pieces: number) => {
    const validPieces = Math.max(1, pieces);
    const totalSet = validPieces * formData.pricePerPiece;
    const totalStock = validPieces * formData.stockSets;
    setFormData((prev) => ({
      ...prev,
      piecesPerSet: validPieces,
      totalSetPrice: totalSet,
      totalStockPieces: totalStock,
    }));
  };

  const handlePricePerPieceChange = (ppp: number) => {
    const validPpp = Math.max(0, ppp);
    const totalSet = formData.piecesPerSet * validPpp;
    setFormData((prev) => ({
      ...prev,
      pricePerPiece: validPpp,
      totalSetPrice: totalSet,
    }));
  };

  const handleStockSetsChange = (sets: number) => {
    const validSets = Math.max(0, sets);
    const totalStock = formData.piecesPerSet * validSets;
    setFormData((prev) => ({
      ...prev,
      stockSets: validSets,
      totalStockPieces: totalStock,
    }));
  };

  // ─── Save / Submit Product ────────────────────────────────────────────────
  const saveProduct = async (statusActive = true) => {
    if (!formData.name.trim()) {
      setSaveError('Product Name is required.');
      toast.warning('Please enter a product name.', { title: 'Missing Name' });
      return;
    }
    if (!formData.categoryId) {
      setSaveError('Please select a Parent Category.');
      toast.warning('Parent Category is required.', { title: 'Missing Category' });
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const finalPrice = `₹${formData.totalSetPrice || formData.pricePerPiece || 0}`;
      const numericPrice = formData.totalSetPrice || formData.pricePerPiece || 0;

      const payload = {
        name: formData.name.trim(),
        price: finalPrice,
        numericPrice,
        category: formData.category,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId || null,
        brand: formData.brand.trim() || 'AR Garment',
        image: formData.image || formData.images[0] || '',
        images: formData.images,
        description: formData.description,
        specification: formData.fabric
          ? `Fabric: ${formData.fabric} | Colour: ${formData.colour} | Work: ${formData.work} | Occasion: ${formData.occasion}`
          : '',
        shippingCare: formData.shippingCare,
        stock: formData.stockSets || 10,
        active: statusActive,
        isNewArrival: formData.isNewArrival,
        isBestSeller: formData.isBestSeller,
        isPremium: formData.isPremium,
        isGold: formData.isGold,
        order: editingProduct ? editingProduct.order : 0,
        fabric: formData.fabric,
        colour: formData.colour,
        work: formData.work,
        length: formData.length,
        occasion: formData.occasion,
        fitShape: formData.fitShape,
        sleeveLength: formData.sleeveLength,
        customSpecifications: formData.customSpecifications,
        size: formData.size,
        piecesPerSet: formData.piecesPerSet,
        pricePerPiece: formData.pricePerPiece,
        totalSetPrice: formData.totalSetPrice,
        purchasePrice: formData.purchasePrice,
        totalStockPieces: formData.totalStockPieces,
        weight: formData.weight,
        weightUnit: formData.weightUnit,
        gstRate: formData.gstRate,
        hsnCode: formData.hsnCode,
        variants: formData.variants,
        youtubeUrl: formData.youtubeUrl,
        facebookUrl: formData.facebookUrl,
        instagramUrl: formData.instagramUrl,
        deliveryType: formData.deliveryType,
        deliveryChargeAmount: formData.deliveryChargeAmount,
      };

      const url = editingProduct ? `/api/products?id=${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save product');
      }

      const savedProductId = (resData.id || editingProduct?.id) as string;

      // Save variants into the product_variants table
      // Always delete existing variants first, then re-insert (handles both add + edit)
      if (savedProductId) {
        try {
          // Step 1: Delete all existing variants for this product
          await fetch(`/api/products/${savedProductId}/variants`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          });

          // Step 2: Insert new variants (only if any exist)
          if (formData.variants.length > 0) {
            const variantRes = await fetch(`/api/products/${savedProductId}/variants`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData.variants),
            });
            if (!variantRes.ok) {
              const variantErr = await variantRes.json().catch(() => ({}));
              console.error('Variant save error:', variantErr);
              toast.warning('Product saved but variants could not be stored. Check the product_variants table exists.', { title: 'Variant Warning' });
            }
          }
        } catch (variantErr) {
          console.error('Variant sync error:', variantErr);
          toast.warning('Product saved but variant sync failed. Check console.', { title: 'Variant Warning' });
        }
      }

      toast.success(
        editingProduct ? 'Product updated successfully!' : 'New product published to catalog!',
        { title: 'Success' }
      );

      setViewMode('list');
      await loadProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error saving product';
      setSaveError(msg);
      toast.error(msg, { title: 'Save Failed' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product removed from catalog.', { title: 'Deleted' });
    } catch {
      toast.error('Failed to delete product.', { title: 'Delete Failed' });
    }
  };

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.price.includes(searchQuery);
    return matchCat && matchSearch;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: ADD / EDIT PRODUCT FULL FORM
  // ══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'form') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-20">

        {/* ══════════════════════════════════════════════════════════════════
            ADD VARIANT MODAL (Pixel-Perfect Match to Screenshot 1)
        ══════════════════════════════════════════════════════════════════ */}
        {variantModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-gray-100 my-8 space-y-5">

              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                    <Box size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Add Variant</h2>
                    <p className="text-xs text-gray-400">
                      Manage size, price, inventory, weight and other details for your product variant.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Layers size={13} /> Multi Variant Support
                  </span>
                  <button
                    type="button"
                    onClick={() => setVariantModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* 1. Variant Type Selection (Radio Cards) */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800 mb-2">
                  <span className="text-emerald-700">⸬</span> Variant Type
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Inventory (N) */}
                  <div
                    onClick={() => setCurrentVariant({ ...currentVariant, variantType: 'individual' })}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      currentVariant.variantType === 'individual'
                        ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      currentVariant.variantType === 'individual' ? 'border-emerald-700' : 'border-gray-300'
                    }`}>
                      {currentVariant.variantType === 'individual' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-700" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      <Box size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Inventory (N)</p>
                      <p className="text-[11px] font-semibold text-gray-500">Individual Pieces</p>
                      <p className="text-[10px] text-gray-400">Manage stock in single pieces.</p>
                    </div>
                  </div>

                  {/* Option 2: Set Size (Selected by default) */}
                  <div
                    onClick={() => setCurrentVariant({ ...currentVariant, variantType: 'set_size' })}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      currentVariant.variantType === 'set_size'
                        ? 'border-emerald-600 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-600/30'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      currentVariant.variantType === 'set_size' ? 'border-emerald-700' : 'border-gray-300'
                    }`}>
                      {currentVariant.variantType === 'set_size' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-700" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Set Size</p>
                      <p className="text-[11px] font-semibold text-emerald-800">Fixed Pieces Per Set.</p>
                      <p className="text-[10px] text-gray-400">Enter pieces per set manually.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Set Size Inputs Form (Screenshot 1 Active Section) */}
              {currentVariant.variantType === 'set_size' ? (
                <div className="space-y-4">
                  {/* Row 1: Size, Pieces Per Set, Price Per Piece */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <Tag size={13} className="text-emerald-700" /> Size
                      </label>
                      <select
                        value={currentVariant.size}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, size: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
                      >
                        <option value="Free Size">Free Size</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="3XL">3XL</option>
                        <option value="Set of All Sizes">Set of All Sizes</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <Box size={13} className="text-emerald-700" /> Pieces Per Set
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={currentVariant.piecesPerSet}
                        onChange={(e) => handleVariantPiecesChange(parseInt(e.target.value) || 1)}
                        placeholder="6"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Manually enter pieces (e.g. 6, 12, 18, 24)</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <DollarSign size={13} className="text-emerald-700" /> Price Per Piece (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={currentVariant.pricePerPiece}
                        onChange={(e) => handleVariantPricePerPieceChange(parseFloat(e.target.value) || 0)}
                        placeholder="135"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
                      />
                    </div>
                  </div>

                  {/* Row 2: Cards (Total Set Price, Total Stock Pieces, Available Sets) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5">
                      <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase">
                        <Tag size={13} /> Total Set Price
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-black text-emerald-700">
                          ₹{currentVariant.totalSetPrice}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-800/80">
                        ({currentVariant.piecesPerSet} pcs × ₹{currentVariant.pricePerPiece})
                      </p>
                    </div>

                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5">
                      <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase">
                        <Box size={13} /> Total Stock (Pieces)
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-black text-emerald-700">
                          {currentVariant.totalStockPieces}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-800/80">
                        ({currentVariant.piecesPerSet} pcs × {currentVariant.availableSets} sets)
                      </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 flex flex-col justify-between">
                      <label className="flex items-center gap-1.5 text-gray-700 text-[11px] font-bold uppercase mb-1">
                        <Box size={13} className="text-emerald-700" /> Available Sets
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={currentVariant.availableSets}
                        onChange={(e) => handleVariantSetsChange(parseInt(e.target.value) || 0)}
                        placeholder="25"
                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#083028]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Total sets available in stock.</p>
                    </div>
                  </div>

                  {/* Row 3: Weight, GST, SKU ID, Purchase Price, HSN Code */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 mb-1">
                        <Scale size={11} className="text-emerald-700" /> Weight
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={currentVariant.weight}
                          onChange={(e) => setCurrentVariant({ ...currentVariant, weight: e.target.value })}
                          placeholder="5"
                          className="w-14 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        />
                        <select
                          value={currentVariant.weightUnit}
                          onChange={(e) => setCurrentVariant({ ...currentVariant, weightUnit: e.target.value })}
                          className="flex-1 px-1 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 mb-1">
                        <Percent size={11} className="text-emerald-700" /> GST (%)
                      </label>
                      <select
                        value={currentVariant.gstRate}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, gstRate: e.target.value })}
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="0%">0%</option>
                        <option value="5%">5%</option>
                        <option value="12%">12%</option>
                        <option value="18%">18%</option>
                        <option value="28%">28%</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 mb-1">
                        <Tag size={11} className="text-emerald-700" /> SKU ID
                      </label>
                      <input
                        type="text"
                        value={currentVariant.skuId}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, skuId: e.target.value })}
                        placeholder="SKU001"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                      />
                      <p className="text-[9px] text-gray-400 mt-0.5">Enter SKU ID</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 mb-1">
                        <DollarSign size={11} className="text-emerald-700" /> Purchase Price (₹)
                      </label>
                      <input
                        type="number"
                        value={currentVariant.purchasePrice || ''}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, purchasePrice: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter purchase"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 mb-1">
                        <FileCheck size={11} className="text-emerald-700" /> HSN Code
                      </label>
                      <input
                        type="text"
                        value={currentVariant.hsnCode}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, hsnCode: e.target.value })}
                        placeholder="HSN code"
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Individual Pieces Section */
                <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <div>
                      <p className="text-xs font-bold text-gray-900">Inventory (N) — Individual Pieces</p>
                      <p className="text-[11px] text-gray-500">Set available pieces and manage stock.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Purchase Price"
                        value={currentVariant.purchasePrice || ''}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, purchasePrice: parseFloat(e.target.value) || 0 })}
                        className="w-28 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                      />
                      <select
                        value={currentVariant.gstRate}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, gstRate: e.target.value })}
                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                      >
                        <option value="5%">5%</option>
                        <option value="12%">12%</option>
                        <option value="18%">18%</option>
                      </select>
                      <input
                        type="text"
                        placeholder="HSN"
                        value={currentVariant.hsnCode}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, hsnCode: e.target.value })}
                        className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">Size</label>
                      <input
                        type="text"
                        value={currentVariant.size}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, size: e.target.value })}
                        placeholder="Size"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">Price Per Piece (₹)</label>
                      <input
                        type="number"
                        value={currentVariant.pricePerPiece}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, pricePerPiece: parseFloat(e.target.value) || 0 })}
                        placeholder="135"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">Available Pieces</label>
                      <input
                        type="number"
                        value={currentVariant.availablePieces}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, availablePieces: parseInt(e.target.value) || 0 })}
                        placeholder="25"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">Weight</label>
                      <input
                        type="text"
                        value={currentVariant.weight}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, weight: e.target.value })}
                        placeholder="5 kg"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500">SKU ID</label>
                      <input
                        type="text"
                        value={currentVariant.skuId}
                        onChange={(e) => setCurrentVariant({ ...currentVariant, skuId: e.target.value })}
                        placeholder="SKU001"
                        className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Variant Details (Specifications) */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark size={15} className="text-emerald-700" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Variant Details</p>
                      <p className="text-[10px] text-gray-400">Add product specifications for this variant.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentVariant({
                        ...currentVariant,
                        customSpecifications: [
                          ...currentVariant.customSpecifications,
                          { label: '', value: '' },
                        ],
                      });
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg"
                  >
                    <Plus size={12} /> Add Specification
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 mb-1">
                      <Tag size={10} className="text-emerald-700" /> Colour
                    </label>
                    <input
                      type="text"
                      value={currentVariant.colour}
                      onChange={(e) => setCurrentVariant({ ...currentVariant, colour: e.target.value })}
                      placeholder="Black"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 mb-1">
                      <Box size={10} className="text-emerald-700" /> Fabric
                    </label>
                    <input
                      type="text"
                      value={currentVariant.fabric}
                      onChange={(e) => setCurrentVariant({ ...currentVariant, fabric: e.target.value })}
                      placeholder="Cotton Blend"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 mb-1">
                      <Sparkles size={10} className="text-emerald-700" /> Work
                    </label>
                    <input
                      type="text"
                      value={currentVariant.work}
                      onChange={(e) => setCurrentVariant({ ...currentVariant, work: e.target.value })}
                      placeholder="Printed"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 mb-1">
                      <Shirt size={10} className="text-emerald-700" /> Fit / Shape
                    </label>
                    <input
                      type="text"
                      value={currentVariant.fitShape}
                      onChange={(e) => setCurrentVariant({ ...currentVariant, fitShape: e.target.value })}
                      placeholder="Regular Fit"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 mb-1">
                      <Shirt size={10} className="text-emerald-700" /> Sleeve Length
                    </label>
                    <input
                      type="text"
                      value={currentVariant.sleeveLength}
                      onChange={(e) => setCurrentVariant({ ...currentVariant, sleeveLength: e.target.value })}
                      placeholder="Half Sleeve"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 mb-1">
                      <Ruler size={10} className="text-emerald-700" /> Length
                    </label>
                    <input
                      type="text"
                      value={currentVariant.length}
                      onChange={(e) => setCurrentVariant({ ...currentVariant, length: e.target.value })}
                      placeholder="Standard"
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Custom specs on variant */}
                {currentVariant.customSpecifications.map((cs, cIdx) => (
                  <div key={cIdx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={cs.label}
                      onChange={(e) => {
                        const copy = [...currentVariant.customSpecifications];
                        copy[cIdx].label = e.target.value;
                        setCurrentVariant({ ...currentVariant, customSpecifications: copy });
                      }}
                      placeholder="Specification name"
                      className="w-1/3 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
                    />
                    <input
                      type="text"
                      value={cs.value}
                      onChange={(e) => {
                        const copy = [...currentVariant.customSpecifications];
                        copy[cIdx].value = e.target.value;
                        setCurrentVariant({ ...currentVariant, customSpecifications: copy });
                      }}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentVariant({
                          ...currentVariant,
                          customSpecifications: currentVariant.customSpecifications.filter((_, i) => i !== cIdx),
                        });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Modal Footer Actions (Screenshot 1 Bottom) */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveVariantModal();
                    openNewVariantModal();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition"
                >
                  <Plus size={14} /> Add Another Variant
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVariantModalOpen(false)}
                    className="px-5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVariantModal}
                    className="inline-flex items-center gap-1.5 px-6 py-2 bg-[#083028] hover:bg-[#051e19] text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    <Check size={14} /> Save Variant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HSN Modal Picker */}
        {showHsnModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileCheck size={16} className="text-[#083028]" />
                  Select Garment HSN Code
                </h3>
                <button onClick={() => setShowHsnModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {COMMON_HSN_CODES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, hsnCode: item.code });
                      setShowHsnModal(false);
                      toast.info(`HSN Code ${item.code} selected`);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-[#083028] hover:bg-emerald-50/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#083028]">{item.code}</span>
                      <span className="text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">Select →</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 mb-1 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Products
            </button>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Fill in the details below to add a new product to your store.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveProduct(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-xs"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveProduct(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#083028] hover:bg-[#051e19] text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editingProduct ? 'Update Product' : 'Publish Product'}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
            ❌ {saveError}
          </div>
        )}

        {/* ════ SECTION 1: PRODUCT DETAILS (No Bold/Italic/Underline Toolbar as in SS3) ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
              <Box size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Product Details</h2>
              <p className="text-[11px] text-gray-400">Enter basic product information.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Parent Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Parent Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => {
                  const selected = categoryOptions.find((c) => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    categoryId: e.target.value,
                    category: selected?.name || '',
                    subcategoryId: '',
                  });
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition"
              >
                <option value="">Select parent category</option>
                {categoryOptions.filter((c) => !c.parentId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Subcategory <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                disabled={!formData.categoryId}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition disabled:opacity-50"
              >
                <option value="">Select subcategory</option>
                {categoryOptions
                  .filter((c) => c.parentId === formData.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Brand</label>
              <div className="relative">
                <input
                  type="text"
                  list="brand-list"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Select brand or enter brand"
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition"
                />
                <datalist id="brand-list">
                  {COMMON_BRANDS.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Product Description - Clean Textarea without bold/italic toolbar (SS3) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Product Description <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#083028]">
              <textarea
                rows={4}
                required
                maxLength={8000}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write product description here..."
                className="w-full p-3.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-y leading-relaxed"
              />
              <div className="px-3 py-1.5 bg-gray-50/50 border-t border-gray-100 text-right text-[11px] text-gray-400">
                {formData.description.length}/8000
              </div>
            </div>
          </div>
        </div>

        {/* ════ SECTION 2: PRODUCT IMAGES ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Product Images</h2>
              <p className="text-[11px] text-gray-400">Upload product images (drag &amp; drop or click to browse).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="lg:col-span-2 border-2 border-dashed border-gray-300 hover:border-[#083028] bg-gray-50/50 hover:bg-emerald-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-emerald-700 mb-2">
                <Upload size={20} />
              </div>
              <p className="text-xs font-bold text-gray-800 mb-0.5">Upload Product Image</p>
              <p className="text-[11px] text-gray-400">Click to upload or drag and drop (.JPG, .PNG, .WEBP - Max 5MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/40 space-y-2">
              <p className="text-xs font-bold text-gray-700">Or Paste Image URL</p>
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://...image.jpg"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#083028]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="w-full py-2 bg-[#083028] hover:bg-[#051e19] text-white text-xs font-semibold rounded-xl transition"
              >
                + Add Image URL
              </button>
            </div>
          </div>

          {isUploading && (
            <p className="text-xs text-emerald-700 flex items-center gap-2 font-medium">
              <Loader2 size={14} className="animate-spin" /> Uploading image(s) to ImageKit CDN...
            </p>
          )}
          {uploadError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">⚠️ {uploadError}</p>
          )}

          {formData.images.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-700">
                  Uploaded Gallery ({formData.images.length} photos) — Click star to set main:
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 rounded-xl transition"
                >
                  <Plus size={13} /> Add More Images
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {formData.images.map((imgUrl, index) => {
                  const isMain = formData.image === imgUrl || (!formData.image && index === 0);
                  return (
                    <div
                      key={imgUrl + index}
                      className={`relative group rounded-xl overflow-hidden border-2 bg-white p-1 transition-all ${
                        isMain ? 'border-emerald-700 shadow-sm ring-2 ring-emerald-700/20' : 'border-gray-200'
                      }`}
                    >
                      <div className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt="Product" className="w-full h-full object-cover" />
                      </div>

                      {isMain && (
                        <span className="absolute top-2 left-2 bg-[#083028] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                          <Star size={9} fill="currentColor" /> Main
                        </span>
                      )}

                      <div className="flex items-center justify-between mt-1 px-1">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(imgUrl)}
                            className="text-[10px] text-emerald-800 hover:underline font-semibold"
                          >
                            Set Main
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold">Default</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(imgUrl)}
                          className="text-gray-400 hover:text-red-600 p-0.5"
                          title="Remove image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ════ SECTION 3: PRODUCT SPECIFICATIONS ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
                <Box size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Product Specifications</h2>
                <p className="text-[11px] text-gray-400">Add product specifications for this product.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addCustomSpec}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 border border-emerald-300 bg-emerald-50 px-3 py-1.5 rounded-xl transition"
            >
              <Plus size={13} /> Add Specification
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Box size={13} className="text-emerald-700" /> Fabric
              </label>
              <input
                type="text"
                value={formData.fabric}
                onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                placeholder="Enter fabric (e.g. Cotton Blend)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Tag size={13} className="text-emerald-700" /> Colour
              </label>
              <input
                type="text"
                value={formData.colour}
                onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                placeholder="Enter colour (e.g. Black)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Sparkles size={13} className="text-emerald-700" /> Work
              </label>
              <input
                type="text"
                value={formData.work}
                onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                placeholder="Enter work (e.g. Printed, Zari)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Ruler size={13} className="text-emerald-700" /> Length
              </label>
              <input
                type="text"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                placeholder="Enter length (e.g. Standard Length)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Tag size={13} className="text-emerald-700" /> Occasion
              </label>
              <input
                type="text"
                value={formData.occasion}
                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                placeholder="Enter occasion (e.g. Casual/Wed)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Shirt size={13} className="text-emerald-700" /> Fit / Shape
              </label>
              <input
                type="text"
                value={formData.fitShape}
                onChange={(e) => setFormData({ ...formData, fitShape: e.target.value })}
                placeholder="Enter fit (e.g. Regular Fit)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>

            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/30 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Shirt size={13} className="text-emerald-700" /> Sleeve Length
              </label>
              <input
                type="text"
                value={formData.sleeveLength}
                onChange={(e) => setFormData({ ...formData, sleeveLength: e.target.value })}
                placeholder="Enter sleeve length (e.g. Half Sleeve / Full Sleeve)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#083028]"
              />
            </div>
          </div>

          {formData.customSpecifications.length > 0 && (
            <div className="pt-2 space-y-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-700">Custom Specifications:</p>
              {formData.customSpecifications.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(e) => updateCustomSpec(index, 'label', e.target.value)}
                    placeholder="Specification Name"
                    className="w-1/3 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateCustomSpec(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomSpec(index)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ════ SECTION 4: MAIN PRODUCT INFO ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
              <Box size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Main Product Info</h2>
              <p className="text-[11px] text-gray-400">Set cost, stock, weight and other details for this product.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <Tag size={13} className="text-emerald-700" /> Size
              </label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
              >
                <option value="Free Size">Free Size</option>
                <option value="S">S (Small)</option>
                <option value="M">M (Medium)</option>
                <option value="L">L (Large)</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="3XL">3XL</option>
                <option value="Set of All Sizes (S, M, L, XL, XXL)">Set of All Sizes (S, M, L, XL, XXL)</option>
                <option value="Unstitched">Unstitched</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <Box size={13} className="text-emerald-700" /> Pieces Per Set
              </label>
              <input
                type="number"
                min="1"
                value={formData.piecesPerSet}
                onChange={(e) => handlePiecesChange(parseInt(e.target.value) || 1)}
                placeholder="e.g. 6, 9, 12, 18, 24"
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
              />
              <p className="text-[10px] text-gray-400 mt-1">Manually enter pieces (e.g. 6, 12, 18, 24)</p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <DollarSign size={13} className="text-emerald-700" /> Price Per Piece (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.pricePerPiece || ''}
                onChange={(e) => handlePricePerPieceChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter price per piece"
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase">
                <DollarSign size={15} /> Total Set Price
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-emerald-700">
                  ₹{formData.totalSetPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80 font-medium">
                ({formData.piecesPerSet} pcs × ₹{formData.pricePerPiece})
              </p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase">
                <Box size={15} /> Total Stock (Pieces)
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-emerald-700">
                  {formData.totalStockPieces.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-800/80 font-medium">Sets in stock:</span>
                <input
                  type="number"
                  min="0"
                  value={formData.stockSets}
                  onChange={(e) => handleStockSetsChange(parseInt(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 text-xs bg-white border border-emerald-300 rounded font-bold text-emerald-900"
                />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-gray-700 text-xs font-bold uppercase">
                <DollarSign size={15} className="text-emerald-700" /> Purchase Price (₹)
              </div>
              <div className="relative my-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={formData.purchasePrice || ''}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter purchase price"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#083028]"
                />
              </div>
              <p className="text-[10px] text-gray-400">Total rate available in stock.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <Scale size={13} className="text-emerald-700" /> Weight
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Enter weight (e.g. 5)"
                  className="flex-1 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
                />
                <select
                  value={formData.weightUnit}
                  onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                  className="w-20 px-2 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <Percent size={13} className="text-emerald-700" /> GST (%)
              </label>
              <select
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028]"
              >
                <option value="0%">0% (Nil)</option>
                <option value="5%">5% (Standard Garment)</option>
                <option value="12%">12%</option>
                <option value="18%">18%</option>
                <option value="28%">28%</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Select GST rate (e.g., 5%, 12%, 18%, 28%)</p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <FileCheck size={13} className="text-emerald-700" /> HSN Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  placeholder="Enter or search HSN code"
                  className="flex-1 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#083028]"
                />
                <button
                  type="button"
                  onClick={() => setShowHsnModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold transition whitespace-nowrap"
                >
                  <Search size={12} /> Find HSN
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <Info size={11} className="text-emerald-700 flex-shrink-0" />
                Verify suggested code for material before saving.
              </p>
            </div>
          </div>
        </div>

        {/* ════ SECTION 5: SHIPPING & CARE DETAILS (Screenshot 2) ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <Truck size={18} className="text-[#083028]" />
            <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
              Shipping &amp; Care Details
            </h2>
          </div>
          <textarea
            rows={3}
            value={formData.shippingCare}
            onChange={(e) => setFormData({ ...formData, shippingCare: e.target.value })}
            placeholder="e.g. Dispatch Time: Dispatched within 24 hours | Wash Care: Dry Clean Recommended | Returns: 7-day easy exchange & return"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] leading-relaxed"
          />
        </div>

        {/* ════ SECTION 6: PRODUCT SOCIAL MEDIA LINKS (Screenshot 2) ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <LinkIcon size={18} className="text-[#083028]" />
              <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
                Product Social Media Links
              </h2>
            </div>
            <span className="text-[11px] text-gray-400">Optional product video/post URLs</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-1">
                <span className="w-5 h-5 rounded-md bg-[#FF0000] flex items-center justify-center text-white text-[10px]">
                  ▶
                </span>
                <span>YouTube Video / Short URL</span>
              </label>
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/shorts/..."
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-1">
                <span className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px] font-bold">
                  f
                </span>
                <span>Facebook Post / Reel URL</span>
              </label>
              <input
                type="url"
                value={formData.facebookUrl}
                onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                placeholder="https://www.facebook.com/reel/... or https://facebook.com/..."
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-1">
                <span className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white text-[10px]">
                  📷
                </span>
                <span>Instagram Reel / Post URL</span>
              </label>
              <input
                type="url"
                value={formData.instagramUrl}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                placeholder="https://www.instagram.com/reel/... or https://instagram.com/p/..."
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* ════ SECTION 7: DELIVERY TYPE ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <Truck size={18} className="text-[#083028]" />
            <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
              Delivery Type
            </h2>
          </div>

          <div className="space-y-3">
            {/* Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Select Delivery Type
              </label>
              <div className="relative">
                <select
                  value={formData.deliveryType}
                  onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value as 'standard' | 'low_margin', deliveryChargeAmount: e.target.value === 'standard' ? 0 : formData.deliveryChargeAmount })}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition appearance-none cursor-pointer"
                >
                  <option value="standard">Standard Item (Free Delivery - Green Tag)</option>
                  <option value="low_margin">Low Margin / Wholesale (+ Delivery - Orange Tag)</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>

            {/* Live Preview Badge */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Preview Tag:</span>
              {formData.deliveryType === 'standard' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Truck size={11} className="shrink-0" /> Free Delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                  <Package size={11} className="shrink-0" />
                  + {formData.deliveryChargeAmount > 0 ? `₹${formData.deliveryChargeAmount}` : 'Delivery'} Charge
                </span>
              )}
            </div>

            {/* Delivery Charge Amount — only shown for low_margin */}
            {formData.deliveryType === 'low_margin' && (
              <div className="bg-orange-50/60 border border-orange-200/70 rounded-xl p-4 space-y-2">
                <label className="block text-[11px] font-semibold text-orange-800 uppercase tracking-wide">
                  Fixed Delivery Charge (₹)
                </label>
                <p className="text-[10px] text-orange-600">
                  This amount will be shown on the product card, product page, cart, and checkout as a mandatory delivery fee. It does NOT count towards the free delivery threshold.
                </p>
                <div className="relative max-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-orange-600">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formData.deliveryChargeAmount}
                    onChange={(e) => setFormData({ ...formData, deliveryChargeAmount: Math.max(0, Number(e.target.value)) })}
                    className="w-full pl-7 pr-3.5 py-2 bg-white border border-orange-200 rounded-xl text-sm font-bold text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                    placeholder="e.g. 120"
                  />
                </div>
              </div>
            )}

            {/* Info note */}
            <p className="text-[10px] text-gray-400 leading-relaxed">
              <strong>Standard Item:</strong> Follows zone-based free delivery thresholds (green tag shown when eligible).<br/>
              <strong>Low Margin / Wholesale:</strong> Always shows a fixed delivery charge (orange tag). This product does NOT count towards the free delivery threshold, even if the cart total is high.
            </p>
          </div>
        </div>

        {/* ════ SECTION 8: SHOW ON HOMEPAGE SECTIONS (Screenshot 2) ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <Home size={18} className="text-[#083028]" />
            <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
              Show on Homepage Sections
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-[#083028] transition-colors">
              <input
                type="checkbox"
                checked={formData.isNewArrival}
                onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })}
                className="w-4 h-4 accent-[#083028] cursor-pointer"
              />
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Sparkles size={16} className="text-emerald-600" /> New Arrivals
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-amber-50/30 rounded-xl border border-amber-200/70 cursor-pointer hover:border-amber-400 transition-colors">
              <input
                type="checkbox"
                checked={formData.isPremium}
                onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
              />
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Crown size={16} className="text-amber-500" /> Premium
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-amber-50/20 rounded-xl border border-amber-200 cursor-pointer hover:border-amber-400 transition-colors">
              <input
                type="checkbox"
                checked={formData.isGold}
                onChange={(e) => setFormData({ ...formData, isGold: e.target.checked })}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
              />
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Award size={16} className="text-amber-600" /> Gold
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-[#083028] transition-colors">
              <input
                type="checkbox"
                checked={formData.isBestSeller}
                onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                className="w-4 h-4 accent-[#083028] cursor-pointer"
              />
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Flame size={16} className="text-amber-600" /> Best Sellers
              </span>
            </label>

            <label className="sm:col-span-2 flex items-center gap-3 p-3 bg-gray-50/60 rounded-xl border border-gray-200 cursor-pointer hover:border-[#083028] transition-colors">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 accent-[#083028] cursor-pointer"
              />
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <Store size={16} className="text-emerald-700" /> Active on Storefront
              </span>
            </label>
          </div>
        </div>

        {/* ════ SECTION 8: PRODUCT VARIANTS LIST & "+ Add Variant" BUTTON (SS2) ════ */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers size={17} className="text-[#083028]" />
                Product Variants ({formData.variants.length})
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Add size, color, pieces per set, and stock variations for this product.
              </p>
            </div>

            {/* + Add Variant Pill Button (Exact Match to Screenshot 2) */}
            <button
              type="button"
              onClick={openNewVariantModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-[#083028] border-2 border-emerald-400 rounded-full text-xs font-bold transition shadow-xs"
            >
              <Plus size={16} className="text-emerald-700" />
              Add Variant
            </button>
          </div>

          {formData.variants.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
              <Layers size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-700">No variants added yet</p>
              <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
                Click &quot;+ Add Variant&quot; to configure Set Size or Individual Piece variants with separate pricing and inventory.
              </p>
              <button
                type="button"
                onClick={openNewVariantModal}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-[#083028] border border-emerald-400 rounded-full text-xs font-bold"
              >
                <Plus size={14} /> Add Variant
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {formData.variants.map((v, vIdx) => (
                <div
                  key={v.id || vIdx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      #{vIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{v.size || 'Free Size'}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {v.variantType === 'set_size' ? `${v.piecesPerSet} pcs/set` : 'Individual'}
                        </span>
                        {v.colour && (
                          <span className="text-[11px] text-gray-500 font-medium">• {v.colour}</span>
                        )}
                        {v.fabric && (
                          <span className="text-[11px] text-gray-500 font-medium">• {v.fabric}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        SKU: {v.skuId || 'N/A'} | Price: ₹{v.pricePerPiece}/pc {v.variantType === 'set_size' ? `(Set: ₹${v.totalSetPrice})` : ''} | Stock: {v.variantType === 'set_size' ? `${v.availableSets} sets (${v.totalStockPieces} pcs)` : `${v.availablePieces} pcs`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openEditVariantModal(vIdx)}
                      className="p-1.5 text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                      title="Edit variant"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeVariant(vIdx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete variant"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ════ BOTTOM ACTIONS ════ */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="px-6 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveProduct(formData.active)}
            className="inline-flex items-center gap-2 px-7 py-2.5 bg-[#083028] hover:bg-[#051e19] text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {editingProduct ? 'Save Changes' : 'Save Product'}
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: CATALOG TABLE VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products &amp; Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage wholesale products, set specifications, bulk pricing, and gallery photos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProducts}
            title="Refresh"
            className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-[#083028] hover:bg-[#051e19] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
          >
            <Plus size={18} />
            Add New Product
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, brand, or price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#083028]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#083028] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List — Cards on mobile, Table on desktop */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm font-medium">Loading from database...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No products found. Click &quot;Add New Product&quot; to create your first wholesale product!
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} fill className="object-cover object-top" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                          {product.brand && <p className="text-xs text-emerald-700 font-semibold">{product.brand}</p>}
                          <p className="text-[10px] text-gray-400 font-mono truncate">ID: {product.id}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => openEditForm(product)} className="p-1.5 text-gray-500 hover:text-[#083028] hover:bg-gray-100 rounded-lg transition" title="Edit">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-lg font-medium">{product.category}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {product.active ? '● Active' : '● Draft'}
                        </span>
                        {product.isNewArrival && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✦ New</span>}
                        {product.isBestSeller && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">🔥 Best</span>}
                        {product.isPremium && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">👑 Premium</span>}
                        {product.isGold && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">⭐ Gold</span>}
                      </div>

                      <div className="mt-1.5 flex items-center gap-3 text-xs">
                        <span className="font-bold text-[#083028]">
                          {product.totalSetPrice ? `₹${product.totalSetPrice}` : product.price}
                        </span>
                        {product.pricePerPiece ? <span className="text-gray-400">₹{product.pricePerPiece}/pc</span> : null}
                        {product.piecesPerSet ? <span className="text-gray-400">{product.piecesPerSet} pcs/set</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Product', 'Category', 'Wholesale Set Price', 'Piece Info', 'Homepage Badges', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider ${
                        h === 'Actions' ? 'text-right pr-5' : 'text-left'
                      } ${h === 'Homepage Badges' ? 'text-center' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{product.name}</p>
                          {product.brand && (
                            <p className="text-[11px] font-semibold text-emerald-800">{product.brand}</p>
                          )}
                          <p className="text-[11px] text-gray-400 font-mono">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium">
                          {product.category}
                        </span>
                        {product.fabric && (
                          <span className="text-[10px] text-gray-500">Fabric: {product.fabric}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#083028]">
                        {product.totalSetPrice ? `₹${product.totalSetPrice}` : product.price}
                      </p>
                      {product.pricePerPiece ? (
                        <p className="text-[11px] text-gray-500 font-medium">
                          ₹{product.pricePerPiece} / piece
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-semibold text-gray-700">
                          {product.piecesPerSet ? `${product.piecesPerSet} pcs/set` : '1 pc'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Size: {product.size || 'Free Size'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-center max-w-[180px]">
                        {product.isNewArrival && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Sparkles size={10} /> New
                          </span>
                        )}
                        {product.isBestSeller && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Flame size={10} /> Best
                          </span>
                        )}
                        {product.isPremium && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <Crown size={10} /> Premium
                          </span>
                        )}
                        {product.isGold && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">
                            <Award size={10} /> Gold
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        product.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-green-600' : 'bg-gray-400'}`} />
                        {product.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditForm(product)}
                        className="p-1.5 text-gray-500 hover:text-[#083028] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
