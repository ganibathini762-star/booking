import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Calendar, MapPin, Ticket, Download, Home } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useBooking } from "@/hooks/useBooking";
import { formatPrice } from "@/lib/utils";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const searchSchema = z.object({
  ref: z.string().min(1),
});

export const Route = createFileRoute("/booking/confirmation")({
  validateSearch: searchSchema,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/auth/login" });
  },
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { ref } = Route.useSearch();

  // We store the bookingId from the verify response; for now, look up by ref via my-bookings
  // The confirmation page receives the bookingRef in the URL
  // We use the profile/bookings page for the full list; here show a success screen
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
          <p className="text-muted-foreground mt-2">
            Your tickets have been booked successfully.
          </p>
        </div>

        {/* Booking ref */}
        <div className="bg-muted/50 border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Booking Reference</p>
          <p className="font-mono font-bold text-lg tracking-wider text-primary">{ref}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Save this for your records
          </p>
        </div>

        {/* Info */}
        <div className="bg-card border rounded-xl p-4 text-sm text-left space-y-3">
          <div className="flex items-start gap-3 text-muted-foreground">
            <Ticket className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>Your e-tickets will be available in <strong>My Bookings</strong>.</p>
          </div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>A confirmation has been sent to your registered email.</p>
          </div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>Please carry a valid ID and your e-ticket to the venue.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/profile/bookings"
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            View My Bookings
          </Link>
          <Link
            to="/"
            className="w-full border border-border font-semibold py-3 rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
