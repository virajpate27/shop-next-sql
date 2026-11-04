// lib/siteConfig.js — PUBLIC business details shown on the policy / contact pages and footer.
// ⚠ Replace every value marked EDIT before going live. (Not secrets: this is what a customer sees.)
// Shipping charges and the COD fee are NOT here — the Shipping page reads them live from Admin → Shipping.
import { RETURN_WINDOW_DAYS } from '@/lib/returns'

export const SITE = {
  name: 'ShopNext',                                           // EDIT: store / brand name
  legalName: 'EDIT: Your registered business name',           // EDIT: as on GST / registration, e.g. "Acme Retail Pvt. Ltd."
  gstin: '',                                                  // EDIT: GSTIN (leave '' if not registered)
  email: 'support@yourdomain.com',                            // EDIT: customer support email
  phone: '+91 00000 00000',                                   // EDIT: support phone / WhatsApp ('' to hide)
  hours: 'Mon–Sat, 10:00 AM – 6:00 PM IST',                   // EDIT: support hours
  address: ['EDIT: Street, building', 'City, State – PIN', 'India'], // EDIT: registered / dispatch address
  jurisdiction: 'EDIT: your city',                            // EDIT: courts that govern disputes, e.g. "Ahmedabad, Gujarat"

  // Grievance Officer (expected under Indian e-commerce rules — confirm requirements with your adviser)
  grievance: {
    name: 'EDIT: Grievance Officer name',                     // EDIT
    email: 'grievance@yourdomain.com',                        // EDIT
    ack: '48 hours',                                          // acknowledge a complaint within
    resolve: 'one month',                                     // resolve within
  },

  // Operations — keep these true to how you really work
  dispatchTime: '1–2 business days',                          // EDIT: time to hand the parcel to the courier
  deliveryTime: '3–7 business days',                          // EDIT: typical delivery time after dispatch
  refundDays: '5–7 business days',                            // EDIT: time to credit a refund after it is approved
  returnWindowDays: RETURN_WINDOW_DAYS,                       // do not edit here: change RETURN_WINDOW_DAYS in lib/returns.js

  updated: '3 November 2026',                                 // EDIT whenever you change a policy
}

/** true while any "EDIT" placeholder is still in place */
export const hasPlaceholders = () => JSON.stringify(SITE).includes('EDIT') || SITE.email.includes('yourdomain.com') || SITE.phone.includes('00000')