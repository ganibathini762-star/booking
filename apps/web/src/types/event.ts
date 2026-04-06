export type Category = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  isActive: boolean;
};

export type Venue = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  images: string[];
  isApproved: boolean;
};

export type VenueSection = {
  id: string;
  venueId: string;
  name: string;
  totalSeats: number;
};

export type Event = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "cancelled" | "completed";
  bannerUrl: string | null;
  trailerUrl: string | null;
  language: string | null;
  ageRating: string | null;
  tags: string[];
  isFeatured: boolean;
  startDatetime: string | null;
  endDatetime: string | null;
  category: Category | null;
  venue: Venue | null;
  createdAt: string;
};

export type EventShow = {
  id: string;
  eventId: string;
  showDate: string;
  showTime: string;
  status: "active" | "cancelled" | "housefull" | "soldout";
  ticketTiers: TicketTier[];
};

export type TicketTier = {
  id: string;
  showId: string;
  name: string;
  price: string;
  totalQuantity: number;
  availableQuantity: number;
  maxPerBooking: number;
  saleStartAt: string | null;
  saleEndAt: string | null;
};

export type Review = {
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  content: string | null;
  isVerified: boolean;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
};

export type EventDetail = Event & {
  shows: EventShow[];
  reviews: Review[];
  venue: (Venue & { sections: VenueSection[] }) | null;
};

export type SearchSuggestion = {
  id: string;
  title: string;
  slug: string;
  type: "event" | "venue";
  bannerUrl: string | null;
};
