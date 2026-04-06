import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";
import type { EmailJobData } from "../config/queue.js";

const redisConnection = { url: env.REDIS_URL };

// Resend SMTP transport (https://resend.com/docs/send-with-smtp)
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: env.RESEND_API_KEY,
  },
});

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job) => {
    const { to, subject, html, text } = job.data;

    await transporter.sendMail({
      from: "TicketFlow <noreply@ticketflow.app>",
      to,
      subject,
      html,
      text,
    });

    logger.info(`[email-worker] Sent to ${to}: "${subject}"`);
  },
  { connection: redisConnection, concurrency: 10 }
);

emailWorker.on("completed", (job) => {
  logger.info(`[email-worker] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`[email-worker] Job ${job?.id} failed: ${err.message}`);
});
