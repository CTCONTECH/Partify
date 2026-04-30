import Link from 'next/link';
import { TopBar } from '@/components/TopBar';

const sections = [
  {
    title: '1. About Partify',
    body: [
      'Partify helps customers search for vehicle parts, compare supplier availability, compare price and distance, and access supplier offers or coupons where available.',
      'Partify is a marketplace and discovery platform. We are not the manufacturer of the parts listed by suppliers, and we do not guarantee that a supplier will always have stock available when you arrive.',
    ],
  },
  {
    title: '2. Account Responsibilities',
    body: [
      'You must provide accurate account, vehicle, supplier, business, stock, and pricing information when using Partify.',
      'You are responsible for keeping your login details secure and for any activity that happens through your account.',
    ],
  },
  {
    title: '3. Vehicle And Part Compatibility',
    body: [
      'Partify uses vehicle details, catalogue data, supplier data, and fitment rules to help match parts to vehicles.',
      'Compatibility results are provided to help users make better decisions, but users and suppliers should still confirm critical fitment details before purchase or installation.',
    ],
  },
  {
    title: '4. Supplier Listings',
    body: [
      'Suppliers are responsible for the accuracy of their stock, pricing, business address, contact details, and catalogue information.',
      'Partify may review, correct, hide, or remove supplier listings that appear inaccurate, duplicated, misleading, unsafe, or unsuitable for the platform.',
    ],
  },
  {
    title: '5. Coupons And Offers',
    body: [
      'Coupons and offers may be limited by time, supplier, stock availability, part availability, and other offer conditions shown in the app.',
      'A coupon does not reserve stock unless the app or supplier explicitly confirms that stock has been reserved.',
    ],
  },
  {
    title: '6. Acceptable Use',
    body: [
      'You may not misuse Partify, attempt unauthorized access, scrape data, submit fraudulent information, interfere with the service, or use the platform to harm users, suppliers, or Partify.',
      'We may suspend or restrict access where we reasonably believe an account is being misused or creates security, legal, or operational risk.',
    ],
  },
  {
    title: '7. Payments And Transactions',
    body: [
      'Unless Partify explicitly provides in-app payment functionality, purchases take place directly between the customer and supplier.',
      'Supplier payment, refund, warranty, exchange, and return terms remain the responsibility of the supplier unless Partify states otherwise in writing.',
    ],
  },
  {
    title: '8. Limitation Of Liability',
    body: [
      'Partify is provided on an as-is and as-available basis. We work to keep information accurate and secure, but we cannot guarantee uninterrupted service or error-free data.',
      'To the maximum extent allowed by South African law, Partify is not liable for indirect losses, lost profits, unavailable stock, supplier mistakes, incorrect user-provided information, or decisions made using platform information.',
    ],
  },
  {
    title: '9. Privacy And POPIA',
    body: [
      'Our handling of personal information is described in the Privacy Policy. By using Partify, you acknowledge that your personal information will be processed for the purposes explained there.',
    ],
  },
  {
    title: '10. Changes To These Terms',
    body: [
      'We may update these Terms as the product, law, or operating model changes. Material changes will be communicated through reasonable in-app or email notice where required.',
    ],
  },
  {
    title: '11. Contact',
    body: [
      'For support or legal questions, contact Partify support at ctconenquiry@gmail.com or through the in-app WhatsApp support option.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-12">
      <TopBar title="Terms of Service" showBack />

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-sm text-[var(--muted-foreground)] mb-3">Last updated: 30 April 2026</p>
          <h1 className="text-2xl mb-3">Partify Terms of Service</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            These terms explain the rules for using Partify. They are written for launch readiness and should be reviewed by a South African attorney before public launch.
          </p>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <h2 className="text-lg mb-3">{section.title}</h2>
            <div className="space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm text-[var(--muted-foreground)]">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}

        <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-lg mb-3">Related Policy</h2>
          <Link href="/privacy" className="text-sm text-[var(--primary)] underline">
            View Privacy Policy
          </Link>
        </section>
      </main>
    </div>
  );
}
