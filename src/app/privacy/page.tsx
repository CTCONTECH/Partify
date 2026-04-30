import Link from 'next/link';
import { TopBar } from '@/components/TopBar';

const privacySections = [
  {
    title: '1. Our POPIA Commitment',
    body: [
      'Partify is built for South Africa and treats POPIA compliance as a launch requirement, not an afterthought.',
      'We aim to process personal information lawfully, minimally, transparently, securely, and only for clear platform purposes.',
    ],
  },
  {
    title: '2. Personal Information We Collect',
    body: [
      'Account information: name, email address, phone number, role, login details, and account status.',
      'Client information: saved vehicle details, searches, selected suppliers, coupons, approximate or browser-provided location where permission is granted, and support messages.',
      'Supplier information: business name, business address, suburb, location coordinates used for distance results, catalogue uploads, inventory, prices, stock levels, import history, activity events, and support messages.',
      'Technical information: device/browser data, session data, logs, security events, and app usage needed to protect and operate the service.',
    ],
  },
  {
    title: '3. Why We Use Personal Information',
    body: [
      'To create and secure user accounts.',
      'To match customers with compatible parts and nearby suppliers.',
      'To calculate supplier distance, fuel estimates, stock availability, and total cost estimates.',
      'To support supplier catalogue imports, inventory updates, coupons, notifications, and customer support.',
      'To prevent fraud, abuse, unauthorized access, and data breaches.',
      'To comply with legal, accounting, tax, security, and regulatory duties where applicable.',
    ],
  },
  {
    title: '4. Legal Basis For Processing',
    body: [
      'We process personal information where it is necessary to provide the Partify service, where the user has given consent, where we have a legitimate operational or security interest, or where the law requires processing.',
      'Users may object to certain processing or withdraw consent where POPIA allows it, but some information may be required to keep an account or supplier listing active.',
    ],
  },
  {
    title: '5. Location Information',
    body: [
      'Clients may allow browser location so Partify can calculate distance and fuel estimates. If permission is denied, Partify may use an approximate Cape Town fallback.',
      'Supplier business location is used to show customers where a supplier is located and to calculate nearest-supplier results.',
    ],
  },
  {
    title: '6. Sharing Information',
    body: [
      'We do not sell personal information.',
      'We may share necessary information with service providers who help operate Partify, including hosting, authentication, database, email, analytics, security, and support providers.',
      'We may show supplier business information to clients where needed for search results, coupons, navigation, and supplier comparison.',
      'We may disclose information if required by law, legal process, security investigation, or regulator request.',
    ],
  },
  {
    title: '7. Security Safeguards',
    body: [
      'We use Supabase authentication, row-level security, access controls, HTTPS in production, least-privilege environment variables, and database policies to reduce unauthorized access risk.',
      'No system is risk-free. If we become aware of unauthorized access to personal information, we will investigate and take required notification steps under POPIA.',
    ],
  },
  {
    title: '8. Retention',
    body: [
      'We keep personal information only for as long as needed for the purpose collected, platform operation, legal duties, dispute handling, fraud prevention, security, or audit requirements.',
      'When information is no longer needed, it will be deleted, anonymized, or securely retained only where lawful.',
    ],
  },
  {
    title: '9. Your Rights',
    body: [
      'You may request access to your personal information.',
      'You may ask us to correct inaccurate or incomplete information.',
      'You may request deletion or destruction of personal information where POPIA allows it.',
      'You may object to certain processing or ask who has received your personal information.',
      'You may lodge a complaint with the South African Information Regulator.',
    ],
  },
  {
    title: '10. Children',
    body: [
      'Partify is not intended for children. Users should be at least 18 years old or have appropriate legal permission to use the service.',
    ],
  },
  {
    title: '11. Cross-Border Processing',
    body: [
      'Some technology providers may process or store information outside South Africa. Where this happens, we will use providers and safeguards intended to protect personal information appropriately.',
    ],
  },
  {
    title: '12. Contact And Privacy Requests',
    body: [
      'For privacy requests, corrections, deletion requests, or security concerns, contact Partify at ctconenquiry@gmail.com or through the in-app support channel.',
      'Before acting on privacy requests, we may need to verify your identity to protect your account and prevent unauthorized disclosure.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-12">
      <TopBar title="Privacy Policy" showBack />

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-sm text-[var(--muted-foreground)] mb-3">Last updated: 30 April 2026</p>
          <h1 className="text-2xl mb-3">Partify Privacy Policy</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            This policy explains how Partify handles personal information under South Africa's Protection of Personal Information Act.
          </p>
        </section>

        {privacySections.map((section) => (
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
          <h2 className="text-lg mb-3">Related Terms</h2>
          <Link href="/terms" className="text-sm text-[var(--primary)] underline">
            View Terms of Service
          </Link>
        </section>
      </main>
    </div>
  );
}
