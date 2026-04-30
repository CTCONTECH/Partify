'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { Bell, Car, HelpCircle, MapPin, Search, Ticket } from 'lucide-react';

const supportItems = [
  {
    title: 'Finding compatible parts',
    detail: 'Use Fits My Vehicle to see parts matched to your saved vehicle first. Switch to All Parts when you want to browse the full catalogue.',
    icon: Search,
  },
  {
    title: 'Keeping vehicle details accurate',
    detail: 'Your saved vehicle powers compatibility results. Update it from Profile if the make, model, year, or engine is wrong.',
    icon: Car,
  },
  {
    title: 'Comparing suppliers',
    detail: 'Supplier results compare live stock, price, distance, fuel estimate, and total cost so you can choose the best option.',
    icon: MapPin,
  },
  {
    title: 'Using coupons',
    detail: 'When you select a supplier, Partify issues a coupon you can show at the store before it expires.',
    icon: Ticket,
  },
  {
    title: 'Notifications',
    detail: 'Client alerts show useful updates like compatible parts becoming available or coupons that need attention.',
    icon: Bell,
  },
];

export default function ClientHelpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Help & Support" showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg mb-1">Client support</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Quick guidance for finding the right part and choosing a supplier.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {supportItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[var(--foreground)]" />
                  </div>
                  <div>
                    <h3 className="text-base mb-1">{item.title}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-base mb-2">Need direct help?</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Message Partify support on WhatsApp with your vehicle details and a short description of what you need.
          </p>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => window.location.href = 'https://wa.me/27762949797?text=Hi%20Partify%2C%20I%20need%20help%20finding%20a%20part.'}
          >
            WhatsApp Support
          </Button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <h3 className="text-base mb-2">Legal and privacy</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-[var(--primary)] underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-[var(--primary)] underline">
              Privacy Policy
            </Link>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          fullWidth
          className="text-[var(--foreground)]"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
