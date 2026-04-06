import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  startDatetime: z.string().datetime().optional(),
  endDatetime: z.string().datetime().optional(),
  language: z.string().max(50).optional(),
  ageRating: z.enum(["U", "UA", "A"]).optional(),
  bannerUrl: z.string().url().optional(),
  trailerUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  metaJson: z.record(z.unknown()).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const createShowSchema = z.object({
  showDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  showTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

export const createTicketTierSchema = z.object({
  sectionId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  totalQuantity: z.number().int().min(1),
  saleStartAt: z.string().datetime().optional(),
  saleEndAt: z.string().datetime().optional(),
  maxPerBooking: z.number().int().min(1).max(20).optional(),
});

export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.string().optional(),
  city: z.string().optional(),
  q: z.string().optional(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateShowInput = z.infer<typeof createShowSchema>;
export type CreateTicketTierInput = z.infer<typeof createTicketTierSchema>;
