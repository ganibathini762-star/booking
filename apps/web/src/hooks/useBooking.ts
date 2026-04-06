import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api";
import type {
  Booking,
  LockResult,
  OrderResult,
  CouponResult,
  ShowAvailability,
} from "@/types/booking";

export const bookingKeys = {
  all: ["bookings"] as const,
  my: () => [...bookingKeys.all, "my"] as const,
  detail: (id: string) => [...bookingKeys.all, id] as const,
  showAvailability: (showId: string) => ["show", showId, "availability"] as const,
};

// ── Show availability ─────────────────────────────────────────────
export function useShowAvailability(showId: string) {
  return useQuery({
    queryKey: bookingKeys.showAvailability(showId),
    queryFn: async () => {
      const res = await api.get<ApiResponse<ShowAvailability>>(
        `/bookings/shows/${showId}/availability`
      );
      return res.data.data!;
    },
    enabled: !!showId,
    refetchInterval: 15_000,
  });
}

// ── Lock seats ────────────────────────────────────────────────────
export function useLockSeats() {
  return useMutation({
    mutationFn: async (payload: {
      showId: string;
      items: { tierId: string; quantity: number }[];
    }) => {
      const res = await api.post<ApiResponse<LockResult>>("/bookings/lock", payload);
      return res.data.data!;
    },
  });
}

// ── Validate coupon ───────────────────────────────────────────────
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (payload: { code: string; amount: number }) => {
      const res = await api.post<ApiResponse<CouponResult>>(
        "/bookings/validate-coupon",
        payload
      );
      return res.data.data!;
    },
  });
}

// ── Create Razorpay order ─────────────────────────────────────────
export function useCreateOrder() {
  return useMutation({
    mutationFn: async (payload: {
      showId: string;
      lockId: string;
      items: { tierId: string; quantity: number }[];
      couponCode?: string;
    }) => {
      const res = await api.post<ApiResponse<OrderResult>>(
        "/bookings/create-order",
        payload
      );
      return res.data.data!;
    },
  });
}

// ── Verify payment ────────────────────────────────────────────────
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      const res = await api.post<ApiResponse<Booking>>(
        "/bookings/verify-payment",
        payload
      );
      return res.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
    },
  });
}

// ── My bookings ───────────────────────────────────────────────────
export function useMyBookings(page = 1) {
  return useQuery({
    queryKey: [...bookingKeys.my(), page],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Booking[]>>("/bookings/my", {
        params: { page, limit: 10 },
      });
      return res.data;
    },
  });
}

// ── Single booking ────────────────────────────────────────────────
export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<ApiResponse<Booking>>(`/bookings/${id}`);
      return res.data.data!;
    },
    enabled: !!id,
  });
}

// ── Mock payment confirm (dev only, MOCK_PAYMENT=true) ───────────
export function useMockConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bookingId: string }) => {
      const res = await api.post<ApiResponse<{ bookingRef: string; status: string; paymentId: string }>>(
        "/payments/mock-confirm",
        payload
      );
      return res.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
    },
  });
}

// ── Cancel booking ────────────────────────────────────────────────
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post<ApiResponse<Booking>>(
        `/bookings/${bookingId}/cancel`
      );
      return res.data.data!;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
    },
  });
}
