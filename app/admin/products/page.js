// src/app/admin/products/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from "lucide-react";
import { TAX_RATES, TAX_TYPES } from "@/utils/tax";
import { toast } from "sonner";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api/products";
import { uploadImages } from "@/lib/cloudinary";
import { formatPrice, generateSlug } from "@/utils/formatters";
import { useCategories } from "@/hooks/useCategories";
import { TaxPreview } from "@/components/admin/TaxPreview";
import { VariationBuilder } from "@/components/admin/VariationBuilder";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  price: "",
  comparePrice: "",
  category: "",
  tags: "",
  stock: "",
  sku: "",
  featured: false,
  images: [],
  taxRate: 0,
  taxType: "inclusive",
  customTaxRate: "",
  hasVariations: false,
  variationTypes: [],
  variants: [],
  defaultVariant: {},
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // product id being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);
  const { categories } = useCategories();

  const [variationTypes, setVariationTypes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [defaultVariant, setDefaultVariant] = useState({})

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { products } = await getProducts({ pageSize: 50 });
      setProducts(products);
    } catch (err) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreviewUrls([]);
    setVariationTypes([]);
    setVariants([]);
    setDefaultVariant({})
    setShowModal(true);

  }

  function openEdit(product) {
    setEditing(product.id);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      description: product.description || "",
      price: product.price || "",
      comparePrice: product.comparePrice || "",
      category: product.category || "",
      tags: product.tags?.join(", ") || "",
      stock: product.stock || "",
      sku: product.sku || "",
      featured: product.featured || false,
      images: product.images || [],
      taxRate: product.taxRate ?? 0,
      taxType: product.taxType || "inclusive",
      customTaxRate: product.customTaxRate || "",
      hasVariations: product.hasVariations || false,
      variationTypes: product.variationTypes || [],
      variants: product.variants || [],
    });
    setPreviewUrls(product.images || []);
    setVariationTypes(product.variationTypes || []);
    setVariants(product.variants || []);
    setDefaultVariant(product.defaultVariant || {})
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setPreviewUrls([]);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const updated = {
        ...prev,
        [type === "checkbox" ? name : name]:
          type === "checkbox" ? checked : value,
      };
      // Auto-generate slug from name
      if (name === "name") updated.slug = generateSlug(value);
      return updated;
    });
  }

  async function handleImageUpload(e) {
    const files = e.target.files;

    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadImages(files);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      setPreviewUrls((prev) => [...prev, ...urls]);
      toast.success(`${files.length} image(s) uploaded`);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(index) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return toast.error("Product name is required");
    if (!form.price) return toast.error("Price is required");
    if (!form.category) return toast.error("Category is required");
    if (!form.stock) return toast.error("Stock quantity is required");
    if (form.images.length === 0)
      return toast.error("At least one image is required");

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        slug: form.slug || generateSlug(form.name),
        description: form.description.trim(),
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
        category: form.category,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        hasVariations: form.hasVariations,
        variationTypes: form.hasVariations ? variationTypes : [],
        variants: form.hasVariations
          ? variants.map((v) => ({
              ...v,
              price: Number(v.price) || Number(form.price) || 0,
              stock: Number(v.stock) || 0,
            }))
          : [],
        defaultVariant: form.hasVariations ? defaultVariant : {},
        stock: form.hasVariations
          ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
          : Number(form.stock),
        sku: form.sku.trim(),
        featured: form.featured,
        images: form.images,
        taxRate:
          form.taxRate === "custom"
            ? Number(form.customTaxRate) || 0
            : Number(form.taxRate),
        taxType: form.taxType,
      };

      if (editing) {
        await updateProduct(editing, data);
        toast.success("Product updated");
      } else {
        await createProduct(data);
        toast.success("Product created");
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      toast.error("Failed to save product");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product.id);
      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {products.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add product
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Product", "Category", "Price", "Stock", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.images?.[0] && (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          SKU: {p.sku || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {p.category}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.stock === 0
                          ? "bg-red-50 text-red-600"
                          : p.stock <= 10
                            ? "bg-orange-50 text-orange-600"
                            : "bg-green-50 text-green-600"
                      }`}
                    >
                      {p.stock === 0 ? "Out of stock" : `${p.stock} units`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.featured && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit product" : "Add new product"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product images <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {previewUrls.map((url, i) => (
                    <div
                      key={i}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200"
                    >
                      <Image src={url} alt="" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-[10px] text-gray-400">
                          Upload
                        </span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-400">
                  JPG, PNG, WebP. First image is the cover.
                </p>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Product name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Wireless Bluetooth Earbuds"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Slug
                  </label>
                  <input
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="auto-generated from name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the product..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Price + Compare price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="999"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Compare price (₹)
                  </label>
                  <input
                    name="comparePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.comparePrice}
                    onChange={handleChange}
                    placeholder="1499 (for strike-through)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Category + SKU + Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SKU
                  </label>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="SKU-001"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="50"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Has variations toggle */}
              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={form.hasVariations}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      hasVariations: e.target.checked,
                    }));
                    if (!e.target.checked) {
                      setVariationTypes([]);
                      setVariants([]);
                    }
                  }}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  This product has variations (size, color, etc.)
                </span>
              </label>

              {/* Variation builder */}
              {form.hasVariations && (
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-sm font-medium text-gray-700 mb-4">
                    Product variations
                  </p>
                  <VariationBuilder
                    variationTypes={variationTypes}
                    setVariationTypes={setVariationTypes}
                    variants={variants}
                    setVariants={setVariants}
                    basePrice={form.price}
                    defaultVariant={defaultVariant}
                    setDefaultVariant={setDefaultVariant}
                  />
                </div>
              )}

              {/* Tax */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-medium text-gray-700 mb-4">
                  Tax configuration
                </p>

                {/* Tax rate */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tax rate
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TAX_RATES.map((rate) => (
                      <button
                        key={rate.value}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            taxRate: rate.value,
                            customTaxRate:
                              rate.value === "custom" ? prev.customTaxRate : "",
                          }))
                        }
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          form.taxRate === rate.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {rate.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom rate input */}
                  {form.taxRate === "custom" && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        name="customTaxRate"
                        value={form.customTaxRate}
                        onChange={handleChange}
                        placeholder="Enter custom rate"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-40 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}
                </div>

                {/* Tax type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax type
                  </label>
                  <div className="space-y-2">
                    {TAX_TYPES.map((type) => (
                      <label
                        key={type.value}
                        className={`flex items-start gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-colors ${
                          form.taxType === type.value
                            ? "border-indigo-500 bg-indigo-50/40"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="taxType"
                          value={type.value}
                          checked={form.taxType === type.value}
                          onChange={handleChange}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {type.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {type.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                {form.price && Number(form.taxRate) > 0 && (
                  <TaxPreview
                    price={Number(form.price)}
                    taxRate={
                      form.taxRate === "custom"
                        ? Number(form.customTaxRate) || 0
                        : Number(form.taxRate)
                    }
                    taxType={form.taxType}
                  />
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tags{" "}
                  <span className="text-xs text-gray-400">
                    (comma separated)
                  </span>
                </label>
                <input
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="wireless, earbuds, bluetooth"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Featured toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={form.featured}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  Feature this product on homepage
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
