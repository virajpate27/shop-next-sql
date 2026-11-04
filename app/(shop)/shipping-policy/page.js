import Link from 'next/link'
import PolicyPage, { Section, List } from '@/components/layout/PolicyPage'
import { SITE } from '@/lib/siteConfig'
import { DEFAULT_SHIPPING } from '@/lib/shipping'
import { getShippingConfigServer } from '@/lib/repo/shippingConfig'

// Charges come live from Admin → Shipping, so this page can never contradict checkout.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Shipping Policy',
  description: `Delivery charges, dispatch and delivery times, and Cash on Delivery details at ${SITE.name}.`,
  alternates: { canonical: '/shipping-policy' },
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

export default async function ShippingPolicyPage() {
  let cfg = DEFAULT_SHIPPING
  try { cfg = await getShippingConfigServer() } catch (e) { console.error('[shipping-policy] using defaults:', e.message) }

  const freeOver = cfg.freeShippingEnabled && cfg.freeAbove > 0
  const codWaiver = cfg.codEnabled && cfg.codFeeWaiverEnabled && cfg.codFreeAbove > 0

  return (
    <PolicyPage title="Shipping Policy" updated={SITE.updated}
      intro={`How and when ${SITE.name} delivers your order. We ship across India.`}>
      <Section title="Delivery charges">
        <List items={[
          cfg.baseCharge > 0 ? `Standard delivery charge: ${inr(cfg.baseCharge)} per order.` : 'Delivery is free on all orders.',
          ...(cfg.baseCharge > 0 && freeOver ? [`Free delivery on orders of ${inr(cfg.freeAbove)} or more.`] : []),
          ...(cfg.baseCharge > 0 && cfg.freeRules?.length ? ['Some products or order sizes qualify for free delivery: you will see it at checkout.'] : []),
        ]} />
        <p>The exact charge is always shown in your order summary before you pay.</p>
      </Section>
      <Section title="Cash on Delivery">
        {cfg.codEnabled ? (
          <List items={[
            'Cash on Delivery is available.',
            cfg.codFee > 0 ? `A Cash on Delivery handling fee of ${inr(cfg.codFee)} applies.` : 'There is no extra fee for Cash on Delivery.',
            ...(cfg.codFee > 0 && codWaiver ? [`The Cash on Delivery fee is waived on orders of ${inr(cfg.codFreeAbove)} or more.`] : []),
            'Please keep the exact amount ready when the parcel arrives.',
          ]} />
        ) : (
          <p>Cash on Delivery is currently not available. Please pay online at checkout.</p>
        )}
      </Section>
      <Section title="Dispatch and delivery times">
        <List items={[
          `We usually dispatch orders within ${SITE.dispatchTime} of confirmation.`,
          `Delivery usually takes ${SITE.deliveryTime} after dispatch, depending on your location.`,
          'Delivery times are estimates. Weather, strikes, festivals and courier delays can add time.',
        ]} />
      </Section>
      <Section title="Tracking your order">
        <p>Sign in and open <Link href="/orders" className="text-indigo-600 underline">My Orders</Link> to see the live status of every order: confirmed, processing, shipped and delivered. We also email you at each step.</p>
      </Section>
      <Section title="Delivery attempts and addresses">
        <List items={[
          'Please check your address and phone number at checkout: couriers call this number.',
          'If you are unavailable, the courier may re-attempt delivery. After repeated failed attempts the parcel may be returned to us; we will contact you to re-ship (extra delivery charges may apply) or cancel and refund as per our Returns & Refunds Policy.',
          'To change an address, contact us before your order is shipped.',
        ]} />
      </Section>
      <Section title="Damaged or missing parcels">
        <p>Check the package when it arrives. If it is damaged, opened or the contents are wrong, contact us within {SITE.returnWindowDays} days of delivery through the <Link href="/contact" className="text-indigo-600 underline">contact page</Link> and keep the packaging and photos. See the <Link href="/returns-policy" className="text-indigo-600 underline">Returns &amp; Refunds Policy</Link>.</p>
      </Section>
    </PolicyPage>
  )
}