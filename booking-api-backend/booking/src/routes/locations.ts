import { Hono } from "hono";
import { apiSuccess } from "../utils/response.js";
import { eventService } from "../services/event.service.js";

const CITIES = [
  { name: "Mumbai", slug: "mumbai" },
  { name: "Delhi", slug: "delhi" },
  { name: "Bangalore", slug: "bangalore" },
  { name: "Hyderabad", slug: "hyderabad" },
  { name: "Chennai", slug: "chennai" },
  { name: "Kolkata", slug: "kolkata" },
  { name: "Pune", slug: "pune" },
  { name: "Ahmedabad", slug: "ahmedabad" },
  { name: "Jaipur", slug: "jaipur" },
  { name: "Surat", slug: "surat" },
];

const locationsRouter = new Hono();

// GET /locations/cities
locationsRouter.get("/cities", (c) => apiSuccess(c, CITIES));

// GET /locations/detect — detect city from IP (stub; real impl uses ip-api.com)
locationsRouter.get("/detect", (c) => {
  // In production: call ip-api.com or maxmind with c.req.header("x-forwarded-for")
  return apiSuccess(c, { city: "Mumbai", slug: "mumbai" });
});

// GET /events/by-city/:city
locationsRouter.get("/events/by-city/:city", async (c) => {
  const city = c.req.param("city");
  const page = Number(c.req.query("page") ?? 1);
  const limit = Number(c.req.query("limit") ?? 20);
  const { rows, meta } = await eventService.list({ page, limit, city });
  return apiSuccess(c, rows, undefined, 200, meta);
});

export default locationsRouter;
