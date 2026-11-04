import PolicyPage from '@/components/layout/PolicyPage'
import { SITE } from '@/lib/siteConfig'
import ContactForm from './ContactForm'

export const metadata = {
  title: 'Contact Us',
  description: `Get in touch with ${SITE.name}: email, phone, address and a message form.`,
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <PolicyPage title="Contact Us" intro="Questions about an order, a product or a return? Send us a message and we will get back to you.">
      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2 space-y-5 text-gray-600">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Email</h2>
            <a className="text-indigo-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </div>
          {SITE.phone && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Phone / WhatsApp</h2>
              <a className="text-indigo-600 underline" href={`tel:${SITE.phone.replace(/[^+\d]/g, '')}`}>{SITE.phone}</a>
              <p className="text-sm text-gray-400 mt-1">{SITE.hours}</p>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">{SITE.legalName}</h2>
            <p className="text-sm leading-relaxed">{SITE.address.map((l, i) => <span key={i}>{l}<br /></span>)}</p>
            {SITE.gstin && <p className="text-sm mt-1">GSTIN: {SITE.gstin}</p>}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Grievance Officer</h2>
            <p className="text-sm">{SITE.grievance.name}<br /><a className="text-indigo-600 underline" href={`mailto:${SITE.grievance.email}`}>{SITE.grievance.email}</a></p>
          </div>
        </div>
        <div className="md:col-span-3">
          <ContactForm supportEmail={SITE.email} />
        </div>
      </div>
    </PolicyPage>
  )
}