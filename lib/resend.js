// src/lib/resend.js
import { Resend } from 'resend'

// Created lazily so a missing RESEND_API_KEY can't crash the build or unrelated routes.
let client = null
export function getResend() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
    client = new Resend(process.env.RESEND_API_KEY)
  }
  return client
}

export const FROM = process.env.EMAIL_FROM || 'ShopNext <onboarding@resend.dev>'
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL
