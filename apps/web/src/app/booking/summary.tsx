import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Tag, Clock, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useCreateOrder, useVerifyPayment, useValidateCoupon, useMockConfirm } from "@/hooks/useBooking";
import { formatPrice } from "@/lib/utils";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const Route = createFileRoute("/booking/summary")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: BookingSummaryPage,
});

function BookingSummaryPage() {
  const navigate = useNavigate();
  const {
    showId, eventTitle, showDate, showTime, selectedItems,
    lockId, lockExpiresAt, couponCode, couponDiscount,
    itemCount, totalAmount, convenienceFee, taxAmount, finalAmount,
    setCoupon, clearCoupon, clearBooking,
  } = useBookingStore();

  const createOrderMutation = useCreateOrder();
  const verifyMutation = useVerifyPayment();
  const mockConfirmMutation = useMockConfirm();
  const validateCouponMutation = useValidateCoupon();

  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Redirect if no valid booking state
  useEffect(() => {
    if (!showId || selectedItems.length === 0 || !lockId) {
      navigate({ to: "/" });
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockExpiresAt) return;
    const update = () => {
      const diff = Math.floor((lockExpiresAt.getTime() - Date.now()) / 1000);
      setTimeLeft(diff);
      if (diff <= 0) {
        clearBooking();
        navigate({ to: "/booking/seats", search: { showId: showId! } });
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lockExpiresAt]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponMsg(null);
    try {
      const result = await validateCouponMutation.mutateAsync({
        code: couponInput.trim(),
        amount: totalAmount(),
      });
      if (result.valid && result.discount != null) {
        setCoupon(couponInput.trim().toUpperCase(), result.discount);
        setCouponMsg({ type: "success", text: result.message });
      } else {
        clearCoupon();
        setCouponMsg({ type: "error", text: result.message });
      }
    } catch {
      setCouponMsg({ type: "error", text: "Failed to validate coupon." });
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponInput("");
    setCouponMsg(null);
  };

  const handlePay = useCallback(async () => {
    setPageError(null);
    if (!showId || !lockId) return;

    try {
      const order = await createOrderMutation.mutateAsync({
        showId,
        lockId,
        items: selectedItems.map((i) => ({ tierId: i.tierId, quantity: i.quantity })),
        couponCode: couponCode ?? undefined,
      });

      // Mock payment mode — skip Razorpay entirely
      if (order.razorpayOrderId.startsWith("mock_")) {
        await mockConfirmMutation.mutateAsync({ bookingId: order.bookingId });
        clearBooking();
        navigate({ to: "/booking/confirmation", search: { ref: order.bookingRef } });
        return;
      }

      // Real Razorpay flow
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPageError("Failed to load payment gateway. Check your connection.");
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        name: "TicketFlow",
        description: eventTitle ?? "Event Booking",
        theme: { color: "#7c3aed" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyMutation.mutateAsync({
              bookingId: order.bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearBooking();
            navigate({ to: "/booking/confirmation", search: { ref: order.bookingRef } });
          } catch {
            setPageError("Payment received but confirmation failed. Contact support with ref: " + order.bookingRef);
          }
        },
        modal: {
          ondismiss: () => {
            setPageError("Payment cancelled. Your seats are still held.");
          },
        },
      });

      rzp.open();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      const code = e.response?.data?.error?.code;
      if (code === "LOCK_EXPIRED") {
        clearBooking();
        setPageError("Your seat hold expired. Please reselect.");
        setTimeout(() => navigate({ to: "/booking/seats", search: { showId: showId! } }), 2000);
      } else {
        setPageError(e.response?.data?.error?.message ?? "Failed to initiate payment.");
      }
    }
  }, [showId, lockId, selectedItems, couponCode, eventTitle]);

  const total = totalAmount();
  const fee = convenienceFee();
  const tax = taxAmount();
  const final = finalAmount();
  const count = itemCount();

  const timerColor =
    timeLeft != null && timeLeft <= 120
      ? "text-destructive"
      : "text-muted-foreground";

  const formatTime = (s: number) => {
    if (s <= 0) return "00:00";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/booking/seats", search: { showId: showId! } })}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="font-semibold">Order Summary</p>
          <p className="text-xs text-muted-foreground truncate">{eventTitle}</p>
        </div>
        {timeLeft != null && timeLeft > 0 && (
          <div className={`flex items-center gap-1 text-sm font-mono font-semibold ${timerColor}`}>
            <Clock className="h-3.5 w-3.5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-6 max-w-lg pb-36 space-y-4">
        {/* Show info */}
        {(showDate || showTime) && (
          <div className="bg-muted/50 rounded-xl p-4 text-sm">
            <p className="font-medium">{eventTitle}</p>
            <p className="text-muted-foreground mt-0.5">
              {showDate} {showTime && `· ${showTime.slice(0, 5)}`}
            </p>
          </div>
        )}

        {/* Tickets breakdown */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-semibold text-sm">
              Tickets ({count})
            </p>
          </div>
          <div className="divide-y">
            {selectedItems.map((item) => (
              <div key={item.tierId} className="px-4 py-3 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.tierName}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} × {formatPrice(item.price)}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coupon */}
        <div className="bg-card border rounded-xl p-4">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4" /> Promo Code
          </p>
          {couponDiscount > 0 ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{couponCode}</span>
                <span className="text-green-600">−{formatPrice(couponDiscount)}</span>
              </div>
              <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                placeholder="Enter promo code"
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase placeholder:normal-case"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={!couponInput.trim() || validateCouponMutation.isPending}
                className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {validateCouponMutation.isPending ? "..." : "Apply"}
              </button>
            </div>
          )}
          {couponMsg && (
            <p
              className={`mt-2 text-xs ${
                couponMsg.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"
              }`}
            >
              {couponMsg.text}
            </p>
          )}
        </div>

        {/* Price breakdown */}
        <div className="bg-card border rounded-xl p-4 space-y-2.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount</span>
              <span>−{formatPrice(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Convenience fee (2%)</span>
            <span>{formatPrice(fee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST (18%)</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span>{formatPrice(final)}</span>
          </div>
        </div>

        {pageError && (
          <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{pageError}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          By proceeding you agree to our Terms &amp; Conditions. Tickets once booked are
          non-refundable unless the event is cancelled.
        </p>
      </div>

      {/* Sticky pay button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t shadow-lg px-4 py-3 z-20">
        <div className="container mx-auto max-w-lg">
          <button
            onClick={handlePay}
            disabled={createOrderMutation.isPending || verifyMutation.isPending || mockConfirmMutation.isPending}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-70 transition-opacity text-base flex items-center justify-center gap-2"
          >
            {createOrderMutation.isPending || verifyMutation.isPending || mockConfirmMutation.isPending ? (
              <>
                <span className="h-5 w-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatPrice(final)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
