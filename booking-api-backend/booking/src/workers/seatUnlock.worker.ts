import { Worker } from "bullmq";
import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";
import { seatLocks } from "../db/schema/index.js";
import { sql } from "drizzle-orm";

import { seatUnlockQueue } from "../config/queue.js";

// This worker cleans up expired seat locks from DB periodically
// It's also a fallback if Redis key expiration events aren't subscribed
export const seatUnlockWorker = new Worker(
  "seat-unlock",
  async (job) => {
    const { showId, seatIds } = job.data;

    // Delete seat lock records from DB for expired locks
    // This is a bulk cleanup operation
    const whereClause = sql`${seatLocks.showId} = ${showId} AND ${seatLocks.expiresAt} < NOW()`;

    if (seatIds && seatIds.length > 0) {
      // Specific seats
      const result = await db
        .delete(seatLocks)
        .where(sql`${seatLocks.showId} = ${showId} AND ${seatLocks.seatId} = ANY(${seatIds}) AND ${seatLocks.expiresAt} < NOW()`)
        .execute();
      return { deleted: (result as any).rowCount || 0 };
    } else {
      // All expired locks for the show
      const result = await db
        .delete(seatLocks)
        .where(whereClause)
        .execute();
      return { deleted: (result as any).rowCount || 0 };
    }
  },
  { connection: { url: env.REDIS_URL }, concurrency: 2, autorun: false } // Don't auto-run, we'll add jobs manually
);

seatUnlockWorker.on("completed", (job) => {
  logger.info(`[seatUnlock-worker] Job ${job.id} completed`);
});

seatUnlockWorker.on("failed", (job, err) => {
  logger.error(`[seatUnlock-worker] Job ${job?.id} failed: ${err.message}`);
});

// Helper to schedule cleanup
export async function scheduleSeatUnlock(showId: string, seatIds: string[] = []) {
  // Run every 5 minutes for this show
  await seatUnlockQueue.add("cleanup", { showId, seatIds }, {
    repeat: { pattern: "*/5 * * * *" },
    jobId: `seat-unlock-${showId}`,
  });
}
