import { serve } from "@hono/node-server";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./middleware/logger.js";

// Start BullMQ workers (side-effect imports — workers register themselves)
import "./workers/ticket.worker.js";
import "./workers/email.worker.js";

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(`🚀 TicketFlow API running on http://localhost:${info.port}`);
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${info.port}/health`);
  }
);
