import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { eventId: string; rating: number; content?: string }) =>
      api.post("/reviews", data),
    onSuccess: (_, vars) => {
      // Invalidate the event query so reviews re-fetch
      qc.invalidateQueries({ queryKey: ["event"] });
    },
  });
}
