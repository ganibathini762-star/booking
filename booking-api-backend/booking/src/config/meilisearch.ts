import { Meilisearch } from "meilisearch";
import { env } from "./env.js";

export const meilisearch = new Meilisearch({
  host: env.MEILISEARCH_URL || "http://localhost:7700",
  apiKey: env.MEILISEARCH_API_KEY,
});
