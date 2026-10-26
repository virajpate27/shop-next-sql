// src/app/(shop)/products/[slug]/page.js
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/api/products';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductDetailSkeleton } from './ProductDetailSkeleton';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      try {
        const p = await getProductBySlug(slug);
        if (!p) {
          setNotFound(true);
          return;
        }
        setProduct(p);
        const rel = await getRelatedProducts(p.category, p.id, 4);
        setRelated(rel);
      } catch (err) {
        console.error('Failed to load product:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) return <ProductDetailSkeleton />;

  if (notFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Product not found
        </h1>
        <p className="text-gray-400 mb-8">
          This product may have been removed or the link is incorrect.
        </p>
      </div>
    );
  }

  return <ProductDetailClient product={product} related={related} />;
}
