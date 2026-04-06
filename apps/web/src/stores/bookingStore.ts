import { create } from "zustand";

export type SelectedItem = {
  tierId: string;
  tierName: string;
  price: number;
  quantity: number;
  // Seated events only:
  seatId?: string;
  row?: string;
  seatNumber?: string;
};

type BookingState = {
  showId: string | null;
  eventTitle: string | null;
  showDate: string | null;
  showTime: string | null;
  selectedItems: SelectedItem[];
  lockId: string | null;
  lockExpiresAt: Date | null;
  couponCode: string | null;
  couponDiscount: number;

  setShow: (show: { showId: string; eventTitle: string; showDate: string; showTime: string }) => void;
  setItem: (tierId: string, tierName: string, price: number, quantity: number) => void;
  removeItem: (tierId: string) => void;
  setLock: (lockId: string, expiresAt: Date) => void;
  setCoupon: (code: string, discount: number) => void;
  clearCoupon: () => void;
  clearBooking: () => void;

  totalAmount: () => number;
  convenienceFee: () => number;
  taxAmount: () => number;
  finalAmount: () => number;
  itemCount: () => number;
};

export const useBookingStore = create<BookingState>()((set, get) => ({
  showId: null,
  eventTitle: null,
  showDate: null,
  showTime: null,
  selectedItems: [],
  lockId: null,
  lockExpiresAt: null,
  couponCode: null,
  couponDiscount: 0,

  setShow: ({ showId, eventTitle, showDate, showTime }) =>
    set({ showId, eventTitle, showDate, showTime, selectedItems: [], lockId: null, lockExpiresAt: null }),

  setItem: (tierId, tierName, price, quantity) =>
    set((s) => {
      if (quantity === 0) {
        return { selectedItems: s.selectedItems.filter((x) => x.tierId !== tierId) };
      }
      const existing = s.selectedItems.find((x) => x.tierId === tierId);
      if (existing) {
        return {
          selectedItems: s.selectedItems.map((x) =>
            x.tierId === tierId ? { ...x, quantity } : x
          ),
        };
      }
      return { selectedItems: [...s.selectedItems, { tierId, tierName, price, quantity }] };
    }),

  removeItem: (tierId) =>
    set((s) => ({ selectedItems: s.selectedItems.filter((x) => x.tierId !== tierId) })),

  setLock: (lockId, expiresAt) => set({ lockId, lockExpiresAt: expiresAt }),

  setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),

  clearCoupon: () => set({ couponCode: null, couponDiscount: 0 }),

  clearBooking: () =>
    set({
      showId: null,
      eventTitle: null,
      showDate: null,
      showTime: null,
      selectedItems: [],
      lockId: null,
      lockExpiresAt: null,
      couponCode: null,
      couponDiscount: 0,
    }),

  totalAmount: () =>
    get().selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),

  convenienceFee: () => Math.round(get().totalAmount() * 0.02 * 100) / 100,

  taxAmount: () => {
    const taxable = get().totalAmount() - get().couponDiscount;
    return Math.round(taxable * 0.18 * 100) / 100;
  },

  finalAmount: () => {
    const total = get().totalAmount();
    const discount = get().couponDiscount;
    const convenience = get().convenienceFee();
    const tax = get().taxAmount();
    return Math.round((total - discount + convenience + tax) * 100) / 100;
  },

  itemCount: () => get().selectedItems.reduce((sum, i) => sum + i.quantity, 0),
}));
