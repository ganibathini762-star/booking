export type UserRole = "user" | "organizer" | "admin";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type TicketStatus = "valid" | "used" | "cancelled" | "expired";

export type SeatType = "regular" | "premium" | "disabled" | "blocked";

export type NotificationType = "email" | "push" | "sms";

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
