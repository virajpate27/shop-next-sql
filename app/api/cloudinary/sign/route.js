// src/app/api/cloudinary/sign/route.js
import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/guards'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Only admins can upload product images
export const POST = withAdmin(async (req) => {
  try {
    let { folder = 'shopnext/products' } = await req.json()
    if (typeof folder !== 'string' || !/^shopnext\/[a-z0-9/_-]{1,60}$/i.test(folder)) folder = 'shopnext/products'

    const timestamp = Math.round(Date.now() / 1000)
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    )

    return NextResponse.json({
      timestamp,
      signature,
      folder,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey:    process.env.CLOUDINARY_API_KEY,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Signing failed' }, { status: 500 })
  }
})