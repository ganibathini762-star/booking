import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin, Calendar, Clock, Star, Share2, Heart,
  Play, ChevronRight, Globe
} from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import { useCreateReview } from "@/hooks/useReviews";
import { useAuthStore } from "@/stores/authStore";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { formatDate, formatDateTime, formatPrice, cn } from "@/lib/utils";
import type { Review } from "@/types/event";

export const Route = createFileRoute("/events/$slug")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { data: event, isLoading, error } = useEvent(slug);
  const [activeTab, setActiveTab] = useState<"about" | "reviews">("about");

  if (isLoading) return <PageLoader />;
  if (error || !event) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-5xl mb-4">😔</p>
      <h2 className="text-xl font-semibold">Event not found</h2>
      <Link to="/events" className="text-primary hover:underline mt-2 inline-block">Browse events</Link>
    </div>
  );

  const minPrice = event.shows.flatMap(s => s.ticketTiers).reduce<number | null>((min, t) => {
    const p = parseFloat(t.price);
    return min === null || p < min ? p : min;
  }, null);

  const avgRating = event.reviews.length
    ? (event.reviews.reduce((sum, r) => sum + r.rating, 0) / event.reviews.length).toFixed(1)
    : null;

  return (
    <div className="pb-24 md:pb-6">
      {/* Banner */}
      <div className="relative w-full aspect-video lg:aspect-[21/9] bg-muted overflow-hidden">
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-8xl">🎟️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Trailer button */}
        {event.trailerUrl && (
          <a href={event.trailerUrl} target="_blank" rel="noopener noreferrer"
            className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-white text-sm backdrop-blur-sm hover:bg-white/30 transition-colors">
            <Play className="h-3.5 w-3.5 fill-white" /> Watch Trailer
          </a>
        )}

        {/* Share */}
        <button className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Left: Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title + meta */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {event.category && (
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {event.category.name}
                    </span>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold mt-1 leading-tight">{event.title}</h1>
                </div>
                <button className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {avgRating && (
                  <span className="flex items-center gap-1 text-yellow-500 font-medium">
                    <Star className="h-4 w-4 fill-yellow-500" />
                    {avgRating} ({event.reviews.length} reviews)
                  </span>
                )}
                {event.language && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" /> {event.language}
                  </span>
                )}
                {event.ageRating && (
                  <span className="px-1.5 py-0.5 border border-border rounded text-xs font-semibold">
                    {event.ageRating}
                  </span>
                )}
              </div>
            </div>

            {/* Date + Venue */}
            <div className="grid sm:grid-cols-2 gap-3">
              {event.startDatetime && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="text-sm font-medium">{formatDateTime(event.startDatetime)}</p>
                  </div>
                </div>
              )}
              {event.venue && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Venue</p>
                    <p className="text-sm font-medium">{event.venue.name}</p>
                    <p className="text-xs text-muted-foreground">{event.venue.city}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs: About / Reviews */}
            <div>
              <div className="flex border-b border-border mb-4">
                {(["about", "reviews"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors",
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {tab === "reviews" && event.reviews.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted text-xs">{event.reviews.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === "about" && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {event.description
                    ? event.description.split("\n").map((p, i) => <p key={i}>{p}</p>)
                    : <p>No description available.</p>}
                  {event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 not-prose">
                      {event.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-muted text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <WriteReviewForm eventId={event.id} />
                  {event.reviews.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No reviews yet. Be the first!</p>
                  ) : (
                    event.reviews.map((review) => <ReviewCard key={review.id} review={review} />)
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Sticky booking panel (desktop) */}
          <div className="hidden lg:block">
            <BookingPanel eventSlug={slug} minPrice={minPrice} showCount={event.shows.length} />
          </div>
        </div>
      </div>

      {/* Sticky bottom bar (mobile) */}
      <div className="lg:hidden fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-background border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            {minPrice !== null ? (
              <>
                <p className="text-xs text-muted-foreground">Starting from</p>
                <p className="text-base font-bold text-primary">{formatPrice(minPrice)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a show</p>
            )}
          </div>
          <Link
            to="/events/$slug/shows"
            params={{ slug }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Book Now <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function BookingPanel({ eventSlug, minPrice, showCount }: { eventSlug: string; minPrice: number | null; showCount: number }) {
  return (
    <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      {minPrice !== null ? (
        <div>
          <p className="text-xs text-muted-foreground">Starting from</p>
          <p className="text-2xl font-bold text-primary">{formatPrice(minPrice)}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Price varies by show</p>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{showCount} show{showCount !== 1 ? "s" : ""} available</span>
      </div>

      <Link
        to="/events/$slug/shows"
        params={{ slug: eventSlug }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
      >
        Select Show <ChevronRight className="h-4 w-4" />
      </Link>

      <p className="text-xs text-muted-foreground text-center">
        Free cancellation available on most shows
      </p>
    </div>
  );
}

function WriteReviewForm({ eventId }: { eventId: string }) {
  const { isAuthenticated } = useAuthStore();
  const { mutate, isPending, isSuccess, isError, error } = useCreateReview();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [content, setContent] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link> to write a review.
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-medium">
        Review submitted! Thank you.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <p className="text-sm font-medium">Write a Review</p>
      {/* Star rating */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(i + 1)}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                i < (hovered || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your experience (optional)"
        rows={3}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {isError && (
        <p className="text-xs text-destructive">
          {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? "Failed to submit review"}
        </p>
      )}
      <button
        onClick={() => mutate({ eventId, rating, content })}
        disabled={rating === 0 || isPending}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {isPending ? "Submitting…" : "Submit Review"}
      </button>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {review.user.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{review.user.name}</p>
            {review.isVerified && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Verified</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("h-3 w-3", i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted")} />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex-shrink-0">{formatDate(review.createdAt)}</p>
      </div>
      {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
    </div>
  );
}
