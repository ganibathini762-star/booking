import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────

export type AdminStats = {
  totalUsers: number;
  totalEvents: number;
  paidBookings: number;
  totalRevenue: number;
  pendingVenues: number;
  pendingEvents: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "organizer" | "admin";
  avatarUrl: string | null;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
};

export type AdminEvent = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "cancelled" | "completed";
  isFeatured: boolean;
  createdAt: string;
  category: { id: string; name: string } | null;
  venue: { id: string; name: string; city: string } | null;
  organizer: { id: string; name: string; email: string } | null;
};

export type AdminVenue = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  isApproved: boolean;
  createdAt: string;
};

// ── Query Keys ────────────────────────────────────────────────────

const adminKeys = {
  stats: () => ["admin", "stats"] as const,
  users: (page: number, q?: string) => ["admin", "users", page, q] as const,
  events: (page: number, status?: string) => ["admin", "events", page, status] as const,
  venues: () => ["admin", "venues", "pending"] as const,
};

// ── Stats ─────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminStats>>("/admin/stats");
      return res.data.data!;
    },
  });
}

// ── Users ─────────────────────────────────────────────────────────

export function useAdminUsers(page = 1, q?: string) {
  return useQuery({
    queryKey: adminKeys.users(page, q),
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminUser[]>>("/admin/users", {
        params: { page, limit: 20, ...(q ? { q } : {}) },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/ban`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/unban`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "user" | "organizer" | "admin" }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ── Events ────────────────────────────────────────────────────────

export function useAdminEvents(page = 1, status?: string) {
  return useQuery({
    queryKey: adminKeys.events(page, status),
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminEvent[]>>("/admin/events", {
        params: { page, limit: 20, ...(status ? { status } : {}) },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useApproveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.post(`/admin/events/${eventId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useFeatureEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, featured }: { eventId: string; featured: boolean }) =>
      api.post(`/admin/events/${eventId}/feature`, { featured }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "events"] }),
  });
}

export function useCancelAdminEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.post(`/admin/events/${eventId}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

// ── Venues ────────────────────────────────────────────────────────

export function usePendingVenues() {
  return useQuery({
    queryKey: adminKeys.venues(),
    queryFn: async () => {
      const res = await api.get<ApiResponse<AdminVenue[]>>("/venues/pending");
      return res.data.data ?? [];
    },
  });
}

export function useApproveVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (venueId: string) => api.post(`/venues/${venueId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.venues() });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useRejectVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (venueId: string) => api.post(`/venues/${venueId}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.venues() }),
  });
}
