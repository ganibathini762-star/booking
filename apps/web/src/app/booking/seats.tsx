import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Minus, Plus, Clock, ChevronLeft, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useShowAvailability, useLockSeats } from "@/hooks/useBooking";
import { formatDate, formatPrice } from "@/lib/utils";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const searchSchema = z.object({
  showId: z.string().uuid(),
});

export const Route = createFileRoute("/booking/seats")({
  validateSearch: searchSchema,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: SeatSelectionPage,
});

function SeatSelectionPage() {
  const { showId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: show, isLoading, isError } = useShowAvailability(showId);
  const { setShow, setItem, selectedItems, itemCount, totalAmount, clearBooking, setLock } =
    useBookingStore();
  const lockMutation = useLockSeats();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setShow({
        showId: show.id,
        eventTitle: show.event?.title ?? "",
        showDate: show.showDate,
        showTime: show.showTime,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !show) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <p className="font-medium">Show not found or unavailable.</p>
      </div>
    );
  }

  const getQty = (tierId: string) =>
    selectedItems.find((i) => i.tierId === tierId)?.quantity ?? 0;

  const handleQty = (
    tierId: string,
    tierName: string,
    price: number,
    max: number,
    available: number,
    delta: number
  ) => {
    setError(null);
    const current = getQty(tierId);
    const next = current + delta;
    if (next < 0) return;
    if (next > max) {
      setError(`Max ${max} tickets per booking for ${tierName}.`);
      return;
    }
    if (next > available) {
      setError(`Only ${available} tickets left for ${tierName}.`);
      return;
    }
    setItem(tierId, tierName, price, next);
  };

  const handleProceed = async () => {
    setError(null);
    if (itemCount() === 0) {
      setError("Please select at least one ticket.");
      return;
    }
    try {
      const result = await lockMutation.mutateAsync({
        showId,
        items: selectedItems.map((i) => ({ tierId: i.tierId, quantity: i.quantity })),
      });
      setLock(result.lockId, new Date(result.expiresAt));
      navigate({ to: "/booking/summary" });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      const code = e.response?.data?.error?.code;
      const msg = e.response?.data?.error?.message;
      if (code === "INSUFFICIENT_SEATS") setError(msg ?? "Not enough seats available.");
      else if (code === "MAX_EXCEEDED") setError(msg ?? "Too many tickets selected.");
      else setError("Failed to hold seats. Please try again.");
    }
  };

  const count = itemCount();
  const total = totalAmount();
  const eventTitle = show.event?.title ?? "Event";
  const venueName = show.event?.venue?.name ?? "";
  const venueCity = show.event?.venue?.city ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            clearBooking();
            history.back();
          }}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{eventTitle}</p>
          <p className="text-xs text-muted-foreground">
            {[venueName, venueCity].filter(Boolean).join(", ")}
            {show.showDate && ` · ${formatDate(show.showDate)}`}
            {show.showTime && ` · ${show.showTime.slice(0, 5)}`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-lg pb-36">
        <h2 className="text-lg font-bold mb-1">Select Tickets</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Choose your ticket category and quantity
        </p>

        {show.ticketTiers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No tickets available for this show.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {show.ticketTiers.map((tier) => {
              const qty = getQty(tier.id);
              const price = parseFloat(tier.price);
              const isSoldOut = tier.availableQuantity === 0;
              const isSelected = qty > 0;
              const maxAllowed = Math.min(tier.maxPerBooking, tier.availableQuantity);

              return (
                <div
                  key={tier.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isSoldOut
                      ? "opacity-50 bg-muted/30"
                      : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{tier.name}</p>
                        {isSoldOut ? (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                            Sold Out
                          </span>
                        ) : tier.availableQuantity <= 10 ? (
                          <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                            {tier.availableQuantity} left
                          </span>
                        ) : null}
                      </div>
                      <p className="text-primary font-bold text-lg mt-1">
                        {formatPrice(price)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        per ticket · max {tier.maxPerBooking}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        disabled={qty === 0 || isSoldOut}
                        onClick={() =>
                          handleQty(tier.id, tier.name, price, tier.maxPerBooking, tier.availableQuantity, -1)
                        }
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-bold tabular-nums text-base">
                        {qty}
                      </span>
                      <button
                        disabled={isSoldOut || qty >= maxAllowed}
                        onClick={() =>
                          handleQty(tier.id, tier.name, price, tier.maxPerBooking, tier.availableQuantity, 1)
                        }
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-sm">
                      <span className="text-muted-foreground">{qty} × {formatPrice(price)}</span>
                      <span className="font-semibold">{formatPrice(price * qty)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            Tickets are held for <strong>10 minutes</strong> once you proceed. Complete payment
            within this time.
          </p>
        </div>
      </div>

      {/* Sticky bottom bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t shadow-lg px-4 py-3 z-20">
          <div className="container mx-auto max-w-lg flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {count} ticket{count !== 1 ? "s" : ""}
              </p>
              <p className="font-bold text-xl">{formatPrice(total)}</p>
              <p className="text-xs text-muted-foreground">+ taxes & fees</p>
            </div>
            <button
              onClick={handleProceed}
              disabled={lockMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold px-7 py-3 rounded-xl hover:opacity-90 disabled:opacity-70 transition-opacity flex items-center gap-2 shrink-0 text-sm"
            >
              {lockMutation.isPending ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Holding seats...
                </>
              ) : (
                "Proceed →"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
