import Link from 'next/link'
import PolicyPage, { Section, List } from '@/components/layout/PolicyPage'
import { SITE } from '@/lib/siteConfig'
import { RETURN_REASONS } from '@/lib/returns'

export const metadata = {
  title: 'Returns & Refunds Policy',
  description: `How to return an item to ${SITE.name} and how refunds work.`,
  alternates: { canonical: '/returns-policy' },
}

export default function ReturnsPolicyPage() {
  const days = SITE.returnWindowDays
  return (
    <PolicyPage title="Returns & Refunds Policy" updated={SITE.updated}
      intro={`We want you to be happy with your purchase. If something isn't right, you can ask for a return within ${days} days of delivery.`}>
      <Section title="What can be returned">
        <List items={[
          `Only delivered orders can be returned, and the request must be made within ${days} days of the delivery date.`,
          'Items should be unused and in their original packaging, with tags and accessories.',
          'You can return some or all of the items in an order, and choose the quantity of each.',
        ]} />
        <p>Reasons you can choose from: {RETURN_REASONS.join('; ')}.</p>
      </Section>
      <Section title="How to request a return">
        <List items={[
          <>Sign in and open <Link key="o" href="/orders" className="text-indigo-600 underline">My Orders</Link>, then the delivered order.</>,
          'Click “Request return”, select the items, quantity and reason, and add a note if you like.',
          'We review every request and email you when it is approved or rejected, with the next steps.',
        ]} />
        <p>The return button appears only while the order is inside the {days}-day window. After that, please <Link href="/contact" className="text-indigo-600 underline">contact us</Link>: we will look at it case by case.</p>
      </Section>
      <Section title="Refunds">
        <List items={[
          'The refund covers the price of the items you return. Delivery and Cash on Delivery charges paid on the original order are not refunded.',
          `Once your return is approved and the refund is processed, the money reaches you within ${SITE.refundDays}.`,
          'Online payments are refunded to the original payment method (card, UPI or bank account used at checkout). Your bank may take a few extra days to show it.',
          'For Cash on Delivery orders we will contact you on your registered email or phone to arrange the refund by bank transfer or UPI.',
        ]} />
      </Section>
      <Section title="Cancelling an order">
        <p>To cancel before your order ships, <Link href="/contact" className="text-indigo-600 underline">contact us</Link> with your order number as soon as possible. If you already paid online, the amount is refunded to your original payment method within {SITE.refundDays}. Once an order has shipped, you can refuse delivery or return it after delivery under this policy.</p>
      </Section>
      <Section title="Need help?">
        <p>Email <a className="text-indigo-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>{SITE.phone ? ` or call ${SITE.phone}` : ''} ({SITE.hours}).</p>
      </Section>
    </PolicyPage>
  )
}