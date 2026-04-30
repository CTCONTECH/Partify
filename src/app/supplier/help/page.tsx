'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { AlertCircle, FileUp, HelpCircle, MapPin, PackageCheck } from 'lucide-react';

const supportItems = [
  {
    title: 'Importing catalogue updates',
    detail: 'Use Import CSV for full catalogue updates. Approved imports update existing stock and prices without creating duplicate inventory rows.',
    icon: FileUp,
  },
  {
    title: 'Fixing one item',
    detail: 'Go to Inventory and tap the part you want to change. Use this for quick price or stock corrections.',
    icon: PackageCheck,
  },
  {
    title: 'Adding one new part',
    detail: 'Use Add Part from Inventory when you need to add a single part manually instead of uploading a full CSV.',
    icon: PackageCheck,
  },
  {
    title: 'Business address and distance',
    detail: 'Your primary business address is verified on save and used for customer distance results.',
    icon: MapPin,
  },
  {
    title: 'Low stock alerts',
    detail: 'Partify flags supplier items with fewer than 5 units so you can update stock before customers arrive.',
    icon: AlertCircle,
  },
];

export default function SupplierHelpPage() {
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
              <h2 className="text-lg mb-1">Supplier support</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Quick guidance for keeping your catalogue accurate on Partify.
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
            Message Partify support on WhatsApp with your business name and a short description of the issue.
          </p>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => window.location.href = 'https://wa.me/27762949797?text=Hi%20Partify%2C%20I%20need%20supplier%20support.'}
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
