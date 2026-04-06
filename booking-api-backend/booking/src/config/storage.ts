import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const STORAGE_PATHS = {
  eventBanners: "events/banners",
  eventPosters: "events/posters",
  venueImages: "venues/images",
  ticketPdfs: "tickets/pdfs",
  ticketQrCodes: "tickets/qr",
  avatars: "users/avatars",
} as const;

export async function uploadToSupabase(
  path: string,
  body: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET_NAME)
    .upload(path, body, { contentType, upsert: true });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(env.SUPABASE_BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}
