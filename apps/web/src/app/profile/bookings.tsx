import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useMyBookings, useBooking, useCancelBooking } from "@/hooks/useBooking";
import { formatDate, formatPrice } from "@/lib/utils";
import { PageLoader } from "@/components/common/LoadingSpinner";
import {
  Ticket, ChevronRight, ChevronDown, ChevronUp,
  MapPin, Calendar, QrCode, AlertCircle, X,
} from "lucide-react";
import type { Booking } from "@/types/booking";

export const Route = createFileRoute("/profile/bookings")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: BookingsPage,
});

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

// ── Ticket detail panel (fetched on expand) ───────────────────────────────────
function BookingDetailPanel({ bookingId }: { bookingId: string }) {
  const { data: booking, isLoading } = useBooking(bookingId);
  const { mutate: cancel, isPending: cancelling } = useCancelBooking();
  const [cancelConfirm, setCancelConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground animate-pulse">
        Loading tickets…
      </div>
    );
  }

  if (!booking) return null;

  const allTickets = booking.items?.flatMap((item) => item.tickets ?? []) ?? [];
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
      {/* Price breakdown */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(parseFloat(booking.totalAmount))}</span>
        </div>
        {parseFloat(booking.convenienceFee) > 0 && (
          <div className="flex justify-between">
            <span>Convenience fee</span>
            <span>{formatPrice(parseFloat(booking.convenienceFee))}</span>
          </div>
        )}
        {parseFloat(booking.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span>GST (18%)</span>
            <span>{formatPrice(parseFloat(booking.taxAmount))}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
          <span>Total paid</span>
          <span>{formatPrice(parseFloat(booking.finalAmount))}</span>
        </div>
      </div>

      {/* Tickets */}
      {booking.status === "confirmed" && allTickets.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5" />
            Your Tickets
          </p>
          {allTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-4">
              <img
                src={`${import.meta.env.VITE_API_URL}/tickets/${ticket.ticketCode}/qr`}
                alt={`QR for ${ticket.ticketCode}`}
                width={80}
                height={80}
                className="rounded-md shrink-0 border border-border bg-white"
              />
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold truncate">{ticket.ticketCode}</p>
                <StatusBadge status={ticket.status} />
                {ticket.scannedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Scanned {formatDate(ticket.scannedAt)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : booking.status === "confirmed" && allTickets.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Tickets are being generated. Refresh in a moment.</span>
        </div>
      ) : null}

      {/* Cancel */}
      {canCancel && (
        <div>
          {cancelConfirm ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-red-600 flex-1">Cancel this booking?</p>
              <button
                onClick={() => { cancel(bookingId); setCancelConfirm(false); }}
                disabled={cancelling}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md font-medium disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCancelConfirm(true)}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" />
              Cancel booking
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, expanded, onToggle }: {
  booking: Booking;
  expanded: boolean;
  onToggle: () => void;
}) {
  const eventTitle = booking.show?.event?.title;
  const venue = booking.show?.event?.venue;
  const showDate = booking.show?.showDate;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
      >
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          {eventTitle && (
            <p className="font-semibold text-sm truncate">{eventTitle}</p>
          )}
          <p className="font-mono text-xs text-muted-foreground mt-0.5">{booking.bookingRef}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {showDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(showDate)}
              </span>
            )}
            {venue?.name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {venue.city ?? venue.name}
              </span>
            )}
          </div>
        </div>

        {/* Right: amount + status + chevron */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <p className="font-semibold text-sm">{formatPrice(parseFloat(booking.finalAmount))}</p>
          <StatusBadge status={booking.status} />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && <BookingDetailPanel bookingId={booking.id} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function BookingsPage() {
  const { data, isLoading } = useMyBookings(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;

  const bookings: Booking[] = (data?.data as unknown as Booking[]) ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl pb-20 md:pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/profile" className="text-muted-foreground hover:text-foreground text-sm">
          Profile
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">My Bookings</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Your tickets will appear here after booking</p>
          <Link to="/events" className="text-primary hover:underline text-sm mt-4 inline-block">
            Browse events
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              expanded={expandedId === b.id}
              onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
