import Link from 'next/link'
import PolicyPage from '@/components/layout/PolicyPage'
import { SITE } from '@/lib/siteConfig'

export const metadata = {
  title: 'Help Center',
  description: `Answers to common questions about orders, payment, delivery, returns and your account at ${SITE.name}.`,
  alternates: { canonical: '/help' },
}

const A = ({ href, children }) => <Link href={href} className="text-indigo-600 underline">{children}</Link>

const FAQS = [
   { q: 'How do I track my order?', a: <>Sign in and open <A href="/orders">My Orders</A>. Each order shows its live status and a timeline. Once it ships you will also see the courier and tracking number (with a &ldquo;Track shipment&rdquo; button when available), and we email them to you.</> },
  { q: 'Which payment methods do you accept?', a: <>You can pay online through Razorpay (UPI, cards, net banking and other methods shown at checkout) or choose Cash on Delivery where it is available. See the <A href="/shipping-policy">Shipping Policy</A> for the Cash on Delivery fee.</> },
  { q: 'Is it safe to pay on your website?', a: 'Yes. Online payments are handled by Razorpay on a secure page. We never see or store your card details.' },
  { q: 'How much is delivery and how long does it take?', a: <>Charges are shown in your order summary before you pay, and listed on the <A href="/shipping-policy">Shipping Policy</A>. Delivery usually takes {SITE.deliveryTime} after dispatch.</> },
   { q: 'Can I change my address or cancel my order?', a: <>You can cancel from <A href="/orders">My Orders</A> until we start preparing your order. To change the address, <A href="/contact">contact us</A> before it ships.</> },
  { q: 'How do I return an item?', a: <>Open the delivered order in <A href="/orders">My Orders</A> and click &ldquo;Request return&rdquo; within {SITE.returnWindowDays} days of delivery. Details are in the <A href="/returns-policy">Returns &amp; Refunds Policy</A>.</> },
  { q: 'When will I get my refund?', a: <>Within {SITE.refundDays} after your return is approved and the refund is processed. Online payments go back to the original payment method.</> },
  { q: 'How do I use a coupon code?', a: 'Enter it in the coupon box on the cart or checkout page and click Apply. The discount appears in your order summary. Some coupons have a minimum order value or an expiry date.' },
  { q: 'I forgot my password.', a: <>Use <A href="/forgot-password">Forgot password</A> on the sign-in page and we will email you a reset link. It is valid for one hour. Check your spam folder if it does not arrive.</> },
  { q: 'My payment was deducted but the order is not confirmed.', a: <>Please <A href="/contact">contact us</A> with your order number or payment reference and we will sort it out quickly.</> },
    { q: "Why can't I write a review?", a: 'Reviews can be written by customers whose order for that product has been delivered. This keeps reviews honest: every review shows a “Verified purchase” tag.' },
]

export default function HelpPage() {
  return (
    <PolicyPage title="Help Center" intro="Quick answers to the questions we hear most. Can't find yours? We're happy to help.">
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl bg-white">
        {FAQS.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-gray-900">
              {f.q}
              <span className="text-gray-400 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <div className="mt-3 text-gray-600 leading-relaxed">{f.a}</div>
          </details>
        ))}
      </div>
      <p className="text-gray-600">
        Still stuck? <A href="/contact">Contact us</A>{SITE.phone ? ` or call ${SITE.phone}` : ''} ({SITE.hours}).
      </p>
    </PolicyPage>
  )
}