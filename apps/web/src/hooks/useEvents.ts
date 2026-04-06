import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { Event, EventDetail, EventShow, Category, SearchSuggestion } from "@/types/event";

// ── Query Keys ────────────────────────────────────────────────────
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...eventKeys.lists(), filters] as const,
  featured: () => [...eventKeys.all, "featured"] as const,
  trending: () => [...eventKeys.all, "trending"] as const,
  upcoming: () => [...eventKeys.all, "upcoming"] as const,
  detail: (slug: string) => [...eventKeys.all, "detail", slug] as const,
  shows: (slug: string) => [...eventKeys.all, "shows", slug] as const,
  categories: () => ["categories"] as const,
  search: (q: string) => ["search", "suggestions", q] as const,
};

// ── Categories ────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: eventKeys.categories(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Category[]>>("/categories");
      return res.data.data;
    },
    staleTime: 1000 * 60 * 30, // categories rarely change
  });
}

// ── Featured / Trending / Upcoming ────────────────────────────────
export function useFeaturedEvents() {
  return useQuery({
    queryKey: eventKeys.featured(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Event[]>>("/events/featured");
      return res.data.data;
    },
  });
}

export function useTrendingEvents() {
  return useQuery({
    queryKey: eventKeys.trending(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Event[]>>("/events/trending");
      return res.data.data;
    },
  });
}

export function useUpcomingEvents() {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Event[]>>("/events/upcoming");
      return res.data.data;
    },
  });
}

// ── Event List (paginated) ────────────────────────────────────────
export type EventListParams = {
  page?: number;
  limit?: number;
  category?: string;
  city?: string;
  q?: string;
};

export function useEvents(params: EventListParams = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Event[]>>("/events", { params });
      return res.data;
    },
  });
}

export function useEventsInfinite(params: Omit<EventListParams, "page"> = {}) {
  return useInfiniteQuery({
    queryKey: [...eventKeys.lists(), "infinite", params],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get<ApiResponse<Event[]>>("/events", {
        params: { ...params, page: pageParam, limit: 20 },
      });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => {
      if (!last.meta) return undefined;
      return last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined;
    },
  });
}

// ── Event Detail ──────────────────────────────────────────────────
export function useEvent(slug: string) {
  return useQuery({
    queryKey: eventKeys.detail(slug),
    queryFn: async () => {
      const res = await api.get<ApiResponse<EventDetail>>(`/events/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
  });
}

// ── Shows ─────────────────────────────────────────────────────────
export function useEventShows(slug: string) {
  return useQuery({
    queryKey: eventKeys.shows(slug),
    queryFn: async () => {
      const res = await api.get<ApiResponse<EventShow[]>>(`/events/${slug}/shows`);
      return res.data.data;
    },
    enabled: !!slug,
    refetchInterval: 30_000, // refresh availability every 30s
  });
}

// ── Search Suggestions ────────────────────────────────────────────
export function useSearchSuggestions(q: string) {
  return useQuery({
    queryKey: eventKeys.search(q),
    queryFn: async () => {
      const res = await api.get<ApiResponse<SearchSuggestion[]>>("/search/suggestions", {
        params: { q },
      });
      return res.data.data;
    },
    enabled: q.length >= 2,
    staleTime: 1000 * 30,
  });
}
