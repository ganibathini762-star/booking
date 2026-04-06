import { EventCard } from "./EventCard";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";

type Props = {
  events: Event[];
  loading?: boolean;
  className?: string;
};

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    </div>
  );
}

export function EventGrid({ events, loading, className }: Props) {
  return (
    <div
      className={cn(
        "grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4",
        className
      )}
    >
      {loading
        ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        : events.map((event) => <EventCard key={event.id} event={event} />)}
    </div>
  );
}

export function EventRow({ events, loading, className }: Props) {
  return (
    <div
      className={cn(
        "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide",
        className
      )}
    >
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-36 sm:w-44 rounded-xl border border-border bg-card overflow-hidden animate-pulse snap-start">
              <div className="aspect-[3/4] bg-muted" />
              <div className="p-2 space-y-1.5">
                <div className="h-3 bg-muted rounded" />
                <div className="h-2.5 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))
        : events.map((event) => (
            <div key={event.id} className="flex-shrink-0 w-36 sm:w-44 snap-start">
              <EventCard event={event} />
            </div>
          ))}
    </div>
  );
}
