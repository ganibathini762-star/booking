import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { Event } from "@/types/event";
import { EventGrid } from "@/components/events/EventGrid";
import { SearchBar } from "@/components/common/SearchBar";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();

  const { data, isLoading } = useQuery({
    queryKey: ["search", "results", q],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ events: Event[] }>>("/search", { params: { q } });
      return res.data.data;
    },
    enabled: !!q && q.length >= 2,
  });

  const events = data?.events ?? [];

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <h1 className="text-xl font-bold mb-4">
        {q ? `Results for "${q}"` : "Search Events"}
      </h1>

      <SearchBar className="mb-6 max-w-xl" />

      {!q ? (
        <p className="text-muted-foreground text-sm">Start typing to search for events.</p>
      ) : isLoading ? (
        <EventGrid events={[]} loading />
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No results for "{q}"</p>
          <p className="text-sm mt-1">Try different keywords</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{events.length} result{events.length !== 1 ? "s" : ""}</p>
          <EventGrid events={events} />
        </>
      )}
    </div>
  );
}
