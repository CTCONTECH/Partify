import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { TopBar } from '../../components/TopBar';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { mockParts, mockInventory, mockSuppliers } from '../../data/mockData';
import { createCoupon, formatCouponCode, getCouponTimeRemaining, updateCouponState } from '../../../lib/coupon';
import { openMapsNavigation } from '../../../lib/geolocation';
import { Coupon } from '../../../types';
import { MapPin, Copy, Check, Navigation, Clock, Store, Tag } from 'lucide-react';

export function CouponScreen() {
  const { supplierId, partId } = useParams<{ supplierId: string; partId: string }>();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  const supplier = supplierId ? mockSuppliers.find(s => s.id === supplierId) : null;
  const part = partId ? mockParts.find(p => p.id === partId) : null;
  const inventoryItem = (supplierId && partId) ? mockInventory.find(
    inv => inv.partId === partId && inv.supplierId === supplierId
  ) : null;

  useEffect(() => {
    if (!supplierId || !partId) return;

    // Generate or retrieve coupon
    const storedCoupon = localStorage.getItem(`coupon_${supplierId}_${partId}`);

    if (storedCoupon) {
      const parsed = JSON.parse(storedCoupon);
      setCoupon(parsed);
      updateCouponState(parsed.id, 'opened');
    } else if (inventoryItem) {
      const newCoupon = createCoupon(
        'user_123', // Mock user ID
        supplierId,
        partId,
        inventoryItem.price,
        5 // 5% discount
      );
      setCoupon(newCoupon);
      localStorage.setItem(`coupon_${supplierId}_${partId}`, JSON.stringify(newCoupon));
      updateCouponState(newCoupon.id, 'opened');
    }
  }, [supplierId, partId, inventoryItem]);

  useEffect(() => {
    if (!coupon) return;

    const updateTimer = () => {
      setTimeRemaining(getCouponTimeRemaining(coupon));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [coupon]);

  const handleCopyCoupon = async () => {
    if (!coupon) return;

    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartNavigation = () => {
    if (!supplier || !coupon) return;

    updateCouponState(coupon.id, 'navigation_started');
    openMapsNavigation(supplier.coordinates, supplier.name);
  };

  if (!supplier || !part || !inventoryItem || !coupon) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <TopBar title="Coupon" showBack />
        <div className="p-6 text-center">
          <p className="text-[var(--muted-foreground)]">Coupon not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Your Discount Coupon" showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {/* Success Banner */}
        <div className="bg-gradient-to-br from-[var(--success)] to-green-600 rounded-3xl p-6 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl mb-2">Coupon Generated!</h2>
          <p className="text-white/90">You saved R {coupon.discountAmount.toFixed(2)}</p>
        </div>

        {/* Supplier Info */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-[var(--secondary)] p-2 rounded-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg mb-1">{supplier.name}</h3>
              <div className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{supplier.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Part & Pricing */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Part #{part.partNumber}</p>
          <h3 className="text-lg mb-3">{part.partName}</h3>

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

        {/* Coupon Code */}
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
                  Copied!
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

        {/* Instructions */}
        <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-2xl p-4">
          <h4 className="text-base mb-3">How to Redeem</h4>
          <ol className="space-y-2 text-sm text-[var(--muted-foreground)] list-decimal list-inside">
            <li>Navigate to the store using the button below</li>
            <li>Show this coupon code at checkout</li>
            <li>Staff will verify and apply your discount</li>
            <li>Complete your purchase and save!</li>
          </ol>
        </div>

        {/* Navigation Button */}
        <Button
          size="lg"
          fullWidth
          onClick={handleStartNavigation}
          className="mt-6"
        >
          <Navigation className="w-5 h-5 mr-2" />
          Start Navigation in Maps
        </Button>

        {/* Terms */}
        <div className="text-center text-xs text-[var(--muted-foreground)] pt-4">
          <p>• Single use only • Valid for 24 hours</p>
          <p>• Cannot be combined with other offers</p>
          <p>• Subject to stock availability</p>
        </div>
      </div>
    </div>
  );
}
