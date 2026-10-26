// src/lib/cloudinary.js
import { authFetch } from '@/lib/authFetch'


// Upload a single File object, returns the Cloudinary URL
export async function uploadImage(file, folder = 'shopnext/products') {
  // 1. Get a signed payload from our API
 const signRes = await authFetch('/api/cloudinary/sign', {
  method: 'POST',
  body:   JSON.stringify({ folder }),
})
  const { timestamp, signature, cloudName, apiKey } = await signRes.json();

  // 2. POST directly to Cloudinary 
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!uploadRes.ok) throw new Error('Cloudinary upload failed');

  const data = await uploadRes.json();
  return data.secure_url;
}

// Upload multiple files, returns array of URLs
export async function uploadImages(files, folder = 'shopnext/products') {
  return Promise.all(Array.from(files).map((f) => uploadImage(f, folder)));
}

// Build a Cloudinary transformation URL (resize + format)
export function getOptimizedUrl(
  url,
  { width = 800, height = 800, quality = 'auto' } = {}
) {
  if (!url || !url.includes('cloudinary.com')) return url;
  // Insert transformation before /upload/
  return url.replace(
    '/upload/',
    `/upload/w_${width},h_${height},c_fill,f_auto,q_${quality}/`
  );
}
