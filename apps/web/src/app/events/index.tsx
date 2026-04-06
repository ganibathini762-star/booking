import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SlidersHorizontal, X } from "lucide-react";
import { useEvents, useCategories } from "@/hooks/useEvents";
import { useCityStore } from "@/stores/cityStore";
import { EventGrid } from "@/components/events/EventGrid";
import { SearchBar } from "@/components/common/SearchBar";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().default(1),
});

export const Route = createFileRoute("/events/")({
  validateSearch: searchSchema,
  component: EventsPage,
});

function EventsPage() {
  const { q, category, city, page } = Route.useSearch();
  const [showFilters, setShowFilters] = useState(false);
  const { selectedCity } = useCityStore();
  const { data: categories } = useCategories();

  const activeCity = city || selectedCity;
  const { data, isLoading } = useEvents({ q, category, city: activeCity, page });

  const events = data?.data ?? [];
  const meta = data?.meta;

  const hasActiveFilters = !!(q || category);

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">
          {q ? `Results for "${q}"` : category ? `${categories?.find(c => c.slug === category)?.name ?? category}` : `Events in ${activeCity}`}
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${showFilters ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
        </button>
      </div>

      {/* Search */}
      <SearchBar className="mb-4" />

      {/* Filter chips */}
      {(hasActiveFilters || showFilters) && (
        <div className="mb-4 p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-medium">Filter by Category</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/events"
              search={{ city: activeCity !== selectedCity ? activeCity : undefined }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!category ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >
              All
            </Link>
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to="/events"
                search={{ category: cat.slug, city: activeCity !== selectedCity ? activeCity : undefined }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${category === cat.slug ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {hasActiveFilters && (
            <Link to="/events" className="flex items-center gap-1 text-xs text-destructive hover:underline w-fit">
              <X className="h-3 w-3" /> Clear filters
            </Link>
          )}
        </div>
      )}

      {/* Results count */}
      {meta && !isLoading && (
        <p className="text-sm text-muted-foreground mb-4">
          {meta.total} event{meta.total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Grid */}
      <EventGrid events={events} loading={isLoading} />

      {/* No results */}
      {!isLoading && events.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🎟️</p>
          <p className="text-lg font-medium">No events found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search</p>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link to="/events" search={{ q, category, city: activeCity !== selectedCity ? activeCity : undefined, page: page - 1 }}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
              Previous
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {page} of {meta.totalPages}
          </span>
          {page < meta.totalPages && (
            <Link to="/events" search={{ q, category, city: activeCity !== selectedCity ? activeCity : undefined, page: page + 1 }}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
