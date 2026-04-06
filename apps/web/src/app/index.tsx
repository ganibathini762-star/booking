import { createFileRoute, Link } from "@tanstack/react-router";
import { useCityStore } from "@/stores/cityStore";
import { useFeaturedEvents, useTrendingEvents, useUpcomingEvents, useCategories } from "@/hooks/useEvents";
import { EventGrid, EventRow } from "@/components/events/EventGrid";
import { SearchBar } from "@/components/common/SearchBar";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const CATEGORY_ICONS: Record<string, string> = {
  movies: "🎬", concerts: "🎵", sports: "⚽", theatre: "🎭",
  comedy: "😂", kids: "🧸", festivals: "🎉",
};

function HomePage() {
  const { selectedCity } = useCityStore();
  const { data: categories, isLoading: catLoading } = useCategories();
  const { data: featured, isLoading: featLoading } = useFeaturedEvents();
  const { data: trending, isLoading: trendLoading } = useTrendingEvents();
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingEvents();

  return (
    <div className="pb-20 md:pb-0">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-10 lg:py-16">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 leading-tight">
            Book Your Next Experience
          </h1>
          <p className="text-indigo-200 text-sm sm:text-base mb-6">
            Movies, Concerts, Sports &amp; More in {selectedCity}
          </p>
          <SearchBar className="max-w-xl" />
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 space-y-10">
        {/* Category Pills */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <Link
              to="/events"
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              All Events
            </Link>
            {catLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 h-9 w-24 rounded-full bg-muted animate-pulse" />
                ))
              : categories?.map((cat) => (
                  <Link
                    key={cat.id}
                    to="/events"
                    search={{ category: cat.slug }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <span>{CATEGORY_ICONS[cat.slug] ?? "🎟️"}</span>
                    {cat.name}
                  </Link>
                ))}
          </div>
        </section>

        {/* Featured Events */}
        {(featLoading || (featured && featured.length > 0)) && (
          <section>
            <SectionHeader title="Featured Events" href="/events?featured=true" />
            <EventGrid events={featured ?? []} loading={featLoading} />
          </section>
        )}

        {/* Upcoming Events */}
        {(upcomingLoading || (upcoming && upcoming.length > 0)) && (
          <section>
            <SectionHeader title={`Upcoming in ${selectedCity}`} href="/events" />
            <EventRow events={upcoming ?? []} loading={upcomingLoading} />
          </section>
        )}

        {/* Trending */}
        {(trendLoading || (trending && trending.length > 0)) && (
          <section>
            <SectionHeader title="Trending Now" href="/events" />
            <EventGrid events={trending ?? []} loading={trendLoading} />
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">{title}</h2>
      <Link to={href} className="flex items-center gap-1 text-sm text-primary hover:underline">
        See all <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
