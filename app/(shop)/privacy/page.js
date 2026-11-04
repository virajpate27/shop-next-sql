import Link from 'next/link'
import PolicyPage, { Section, List } from '@/components/layout/PolicyPage'
import { SITE } from '@/lib/siteConfig'

export const metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE.name} collects, uses and protects your personal information.`,
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated={SITE.updated}
      intro={`${SITE.legalName} ("${SITE.name}", "we") respects your privacy. This page explains what we collect, why, who we share it with and the choices you have.`}>
      <Section title="1. What we collect">
        <List items={[
          'Account details: your name and email address. Your password is stored only as a salted hash, never in readable form. If you sign in with Google we receive your name, email address and profile picture.',
          'Delivery details: the name, phone number and address you enter at checkout or save in your profile.',
          'Order details: what you bought, amounts paid, payment method and order status. For online payments, Razorpay tells us whether the payment succeeded and its reference number; we do not receive your card number.',
          'Activity you create: your cart, wishlist, reviews and return requests.',
          'Technical data: standard server logs (such as IP address and browser type) used to keep the site secure and working.',
        ]} />
      </Section>
      <Section title="2. How we use it">
        <List items={[
          'To process and deliver your orders, and to handle returns and refunds.',
          'To send transactional emails: order confirmation, status updates, password resets, replies to your messages.',
          'To prevent fraud and abuse, and to keep the website secure.',
          'To meet our legal, tax and accounting obligations.',
        ]} />
        <p>We do not sell your personal information.</p>
      </Section>
      <Section title="3. Who we share it with">
        <p>Only with service providers who help us run the store, and only what they need:</p>
        <List items={[
          'Razorpay: payment processing.',
          'Courier and delivery partners: your name, delivery address and phone number.',
          'Resend: sending our emails to you.',
          'Cloudinary: hosting product images.',
          'Google: sign-in, if you choose "Continue with Google".',
          'Our hosting and database provider (Hostinger), where the website and its data run.',
        ]} />
        <p>We may also disclose information when the law requires it.</p>
      </Section>
      <Section title="4. Cookies and browser storage">
        <p>We use only what the site needs to work: a secure login cookie that keeps you signed in, and your browser&apos;s local storage to remember your cart. We do not currently use advertising or analytics cookies. If that changes, we will update this page and ask for your consent where required.</p>
      </Section>
      <Section title="5. How long we keep it">
        <p>We keep account and order information for as long as your account is active and for the period the law requires for tax and accounting records. You can ask us to delete your account at any time (see below); we may keep order records we are legally required to retain.</p>
      </Section>
      <Section title="6. Security">
        <p>The site runs over HTTPS, passwords are hashed, and access to customer data is limited to authorised staff. No system is perfectly secure, so please use a strong, unique password.</p>
      </Section>
      <Section title="7. Your choices">
        <p>You can view and edit your name and addresses in your <Link href="/profile" className="text-indigo-600 underline">profile</Link>. To access a copy of your data, correct it, or delete your account, email <a className="text-indigo-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a> from your registered address and we will respond within a reasonable time.</p>
      </Section>
      <Section title="8. Children">
        <p>Our store is not intended for children under 18, and we do not knowingly collect their information.</p>
      </Section>
      <Section title="9. Grievances and changes">
        <p>For any concern about your data, contact our Grievance Officer, {SITE.grievance.name}, at <a className="text-indigo-600 underline" href={`mailto:${SITE.grievance.email}`}>{SITE.grievance.email}</a>. We acknowledge complaints within {SITE.grievance.ack} and aim to resolve them within {SITE.grievance.resolve}. We may update this policy; the date at the top shows the latest version.</p>
      </Section>
    </PolicyPage>
  )
}