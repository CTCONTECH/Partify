import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { getAuthContext } from '@/lib/auth/client';
import { formatCouponCode, getCouponTimeRemaining } from '@/lib/coupon';
import { openMapsNavigation } from '@/lib/geolocation';
import { couponService } from '@/lib/services/coupon-service';
import {
  getLiveCouponContext,
  getOrIssueLiveCoupon,
  LiveCouponContext,
} from '@/lib/services/live-coupon-screen-service';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Coupon } from '@/types';
import { AlertCircle, MapPin, Copy, Check, Navigation, Clock, Store, Tag, QrCode, CheckCircle2 } from 'lucide-react';

export function CouponScreen() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.supplierId as string | undefined;
  const partId = params.partId as string | undefined;
  const { location } = useGeolocation(false);

  const [context, setContext] = useState<LiveCouponContext | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [redeemUrl, setRedeemUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRedeemedSuccess, setShowRedeemedSuccess] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const loadCoupon = async () => {
      if (!supplierId || !partId) {
        setError('Coupon link is incomplete.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const auth = await getAuthContext();
        if (!auth.userId) {
          router.replace(`/login?next=/client/coupon/${supplierId}/${partId}`);
          return;
        }

        const liveContext = await getLiveCouponContext(supplierId, partId);
        if (!liveContext) {
          setError('This part is no longer available from this supplier.');
          return;
        }

        const liveCoupon = await getOrIssueLiveCoupon({
          userId: auth.userId,
          supplierId,
          partId,
          inventoryId: liveContext.inventory.id,
          price: liveContext.inventory.price,
          userLocation: location || undefined,
        });

        await couponService.markCouponViewed(liveCoupon.id, auth.userId);
        setContext(liveContext);
        setCoupon(liveCoupon);
      } catch (err: any) {
        setError(err?.message || 'Could not issue coupon. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCoupon();
  }, [supplierId, partId, router, location]);

  useEffect(() => {
    if (!coupon) return;

    const updateTimer = () => {
      setTimeRemaining(getCouponTimeRemaining(coupon));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [coupon]);

  useEffect(() => {
    if (!coupon || coupon.state === 'redeemed') return;

    const interval = window.setInterval(async () => {
      try {
        const latest = await couponService.getCoupon(coupon.id);
        if (latest) {
          setCoupon(latest);
        }
      } catch {
        // Keep the current coupon visible if a background refresh fails.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [coupon]);

  useEffect(() => {
    if (coupon?.state !== 'redeemed') return;

    setShowRedeemedSuccess(true);
    const redirect = window.setTimeout(() => {
      router.replace('/client/home?couponRedeemed=1');
    }, 1600);

    return () => window.clearTimeout(redirect);
  }, [coupon?.state, router]);

  useEffect(() => {
    if (!coupon || typeof window === 'undefined') return;

    setRedeemUrl(`${window.location.origin}/supplier/redeem?code=${encodeURIComponent(coupon.code)}`);
  }, [coupon]);

  useEffect(() => {
    if (!redeemUrl || !qrCanvasRef.current) return;

    QRCode.toCanvas(qrCanvasRef.current, redeemUrl, {
      margin: 1,
      width: 176,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).catch(() => setError('Could not generate coupon QR code.'));
  }, [redeemUrl]);

  const handleCopyCoupon = async () => {
    if (!coupon) return;

    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy coupon code.');
    }
  };

  const handleStartNavigation = async () => {
    if (!context || !coupon) return;

    const auth = await getAuthContext();
    if (auth.userId) {
      await couponService.markNavigationStarted(coupon.id, auth.userId);
    }

    openMapsNavigation(context.supplier.coordinates, context.supplier.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <TopBar title="Coupon" showBack />
        <div className="p-6 max-w-2xl mx-auto">
          <p className="text-sm text-[var(--muted-foreground)]">Preparing your coupon...</p>
        </div>
      </div>
    );
  }

  if (error || !context || !coupon) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <TopBar title="Coupon" showBack />
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error || 'Coupon not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (showRedeemedSuccess) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-700" />
          </div>
          <h1 className="text-2xl mb-2">Coupon Redeemed</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your coupon has been recorded by the supplier.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Your Discount Coupon" showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="bg-gradient-to-br from-[var(--success)] to-green-600 rounded-3xl p-6 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl mb-2">Coupon Ready</h2>
          <p className="text-white/90">You save R {coupon.discountAmount.toFixed(2)}</p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-[var(--secondary)] p-2 rounded-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg mb-1">{context.supplier.name}</h3>
              <div className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{context.supplier.address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Part #{context.part.partNumber}</p>
          <h3 className="text-lg mb-3">{context.part.partName}</h3>

          <div className="space-y-2 py-3 border-t border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted-foreground)]">Original Price</span>
              <span className="line-through text-[var(--muted-foreground)]">
                R {coupon.originalPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[var(--success)]">
              <span>Discount ({coupon.discountPercent}%)</span>
              <span>- R {coupon.discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xl">
              <span>Final Price</span>
              <span className="text-[var(--primary)]">R {coupon.finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[var(--primary)] to-[#BF360C] rounded-2xl p-6 text-white">
          <div className="text-center mb-4">
            <p className="text-white/80 text-sm mb-2">Your Coupon Code</p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-3">
              <p className="text-3xl tracking-wider font-mono">
                {formatCouponCode(coupon.code)}
              </p>
            </div>
            <button
              onClick={handleCopyCoupon}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm active:bg-white/30 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-white/80">
            <Clock className="w-4 h-4" />
            <span>{timeRemaining}</span>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-[var(--foreground)]" />
            <h4 className="text-base">Supplier Scan</h4>
          </div>
          <div className="inline-flex bg-white rounded-2xl p-3 border border-[var(--border)]">
            <canvas ref={qrCanvasRef} width={176} height={176} aria-label="Coupon QR code" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-3">
            Ask the supplier to scan this QR in Partify to verify and redeem your coupon.
          </p>
        </div>

        <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-2xl p-4">
          <h4 className="text-base mb-3">How to Redeem</h4>
          <ol className="space-y-2 text-sm text-[var(--muted-foreground)] list-decimal list-inside">
            <li>Navigate to the supplier using the button below</li>
            <li>Show this coupon code before checkout</li>
            <li>The supplier verifies the code</li>
            <li>Complete your purchase before the coupon expires</li>
          </ol>
        </div>

        <Button
          size="lg"
          fullWidth
          onClick={handleStartNavigation}
          className="mt-6"
        >
          <Navigation className="w-5 h-5 mr-2" />
          Start Navigation in Maps
        </Button>

        <div className="text-center text-xs text-[var(--muted-foreground)] pt-4">
          <p>Single use only. Valid for 24 hours.</p>
          <p>Subject to supplier stock availability.</p>
        </div>
      </div>
    </div>
  );
}
