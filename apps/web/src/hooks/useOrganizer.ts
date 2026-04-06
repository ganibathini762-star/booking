import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type { Event, EventShow, TicketTier } from "@/types/event";

export const organizerKeys = {
  myEvents: () => ["organizer", "events"] as const,
  shows: (slug: string) => ["organizer", "shows", slug] as const,
};

// ── My events list ────────────────────────────────────────────────
export function useMyEvents() {
  return useQuery({
    queryKey: organizerKeys.myEvents(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Event[]>>("/events/my");
      return res.data.data ?? [];
    },
  });
}

// ── Shows for one event (by slug, includes tiers) ─────────────────
export function useOrganizerShows(slug: string, enabled = true) {
  return useQuery({
    queryKey: organizerKeys.shows(slug),
    queryFn: async () => {
      const res = await api.get<ApiResponse<EventShow[]>>(`/events/${slug}/shows`);
      return res.data.data ?? [];
    },
    enabled: enabled && !!slug,
  });
}

// ── Create event ──────────────────────────────────────────────────
export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      categoryId?: string;
      venueId?: string;
      startDatetime?: string;
      endDatetime?: string;
      language?: string;
      ageRating?: "U" | "UA" | "A";
    }) => {
      const res = await api.post<ApiResponse<Event>>("/events", payload);
      return res.data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: organizerKeys.myEvents() }),
  });
}

// ── Publish event ─────────────────────────────────────────────────
export function usePublishEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await api.post<ApiResponse<Event>>(`/events/${eventId}/publish`);
      return res.data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: organizerKeys.myEvents() }),
  });
}

// ── Cancel event ──────────────────────────────────────────────────
export function useCancelEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await api.post<ApiResponse<Event>>(`/events/${eventId}/cancel`);
      return res.data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: organizerKeys.myEvents() }),
  });
}

// ── Add show to event ─────────────────────────────────────────────
export function useAddShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      showDate,
      showTime,
    }: {
      eventId: string;
      showDate: string;
      showTime: string;
    }) => {
      const res = await api.post<ApiResponse<EventShow>>(`/events/${eventId}/shows`, {
        showDate,
        showTime,
      });
      return res.data.data!;
    },
    // Invalidate all show queries (slug-based key)
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizer", "shows"] }),
  });
}

// ── Add tier to a show ────────────────────────────────────────────
export function useAddTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      showId,
      name,
      price,
      totalQuantity,
      maxPerBooking,
    }: {
      eventId: string;
      showId: string;
      name: string;
      price: number;
      totalQuantity: number;
      maxPerBooking?: number;
    }) => {
      const res = await api.post<ApiResponse<TicketTier>>(
        `/events/${eventId}/shows/${showId}/tiers`,
        { name, price, totalQuantity, maxPerBooking }
      );
      return res.data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizer", "shows"] }),
  });
}
