import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Users, Tag } from "lucide-react";
import { useEventShows, useEvent } from "@/hooks/useEvents";
import { useBookingStore } from "@/stores/bookingStore";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { formatPrice, cn } from "@/lib/utils";
import { format, parseISO, isToday, isTomorrow, addDays, isSameDay } from "date-fns";
import type { EventShow } from "@/types/event";

export const Route = createFileRoute("/events/$slug/shows")({
  component: ShowSelectionPage,
});

function ShowSelectionPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: event, isLoading: eventLoading } = useEvent(slug);
  const { data: shows, isLoading: showsLoading } = useEventShows(slug);
  const setShow = useBookingStore((s) => s.setShow);
  const clearBooking = useBookingStore((s) => s.clearBooking);

  // Build unique sorted dates from shows
  const dates = shows
    ? [...new Set(shows.map((s) => s.showDate))].sort()
    : [];

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? dates[0] ?? null;

  const showsForDate = shows?.filter((s) => s.showDate === activeDate) ?? [];

  function handleSelectShow(show: EventShow) {
    clearBooking();
    setShow({ showId: show.id, eventTitle: event?.title ?? "", showDate: show.showDate, showTime: show.showTime });
    navigate({ to: "/booking/seats", search: { showId: show.id } });
  }

  function formatTabDate(dateStr: string) {
    const d = parseISO(dateStr);
    if (isToday(d)) return { label: "Today", sub: format(d, "d MMM") };
    if (isTomorrow(d)) return { label: "Tomorrow", sub: format(d, "d MMM") };
    return { label: format(d, "EEE"), sub: format(d, "d MMM") };
  }

  if (eventLoading || showsLoading) return <PageLoader />;

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-2xl">
      {/* Back */}
      <Link
        to="/events/$slug"
        params={{ slug }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" /> Back to event
      </Link>

      {/* Event mini-header */}
      {event && (
        <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/50">
          {event.bannerUrl ? (
            <img src={event.bannerUrl} alt={event.title} className="h-14 w-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-14 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">🎟️</div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{event.title}</p>
            {event.venue && (
              <p className="text-xs text-muted-foreground truncate">{event.venue.name}, {event.venue.city}</p>
            )}
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold mb-4">Select Date & Show</h2>

      {/* Date pills */}
      {dates.length > 0 ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-5">
            {dates.map((d) => {
              const { label, sub } = formatTabDate(d);
              const active = d === activeDate;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-center min-w-[64px] transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[11px] opacity-80">{sub}</span>
                </button>
              );
            })}
          </div>

          {/* Shows for selected date */}
          {showsForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No shows on this date.</p>
          ) : (
            <div className="space-y-3">
              {showsForDate.map((show) => (
                <ShowCard key={show.id} show={show} onSelect={handleSelectShow} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No shows available</p>
          <p className="text-sm mt-1">Check back later for new show dates</p>
          <Link to="/events" className="text-primary hover:underline text-sm mt-4 inline-block">
            Browse other events
          </Link>
        </div>
      )}
    </div>
  );
}

function ShowCard({ show, onSelect }: { show: EventShow; onSelect: (s: EventShow) => void }) {
  const time = show.showTime.slice(0, 5); // HH:MM
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  const displayTime = `${displayHour}:${String(m).padStart(2, "0")} ${period}`;

  const minPrice = show.ticketTiers.reduce<number | null>((min, t) => {
    const p = parseFloat(t.price);
    return min === null || p < min ? p : min;
  }, null);

  const totalAvail = show.ticketTiers.reduce((sum, t) => sum + t.availableQuantity, 0);
  const isSoldOut = show.status === "soldout" || show.status === "housefull" || totalAvail === 0;
  const isLowStock = !isSoldOut && totalAvail <= 20;

  return (
    <div className={cn(
      "rounded-xl border bg-card transition-all",
      isSoldOut ? "opacity-60 border-border" : "border-border hover:border-primary/50 hover:shadow-sm"
    )}>
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Time */}
        <div className="text-center min-w-[60px]">
          <p className="text-lg font-bold leading-none">{displayTime.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground">{period}</p>
        </div>

        <div className="h-8 w-px bg-border" />

        {/* Tiers */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {show.ticketTiers.map((tier) => (
              <span
                key={tier.id}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium border",
                  tier.availableQuantity === 0
                    ? "line-through text-muted-foreground border-border"
                    : "border-border text-foreground"
                )}
              >
                {tier.name} · {formatPrice(parseFloat(tier.price))}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            {minPrice !== null && (
              <p className="text-xs text-muted-foreground">
                from <span className="font-semibold text-primary">{formatPrice(minPrice)}</span>
              </p>
            )}
            {isLowStock && !isSoldOut && (
              <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">
                Filling Fast
              </span>
            )}
            {isSoldOut && (
              <span className="text-[10px] font-semibold text-destructive uppercase tracking-wide">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Book button */}
        <button
          disabled={isSoldOut}
          onClick={() => onSelect(show)}
          className={cn(
            "flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            isSoldOut
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          Book <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
