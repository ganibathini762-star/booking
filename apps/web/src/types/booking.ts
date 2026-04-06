import type { EventShow, TicketTier } from "./event";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type Ticket = {
  id: string;
  bookingItemId: string;
  ticketCode: string;
  qrUrl: string | null;
  status: "valid" | "used" | "cancelled" | "expired";
  scannedAt: string | null;
};

export type BookingItem = {
  id: string;
  bookingId: string;
  tierId: string;
  seatId: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  tier: TicketTier;
  tickets?: Ticket[];
};

export type Booking = {
  id: string;
  bookingRef: string;
  userId: string;
  showId: string;
  status: BookingStatus;
  totalAmount: string;
  convenienceFee: string;
  taxAmount: string;
  finalAmount: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  bookedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  show?: EventShow & {
    event?: {
      id: string;
      title: string;
      slug: string;
      bannerUrl: string | null;
      venue?: { name: string; city: string } | null;
      category?: { name: string } | null;
    };
  };
  items: BookingItem[];
};

export type LockResult = {
  lockId: string;
  expiresAt: string;
};

export type OrderResult = {
  bookingId: string;
  bookingRef: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export type CouponResult = {
  valid: boolean;
  discount?: number;
  type?: "flat" | "percent" | "bogo";
  value?: number;
  message: string;
};

export type ShowAvailability = EventShow & {
  event: {
    id: string;
    title: string;
    slug: string;
    bannerUrl: string | null;
    venue: { id: string; name: string; city: string; sections: { id: string; name: string }[] } | null;
  };
};
