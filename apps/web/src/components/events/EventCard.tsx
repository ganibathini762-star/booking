import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Star } from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { Event } from "@/types/event";

type Props = {
  event: Event;
  className?: string;
};

export function EventCard({ event, className }: Props) {
  const minPrice = null; // populated from ticketTiers in Phase 3

  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className={cn(
        "group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200",
        className
      )}
    >
      {/* Banner */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl">🎟️</span>
          </div>
        )}

        {/* Category badge */}
        {event.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
            {event.category.name}
          </span>
        )}

        {/* Featured badge */}
        {event.isFeatured && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/90 text-white">
            <Star className="h-2.5 w-2.5 fill-white" /> Featured
          </span>
        )}

        {/* Language */}
        {event.language && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] bg-black/60 text-white backdrop-blur-sm">
            {event.language}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        {event.venue && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.venue.city}</span>
          </div>
        )}

        {event.startDatetime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{formatDate(event.startDatetime)}</span>
          </div>
        )}

        {minPrice !== null && (
          <p className="text-xs font-semibold text-primary">
            From {formatPrice(minPrice)}
          </p>
        )}
      </div>
    </Link>
  );
}
