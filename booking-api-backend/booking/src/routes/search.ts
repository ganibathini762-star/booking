import { Hono } from "hono";
import { apiSuccess } from "../utils/response.js";
import { eventService } from "../services/event.service.js";
import { venueService } from "../services/venue.service.js";
import { meilisearch } from "../config/meilisearch.js";

const searchRouter = new Hono();

// GET /search?q= — global search (events + venues)
searchRouter.get("/", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  if (!q) return apiSuccess(c, { events: [], venues: [] });

  const [events, { rows: venues }] = await Promise.all([
    searchEvents(q, 10),
    venueService.list({ page: 1, limit: 5, q }),
  ]);

  return apiSuccess(c, { events, venues });
});

// GET /search/suggestions?q= — autocomplete
searchRouter.get("/suggestions", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  if (q.length < 2) return apiSuccess(c, []);

  const events = await searchEvents(q, 5);
  const suggestions = (events as any[]).map((e: any) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    type: "event",
    bannerUrl: e.bannerUrl,
  }));

  return apiSuccess(c, suggestions);
});

// Try Meilisearch first, fall back to DB ilike search
async function searchEvents(q: string, limit: number) {
  try {
    const result = await meilisearch.index("events").search(q, {
      limit,
      offset: 0,
      filter: "status = published",
    });
    if (result.hits.length > 0) return result.hits;
  } catch {
    // Meilisearch unavailable — fall back to DB
  }
  return eventService.search(q, limit);
}

export default searchRouter;
