'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Camera, CheckCircle2, ReceiptText, Search, ShieldCheck, Tag, X } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { couponService } from '@/lib/services/coupon-service';
import { Coupon } from '@/types';

interface CouponLookup {
  coupon: Coupon;
  partName: string;
  partNumber: string;
  clientLabel: string;
}

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): {
    detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
  };
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function codeFromScan(value: string): string {
  try {
    const url = new URL(value);
    const scannedCode = url.searchParams.get('code');
    if (scannedCode) return normalizeCode(scannedCode);
  } catch {
    // Plain coupon code scans land here.
  }

  return normalizeCode(value);
}

function formatMoney(value: number): string {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function isExpired(coupon: Coupon): boolean {
  return new Date(coupon.expiresAt).getTime() < Date.now();
}

function statusLabel(coupon: Coupon): string {
  if (coupon.state === 'redeemed') return 'Redeemed';
  if (coupon.state === 'cancelled') return 'Cancelled';
  if (coupon.state === 'expired' || isExpired(coupon)) return 'Expired';
  if (coupon.state === 'navigation_started') return 'Navigation started';
  if (coupon.state === 'opened') return 'Opened';
  return 'Issued';
}

export default function SupplierRedeemPage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<CouponLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopScanner = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const verifyCoupon = useCallback(async (couponCode: string) => {
    if (!couponCode) {
      setError('Enter a coupon code.');
      return;
    }

    setSearching(true);
    setError(null);
    setSuccess(null);
    setLookup(null);

    try {
      const coupon = await couponService.getCouponByCode(couponCode);

      if (!coupon) {
        setError('Coupon not found for this supplier.');
        return;
      }

      if (supplierId && coupon.supplierId !== supplierId) {
        setError('This coupon belongs to another supplier.');
        return;
      }

      const supabase = createClient();
      const { data: part } = coupon.partId
        ? await supabase
            .from('parts')
            .select('part_name, part_number')
            .eq('id', coupon.partId)
            .maybeSingle()
        : { data: null };

      setLookup({
        coupon,
        partName: part?.part_name || 'Part',
        partNumber: part?.part_number || 'Part number pending',
        clientLabel: `Client ${coupon.userId.slice(0, 8)}`,
      });
    } catch (err: any) {
      setError(err?.message || 'Could not verify coupon.');
    } finally {
      setSearching(false);
    }
  }, [supplierId]);

  const startScanner = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!window.BarcodeDetector) {
      setError('QR scanning is not supported by this browser. Type the coupon code instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          window.setTimeout(scan, 250);
          return;
        }

        const results = await detector.detect(videoRef.current);
        const rawValue = results[0]?.rawValue;

        if (rawValue) {
          const scannedCode = codeFromScan(rawValue);
          setCode(scannedCode);
          stopScanner();
          await verifyCoupon(scannedCode);
          return;
        }

        window.setTimeout(scan, 400);
      };

      window.setTimeout(scan, 500);
    } catch {
      stopScanner();
      setError('Could not access the camera. Type the coupon code instead.');
    }
  }, [stopScanner, verifyCoupon]);

  useEffect(() => {
    if (!scanning || !streamRef.current || !videoRef.current) return;

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {
      stopScanner();
      setError('Could not start the camera preview. Type the coupon code instead.');
    });
  }, [scanning, stopScanner]);

  useEffect(() => {
    const loadSupplier = async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/supplier/redeem');
          return;
        }

        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!supplier) {
          router.replace('/supplier/onboarding');
          return;
        }

        setSupplierId(supplier.id);
      } catch (err: any) {
        setError(err?.message || 'Could not load supplier account.');
      } finally {
        setLoading(false);
      }
    };

    loadSupplier();
  }, [router]);

  useEffect(() => {
    if (!supplierId || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const queryCode = params.get('code');
    if (!queryCode) return;

    const couponCode = normalizeCode(queryCode);
    setCode(couponCode);
    void verifyCoupon(couponCode);
    window.history.replaceState(null, '', '/supplier/redeem');
  }, [supplierId, verifyCoupon]);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    await verifyCoupon(normalizeCode(code));
  };


  const handleRedeem = async () => {
    if (!lookup || !supplierId) return;

    setRedeeming(true);
    setError(null);
    setSuccess(null);

    try {
      await couponService.redeemCoupon({
        couponId: lookup.coupon.id,
        redeemedBy: supplierId,
        orderAmount: lookup.coupon.finalPrice,
      });

      setSuccess('Coupon redeemed successfully.');
      setLookup({
        ...lookup,
        coupon: {
          ...lookup.coupon,
          state: 'redeemed',
          redeemedAt: new Date().toISOString(),
        },
      });
      setTimeout(() => router.replace('/supplier/dashboard?redeemed=1'), 1200);
    } catch (err: any) {
      setError(err?.message || 'Could not redeem coupon.');
    } finally {
      setRedeeming(false);
    }
  };

  const canRedeem = lookup
    && !isExpired(lookup.coupon)
    && !['redeemed', 'expired', 'cancelled'].includes(lookup.coupon.state);

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 xl:pl-64">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-700" />
          </div>
          <h1 className="text-2xl mb-2">Coupon Redeemed</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            The sale has been recorded for supplier reporting.
          </p>
        </div>
        <BottomNav role="supplier" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Redeem Coupon" showBack />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto space-y-5">
        <div className="hidden xl:block">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Supplier Checkout</p>
          <h1 className="text-3xl">Redeem Coupon</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Verify a client coupon code or scan the QR before completing the sale.
          </p>
        </div>

        <div className="xl:grid xl:grid-cols-[420px_minmax(0,1fr)] xl:gap-6 xl:items-start">
          <div className="space-y-5">
        <form onSubmit={handleLookup} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-4 xl:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <ReceiptText className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <h2 className="text-lg">Verify Coupon Code</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Enter the client&apos;s Partify code before checkout.</p>
            </div>
          </div>

          <Input
            label="Coupon Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="PFY-ABC12345"
            autoCapitalize="characters"
            disabled={loading || searching || redeeming}
          />

          <Button type="submit" fullWidth disabled={loading || searching || redeeming}>
            <Search className="w-5 h-5 mr-2" />
            {searching ? 'Checking...' : 'Check Coupon'}
          </Button>

          <Button
            type="button"
            variant="outline"
            fullWidth
            disabled={loading || searching || redeeming || scanning}
            onClick={startScanner}
          >
            <Camera className="w-5 h-5 mr-2" />
            Scan QR Code
          </Button>
        </form>

        {scanning && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base">Scan Client Coupon</h3>
              <button
                type="button"
                onClick={stopScanner}
                className="p-2 rounded-lg active:bg-[var(--muted)]"
                aria-label="Stop scanning"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              ref={videoRef}
              className="w-full aspect-video rounded-xl bg-black object-cover"
              playsInline
              muted
            />
            <p className="text-sm text-[var(--muted-foreground)]">
              Point the camera at the QR code on the client&apos;s coupon screen.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 rounded-2xl xl:rounded-lg p-4">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{success}</p>
          </div>
        )}
          </div>

        {lookup && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-4 xl:p-5 space-y-4 mt-5 xl:mt-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{lookup.partNumber}</p>
                <h3 className="text-xl">{lookup.partName}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{lookup.clientLabel}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border border-orange-200 bg-orange-50 text-[var(--primary)]">
                {statusLabel(lookup.coupon)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Original</p>
                <p className="text-base">{formatMoney(lookup.coupon.originalPrice)}</p>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Discount</p>
                <p className="text-base text-[var(--primary)]">
                  {formatMoney(lookup.coupon.discountAmount)}
                </p>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Coupon Price</p>
                <p className="text-base">{formatMoney(lookup.coupon.finalPrice)}</p>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Expires</p>
                <p className="text-sm">{new Date(lookup.coupon.expiresAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-700 mb-1">Redemption Amount</p>
              <p className="text-lg text-green-800">{formatMoney(lookup.coupon.finalPrice)}</p>
            </div>

            <Button fullWidth onClick={handleRedeem} disabled={!canRedeem || redeeming}>
              <Tag className="w-5 h-5 mr-2" />
              {redeeming ? 'Redeeming...' : 'Confirm Redemption'}
            </Button>

            <div className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Redeeming in Partify records this sale for supplier reporting and commission reconciliation.</p>
            </div>
          </div>
        )}

        {!lookup && (
          <div className="hidden xl:flex min-h-72 bg-[var(--card)] border border-[var(--border)] rounded-lg p-8 items-center justify-center text-center">
            <div className="max-w-sm">
              <ShieldCheck className="w-10 h-10 mx-auto text-[var(--muted-foreground)] mb-3" />
              <h2 className="text-xl mb-2">Ready to verify</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Coupon details will appear here after a valid client code is checked or scanned.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
