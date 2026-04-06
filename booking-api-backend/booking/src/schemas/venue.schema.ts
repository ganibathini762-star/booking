import { z } from "zod";

export const createVenueSchema = z.object({
  name: z.string().min(2).max(255),
  address: z.string().min(5),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().min(1),
  amenities: z
    .object({
      parking: z.boolean().optional(),
      food: z.boolean().optional(),
      wheelchair: z.boolean().optional(),
      wifi: z.boolean().optional(),
      atm: z.boolean().optional(),
    })
    .optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export const createSectionSchema = z.object({
  name: z.string().min(1).max(100),
  totalSeats: z.number().int().min(1),
  layoutJson: z
    .object({
      rows: z.number().int().min(1),
      cols: z.number().int().min(1),
    })
    .optional(),
});

export const venueListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  city: z.string().optional(),
  q: z.string().optional(),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
