import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { redis, REDIS_TTL } from "../config/redis.js";
import { seatLocks, seats as seatsTable, venueSections, ticketTiers, bookings, bookingItems, events as eventsTable, eventShows } from "../db/schema/index.js";

export interface SeatInfo {
  id: string;
  sectionId: string;
  sectionName: string;
  row: string;
  seatNumber: string;
  seatType: "regular" | "premium" | "disabled" | "blocked";
  xPosition: number | null;
  yPosition: number | null;
  price: number;
  status: "available" | "locked" | "booked" | "blocked";
  lockedBy?: string; // userId if locked
  lockExpiresAt?: string;
}

export interface SeatMapLayout {
  sectionId: string;
  sectionName: string;
  totalSeats: number;
  seats: SeatInfo[];
  layoutJson: {
    rows: number;
    cols: number;
    seatMap?: unknown;
  };
}

export const seatService = {
  // ── Get complete seat map for a show with availability ─────────────────────
  async getSeatMap(showId: string): Promise<SeatMapLayout[]> {
    // Fetch show with event and venue sections
    const show = await db.query.eventShows.findFirst({
      where: eq(eventShows.id, showId),
      with: {
        event: {
          with: {
            venue: {
              with: {
                sections: true,
              },
            },
          },
        },
      },
    });

    if (!show || !show.event || !show.event.venue) {
      throw Object.assign(new Error("Show not found"), { code: "NOT_FOUND" });
    }

    const venue = show.event.venue;
    const sections = venue.sections;

    // Get all confirmed bookings for this show
    const confirmedBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.showId, showId),
        eq(bookings.status, "confirmed"),
      ),
      with: {
        items: true,
      },
    });

    // Collect all booked seat IDs
    const bookedSeatIds = new Set<string>();
    for (const booking of confirmedBookings) {
      for (const item of booking.items) {
        if (item.seatId) {
          bookedSeatIds.add(item.seatId);
        }
      }
    }

    // Build seat map for each section
    const seatMaps: SeatMapLayout[] = [];

    // Get ticket tiers by sectionId for price lookup
    const tiersBySection = new Map<string, typeof ticketTiers.$inferInsert[]>();
    const allTiers = await db.query.ticketTiers.findMany({
      where: eq(ticketTiers.showId, showId),
    });
    for (const tier of allTiers) {
      if (tier.sectionId) {
        if (!tiersBySection.has(tier.sectionId)) {
          tiersBySection.set(tier.sectionId, []);
        }
        tiersBySection.get(tier.sectionId)!.push(tier);
      }
    }

    for (const section of sections) {
      // Get all seats in this section
      const sectionSeats = await db.query.seats.findMany({
        where: eq(seatsTable.sectionId, section.id),
        orderBy: [seatsTable.row, seatsTable.seatNumber],
      });

      // Get all active seat locks for this show
      // We need to find locks that are still valid (expiresAt > NOW())
      // Only get locks for seats in this section
      const seatIds = sectionSeats.map(s => s.id);
      const activeLocks = await db.query.seatLocks.findMany({
        where: and(
          eq(seatLocks.showId, showId),
          sql`${seatLocks.seatId} = ANY(${seatIds})`,
          sql`${seatLocks.expiresAt} > NOW()`
        ),
      });

      const lockMap = new Map<string, typeof activeLocks[number]>();
      for (const lock of activeLocks) {
        lockMap.set(lock.seatId, lock);
      }

      // Determine price from tier
      const tiersForSection = tiersBySection.get(section.id) || [];
      const defaultPrice = tiersForSection.length > 0
        ? parseFloat(tiersForSection[0].price)
        : 0;

      const seatInfos: SeatInfo[] = sectionSeats.map(seat => {
        const lock = lockMap.get(seat.id);
        const isLocked = !!lock;
        const isBooked = bookedSeatIds.has(seat.id);

        let status: "available" | "locked" | "booked" | "blocked" = "available";
        if (seat.seatType === "blocked") {
          status = "blocked";
        } else if (isBooked) {
          status = "booked";
        } else if (isLocked) {
          status = "locked";
        }

        return {
          id: seat.id,
          sectionId: section.id,
          sectionName: section.name,
          row: seat.row,
          seatNumber: seat.seatNumber,
          seatType: seat.seatType as "regular" | "premium" | "disabled" | "blocked",
          xPosition: seat.xPosition ?? null,
          yPosition: seat.yPosition ?? null,
          price: defaultPrice,
          status,
          lockedBy: lock?.userId,
          lockExpiresAt: lock?.expiresAt.toISOString(),
        };
      });

      seatMaps.push({
        sectionId: section.id,
        sectionName: section.name,
        totalSeats: section.totalSeats,
        seats: seatInfos,
        layoutJson: section.layoutJson ?? { rows: 0, cols: 0 },
      });
    }

    return seatMaps;
  },

  // ── Get summary availability for all sections ─────────────────────────────
  async getAvailabilitySummary(showId: string): Promise<{
    sectionId: string;
    sectionName: string;
    available: number;
    locked: number;
    booked: number;
    total: number;
    price: number;
  }[]> {
    const seatMaps = await this.getSeatMap(showId);

    return seatMaps.map(section => {
      const available = section.seats.filter(s => s.status === "available").length;
      const locked = section.seats.filter(s => s.status === "locked").length;
      const booked = section.seats.filter(s => s.status === "booked").length;

      const firstSeat = section.seats[0];
      const price = firstSeat?.price ?? 0;

      return {
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        available,
        locked,
        booked,
        total: section.totalSeats,
        price,
      };
    });
  },

  // ── Lock seats (advisory lock in Redis, 10 min TTL) ───────────────────────
  async lockSeats(userId: string, showId: string, items: { tierId: string; quantity: number; sectionName?: string }[]): Promise<{ lockId: string; expiresAt: Date }> {
    // Verify show exists
    const show = await db.query.eventShows.findFirst({
      where: eq(eventShows.id, showId),
    });
    if (!show) {
      throw Object.assign(new Error("Show not found"), { code: "NOT_FOUND" });
    }

    // For each section, check availability
    for (const item of items) {
      // Get ticket tier
      const tier = await db.query.ticketTiers.findFirst({
        where: eq(ticketTiers.id, item.tierId),
      });

      if (!tier) {
        throw Object.assign(new Error(`No ticket tier for section ${item.sectionName}`), { code: "NOT_FOUND" });
      }

      const available = tier.availableQuantity;
      if (available < item.quantity) {
        throw Object.assign(new Error(`Not enough seats available in ${item.sectionName}. Only ${available} left.`), { code: "INSUFFICIENT_SEATS" });
      }

      if (item.quantity > tier.maxPerBooking) {
        throw Object.assign(new Error(`Max ${tier.maxPerBooking} tickets per booking for ${item.sectionName}`), { code: "MAX_EXCEEDED" });
      }
    }

    const lockId = `${userId}:${showId}:${Date.now()}`;
    const expiresAt = new Date(Date.now() + REDIS_TTL.seatLock * 1000);

    // Store lock in Redis
    await redis.set(
      `booking:lock:${lockId}`,
      JSON.stringify({ userId, showId, items, expiresAt: expiresAt.toISOString() }),
      'EX', REDIS_TTL.seatLock
    );

    return { lockId, expiresAt };
  },

  // ── Unlock seats (user-initiated before timeout) ─────────────────────────
  async unlockSeats(userId: string, lockId: string): Promise<boolean> {
    const key = `booking:lock:${lockId}`;
    const lockRaw = await redis.get(key);

    if (!lockRaw) return false;

    const lock = JSON.parse(lockRaw);
    if (lock.userId !== userId) {
      throw Object.assign(new Error("Unauthorized"), { code: "FORBIDDEN" });
    }

    await redis.del(key);
    return true;
  },

  // ── Force unlock seats (admin/expiry) ────────────────────────────────────
  async forceUnlockSeats(showId: string, seatIds?: string[]): Promise<number> {
    // Find all locks for this show (or specific seats) that have expired or are past TTL
    // This is typically run as a periodic cleanup job
    const pattern = `booking:lock:*`;
    const keys = await redis.scan('0', 'MATCH', pattern, 'COUNT', '100');
    const allKeys = keys[1];

    let deletedCount = 0;
    for (const key of allKeys) {
      const lockRaw = await redis.get(key);
      if (lockRaw) {
        const lock = JSON.parse(lockRaw);
        if (lock.showId === showId) {
          if (seatIds) {
            // Check if any of the items match the seatIds
            // But we don't have seatIds in lock data directly - we'd need to check booking item associations
            // For now, just delete all locks for this show if seatIds not specific
          }
          await redis.del(key);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  },

  // ── Get currently locked seats for a show ────────────────────────────────
  async getLockedSeats(showId: string): Promise<{ seatId: string; userId: string; expiresAt: Date }[]> {
    const pattern = `booking:lock:*`;
    const keysResult = await redis.scan('0', 'MATCH', pattern, 'COUNT', '100');
    const keys = keysResult[1];

    const locks: { seatId: string; userId: string; expiresAt: Date }[] = [];

    // This is inefficient - better to maintain a Redis set of locks per show
    // For now, scan all locks
    for (const key of keys) {
      if (!key.includes(showId)) continue;

      const lockRaw = await redis.get(key);
      if (lockRaw) {
        const lock = JSON.parse(lockRaw);
        // locks.push({ userId: lock.userId, expiresAt: new Date(lock.expiresAt) });
        // But we don't have individual seatIds in the lock - lock is at tier level
      }
    }

    return locks;
  }
};
