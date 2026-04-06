import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";

export type AppNotification = {
  id: string;
  type: "email" | "push" | "sms";
  title: string;
  body: string;
  isRead: boolean;
  sentAt: string;
  createdAt: string;
};

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<{ notifications: AppNotification[]; unreadCount: number }>
      >("/notifications/my");
      return res.data.data!;
    },
    enabled,
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
