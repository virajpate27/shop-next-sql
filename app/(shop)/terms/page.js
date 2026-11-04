import Link from 'next/link'
import PolicyPage, { Section, List } from '@/components/layout/PolicyPage'
import { SITE } from '@/lib/siteConfig'

export const metadata = {
  title: 'Terms & Conditions',
  description: `The terms that apply when you shop at ${SITE.name}: orders, pricing, payments, shipping, returns and your account.`,
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions" updated={SITE.updated}
      intro={`These terms apply to your use of this website and to every order you place with ${SITE.legalName} ("${SITE.name}", "we", "us"). By creating an account or placing an order you agree to them.`}>
      <Section title="1. Your account">
        <List items={[
          'Give accurate details and keep your password private. You are responsible for activity on your account.',
          'Tell us straight away if you think someone else has used your account.',
          'We may suspend or block accounts that are used for fraud, abuse or to break these terms.',
        ]} />
      </Section>
      <Section title="2. Products and prices">
        <List items={[
          'All prices are in Indian Rupees (₹). Tax (GST) is shown in your order summary at checkout.',
          'We try to show products accurately, but colours and packaging can differ slightly from the photos on your screen.',
          'If a product is listed at a clearly wrong price or is out of stock, we may cancel the order and refund anything you paid.',
        ]} />
      </Section>
      <Section title="3. Placing an order">
        <p>Your order is a request to buy. It is confirmed when you see the order confirmation page and receive our confirmation email. We may cancel an order, for example because of a stock or pricing error, a delivery address we cannot serve, or suspected fraud. If you have already paid for a cancelled order, we refund the full amount.</p>
      </Section>
      <Section title="4. Payment">
        <p>You can pay online through Razorpay (the payment methods shown at checkout, such as UPI, cards and net banking) or choose Cash on Delivery where it is offered. Online payments are processed by Razorpay: we never see or store your card number. A Cash on Delivery handling fee may apply, as shown at checkout and on our <Link href="/shipping-policy" className="text-indigo-600 underline">Shipping Policy</Link>.</p>
      </Section>
      <Section title="5. Delivery, returns and refunds">
        <p>Delivery is covered by our <Link href="/shipping-policy" className="text-indigo-600 underline">Shipping Policy</Link>. Returns and refunds are covered by our <Link href="/returns-policy" className="text-indigo-600 underline">Returns &amp; Refunds Policy</Link>. Both form part of these terms.</p>
      </Section>
      <Section title="6. Reviews and content you submit">
        <p>When you post a review you confirm it is your honest opinion and does not break the law or anyone&apos;s rights. You allow us to display it on our website. We may remove reviews that are abusive, misleading or unrelated to the product.</p>
      </Section>
      <Section title="7. Our content">
        <p>The website, its design, logos, text and images belong to us or our licensors. You may not copy or reuse them commercially without our written permission.</p>
      </Section>
      <Section title="8. Liability">
        <p>To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any order is limited to the amount you paid for it. Nothing in these terms limits any right you have under Indian consumer law.</p>
      </Section>
      <Section title="9. Changes and governing law">
        <p>We may update these terms; the version on this page, with the date above, applies to orders placed after that date. These terms are governed by the laws of India and the courts at {SITE.jurisdiction} have jurisdiction.</p>
      </Section>
      <Section title="10. Contact us">
        <p>Questions about these terms? Write to <a className="text-indigo-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a> or use our <Link href="/contact" className="text-indigo-600 underline">contact page</Link>.</p>
      </Section>
    </PolicyPage>
  )
}