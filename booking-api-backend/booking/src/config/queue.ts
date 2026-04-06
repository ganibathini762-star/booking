import { Queue } from "bullmq";
import { env } from "./env.js";

// Parse Redis URL for ioredis connection
const redisConnection = {
  url: env.REDIS_URL,
};

export const emailQueue = new Queue("email", { connection: redisConnection });
export const ticketQueue = new Queue("ticket", { connection: redisConnection });
export const notificationQueue = new Queue("notification", { connection: redisConnection });
export const seatUnlockQueue = new Queue("seatUnlock", { connection: redisConnection });

export const QUEUE_NAMES = {
  email: "email",
  ticket: "ticket",
  notification: "notification",
  seatUnlock: "seatUnlock",
} as const;

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type TicketJobData = {
  bookingId: string;
  userId: string;
};

export type SeatUnlockJobData = {
  showId: string;
  seatId: string;
  userId: string;
};
